'use server';

import { GoogleGenAI, Type } from "@google/genai";
import { randomUUID } from "crypto";
import { config } from "dotenv";
import { resolve } from "path";
import { KeywordAnalysis, ResumeSchema, CoverLetterOptions } from "@/types";
import { requireProSubscription } from "@/lib/subscription";

// Explicitly load only .env file (not .env.local)
// This ensures we use .env values even if .env.local exists
config({ path: resolve(process.cwd(), '.env') });

// Get API key from .env only
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize the client on the server
// API key is secure - never exposed to the browser
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set in .env file");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const fetchJobDescriptionFromUrl = async (url: string): Promise<{ text: string; source?: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert recruitment assistant. 
      
      TARGET URL: ${url}
      
      GOAL: Extract the Job Description text.
      
      INSTRUCTIONS:
      1.  First, deduce the Company and Job Title from the URL string itself (e.g. "greenhouse.io/stripe/jobs/123" -> Stripe, Job 123).
      2.  Use Google Search to find the job listing text. Search for the specific URL, but ALSO search for "Job description [Company] [Title]" or "Careers at [Company] [Title]".
      3.  Compile the best available Job Description text you can find (Requirements, Responsibilities, Skills).
      4.  Output the text directly. Do not include conversational filler like "Here is the job description".
      5.  Only return "FETCH_FAILED" if you cannot find ANY relevant job details after trying multiple search strategies.
      `,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    const text = response.text;
    
    if (!text || 
        text.includes("FETCH_FAILED") || 
        text.length < 100 
       ) {
        console.warn("Model response indicated failure:", text);
        throw new Error("Model unable to scrape content");
    }

    const source = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.web?.uri;

    return { text, source };
  } catch (error) {
    console.error("Error fetching job description:", error);
    throw new Error("Failed to automatically retrieve job description. Please paste it manually.");
  }
};

export const parseResumeToJSON = async (text: string): Promise<ResumeSchema> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      basics: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          location: { type: Type.STRING },
          profiles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                network: { type: Type.STRING, description: "Label for the link, e.g. LinkedIn, Portfolio" },
                url: { type: Type.STRING },
                username: { type: Type.STRING },
                displayUrl: { type: Type.BOOLEAN }
              }
            }
          }
        },
      },
      skills: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
      experience: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            company: { type: Type.STRING },
            position: { type: Type.STRING },
            startDate: { type: Type.STRING },
            endDate: { type: Type.STRING },
            location: { type: Type.STRING },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
      education: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            institution: { type: Type.STRING },
            area: { type: Type.STRING },
            studyType: { type: Type.STRING },
            date: { type: Type.STRING },
            location: { type: Type.STRING },
            score: { type: Type.STRING },
            courses: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
      projects: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
            link: { type: Type.STRING },
            date: { type: Type.STRING },
          },
        },
      },
      certifications: {
        type: Type.ARRAY,
        items: {
           type: Type.OBJECT,
           properties: {
             name: { type: Type.STRING },
             issuer: { type: Type.STRING },
             date: { type: Type.STRING },
           }
        }
      }
    },
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Parse the following resume text into a structured JSON format. 
    Ensure to capture all details accurately. If a field is missing, leave it empty or omit it.
    Structure it for a clean, ATS-friendly resume.
    
    RESUME TEXT:
    ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const rawData = JSON.parse(response.text || "{}");
  
  const data: ResumeSchema = {
    meta: {
      sectionOrder: ['experience', 'education', 'projects', 'skills', 'certifications'],
      visible: {
        education: true,
        experience: true,
        skills: true,
        projects: true,
        certifications: true,
        phone: true,
        location: true,
      }
    },
    basics: { 
      name: rawData.basics?.name || "", 
      email: rawData.basics?.email || "", 
      phone: rawData.basics?.phone || "", 
      location: rawData.basics?.location || "", 
      profiles: rawData.basics?.profiles || [] 
    },
    skills: rawData.skills || [],
    experience: rawData.experience?.map((e: any) => ({ ...e, id: randomUUID(), visible: true })) || [],
    education: rawData.education?.map((e: any) => ({ ...e, id: randomUUID(), visible: true })) || [],
    projects: rawData.projects?.map((e: any) => ({ ...e, id: randomUUID(), visible: true })) || [],
    certifications: rawData.certifications?.map((e: any) => ({ ...e, id: randomUUID(), visible: true })) || [],
  };

  return data;
};

export const extractKeywordsFromJD = async (jobDesc: string): Promise<string[]> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  };

  const prompt = `Analyze the following JOB DESCRIPTION and extract the top 25 most critical Hard Skills, Tools, Technologies, and Domain Specific terms. 
  Ignore soft skills unless absolutely critical to the role.
  Return them as a simple list of strings.
  
  JOB DESCRIPTION: ${jobDesc.slice(0, 4000)}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const result = JSON.parse(response.text || "{}");
  return result.keywords || [];
};

export const evaluateResumeAgainstKeywords = async (resume: ResumeSchema, keywords: string[]): Promise<KeywordAnalysis> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.NUMBER, description: "0-100 match score" },
      matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      reasoning: { type: Type.STRING },
    },
    required: ["score", "matchedKeywords", "missingKeywords", "reasoning"]
  };

  const prompt = `You are an ATS Optimization Engine.
  
  TASK:
  Check the RESUME against the provided REQUIRED KEYWORDS.
  
  REQUIRED KEYWORDS: ${JSON.stringify(keywords)}
  
  RESUME JSON: ${JSON.stringify(resume)}
  
  INSTRUCTIONS:
  1. For each required keyword, check if it (or a direct synonym/variation) appears in the resume.
  2. Calculate a Match Score (0-100) strictly based on keyword coverage.
  3. Return the list of Matched and Missing keywords.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return JSON.parse(response.text || "{}") as KeywordAnalysis;
};

export const analyzeResumeAgainstJob = async (resume: ResumeSchema, jobDesc: string): Promise<KeywordAnalysis> => {
  const keywords = await extractKeywordsFromJD(jobDesc);
  return evaluateResumeAgainstKeywords(resume, keywords);
};

export const suggestBulletPoint = async (
  bullet: string, 
  context: string, 
  jobDesc: string,
  keywordsToInclude: string[] = [],
  customInstruction: string = ""
): Promise<string> => {
  
  const keywordInstruction = keywordsToInclude.length > 0 
    ? `IMPORTANT: You MUST naturally include these exact keywords in the response: ${keywordsToInclude.join(', ')}.`
    : `Ensure the tone is professional and impact-driven.`;

  const userInstruction = customInstruction ? `Additional User Instruction: "${customInstruction}".` : "";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Rewrite this resume bullet point.
    
    Context: ${context}
    Job Description Snippet: ${jobDesc.slice(0, 1000)}...
    
    Current Text: "${bullet}"
    
    Instructions:
    1. ${keywordInstruction}
    2. ${userInstruction}
    3. Use active voice and quantify results if possible.
    4. Keep it concise (1-3 lines).
    5. DO NOT use markdown formatting like bold (**text**) or italics. Return plain text only.
    6. Return ONLY the rewritten text.`,
  });

  let cleanText = response.text?.trim() || bullet;
  cleanText = cleanText.replace(/\*\*/g, '').replace(/\*/g, '');
  
  return cleanText;
};

export const rewriteWholeSection = async (
  bullets: string[],
  context: string,
  jobDesc: string,
  missingKeywords: string[]
): Promise<string[]> => {
  // Require pro subscription for section rewriting
  await requireProSubscription();
  
  const schema = {
    type: Type.OBJECT,
    properties: {
      rewrittenBullets: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Rewrite the following resume bullet points to be more impactful and ATS-friendly.
    
    Context (Role/Company): ${context}
    Job Description: ${jobDesc.slice(0, 1500)}...
    
    Current Bullets:
    ${JSON.stringify(bullets)}
    
    Missing Keywords to try and incorporate naturally if relevant: ${missingKeywords.slice(0, 10).join(', ')}
    
    Instructions:
    1. Improve clarity, impact, and metrics.
    2. Maintain the same number of bullet points.
    3. Do not use markdown bolding (**).
    4. Return JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  const result = JSON.parse(response.text || "{}");
  let finalBullets = result.rewrittenBullets || bullets;
  finalBullets = finalBullets.map((b: string) => b.replace(/\*\*/g, '').replace(/\*/g, ''));
  
  return finalBullets;
};

export const optimizeSkillsSection = async (
  currentSkills: { category: string; keywords: string[] }[],
  keywordsToAdd: string[]
): Promise<{ category: string; keywords: string[] }[]> => {
  // Require pro subscription for skills optimization
  await requireProSubscription();
  
  if (keywordsToAdd.length === 0) return currentSkills;

  const schema = {
    type: Type.OBJECT,
    properties: {
      optimizedSkills: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    }
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `I need to add specific missing keywords to a resume's skills section.
    
    Current Skills: ${JSON.stringify(currentSkills)}
    
    Keywords to Add: ${JSON.stringify(keywordsToAdd)}
    
    Instructions:
    1. Place the "Keywords to Add" into the most appropriate existing categories.
    2. If a keyword doesn't fit any existing category, create a new relevant category (e.g., "Tools", "Cloud", "Languages").
    3. Do not remove existing skills.
    4. Return the full updated skills list.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  const result = JSON.parse(response.text || "{}");
  return result.optimizedSkills || currentSkills;
};

export const generateSummarySection = async (
  jobDesc: string,
  keywordsToInclude: string[]
): Promise<string> => {
  // Require pro subscription for summary generation
  await requireProSubscription();
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Write a professional resume summary (Professional Summary) for a candidate applying to this job.
    
    Job Description: ${jobDesc.slice(0, 2000)}
    
    Keywords to Include: ${keywordsToInclude.join(', ')}
    
    Instructions:
    1. 3-4 sentences long.
    2. Professional, confident tone.
    3. Highlight relevant experience inferred from the job description requirements.
    4. Plain text only (no markdown).`,
  });
  
  return response.text?.trim() || "";
};

export const generateInterviewQuestions = async (
  jobDesc: string,
  resumeContext: string
): Promise<Array<{ question: string; type: string; tip: string }>> => {
  // Require pro subscription for interview prep
  await requireProSubscription();
  
  const schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            type: { type: Type.STRING, description: "e.g. Behavioral, Technical, Situational" },
            tip: { type: Type.STRING, description: "Key points to mention in the answer" }
          }
        }
      }
    }
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Generate 5 highly relevant interview questions for this candidate applying to this specific role.
    
    Job Description Snippet: ${jobDesc.slice(0, 2000)}...
    
    Resume Context Snippet: ${resumeContext.slice(0, 2000)}...
    
    Instructions:
    1. Mix of Technical and Behavioral questions.
    2. Make them specific to the technologies or skills mentioned in the Job Description and Resume (e.g. "Tell me about your experience with React").
    3. For each question, provide a short "Tip" on what the interviewer is looking for.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  const result = JSON.parse(response.text || "{}");
  return result.questions || [];
};

export const generateCoverLetter = async (
  resumeData: ResumeSchema,
  jobDesc: string,
  options: CoverLetterOptions
): Promise<string> => {
  // Require pro subscription for cover letter generation
  await requireProSubscription();
  
  const context = `
    Candidate Name: ${resumeData.basics.name}
    Current Title: ${resumeData.experience[0]?.position || "Professional"} at ${resumeData.experience[0]?.company || ""}
    Top Skills: ${resumeData.skills.map(s => s.keywords.join(', ')).join(', ').slice(0, 300)}
    Key Achievements: ${resumeData.experience.slice(0, 2).map(e => e.highlights[0]).join('. ')}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Write a professional Cover Letter for this candidate.
    
    Candidate Context: ${context}
    
    Job Description: ${jobDesc.slice(0, 2500)}...
    
    Instructions:
    1. Tone: ${options.tone}
    2. ${options.includeRelocation ? "Mention willingness to relocate." : "Do NOT mention relocation."}
    3. Structure: Standard business letter format.
    4. Do not use placeholders like [Manager's Name] unless necessary, try to use "Hiring Manager" or "Recruitment Team".
    5. Keep it under 350 words.
    6. Focus on how the candidate's specific experience solves the company's problems described in the JD.
    7. Return plain text with line breaks.
    `,
  });

  return response.text || "";
};

