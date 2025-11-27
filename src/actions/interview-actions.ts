'use server';

import { GoogleGenAI, Type } from "@google/genai";
import { config } from "dotenv";
import { resolve } from "path";
import { requireProSubscription } from "@/lib/subscription";

// Explicitly load only .env file
config({ path: resolve(process.cwd(), '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set in .env file");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export interface InterviewFeedback {
    rating: number;
    feedback: string;
    betterAnswer: string;
}

export interface InterviewResponse {
    message: string;
    questionId?: string;
    feedback?: InterviewFeedback;
}

export const startMockInterview = async (
    jobDesc: string,
    resumeContext: string
): Promise<InterviewResponse> => {
    await requireProSubscription();

    const prompt = `You are an expert Technical Recruiter conducting a mock interview.
  
  JOB DESCRIPTION:
  ${jobDesc.slice(0, 2000)}
  
  CANDIDATE CONTEXT:
  ${resumeContext.slice(0, 2000)}
  
  INSTRUCTIONS:
  1. Start by greeting the candidate professionally.
  2. Ask the FIRST interview question. It should be a "Tell me about yourself" or a broad behavioral question relevant to the role.
  3. Keep the greeting short and the question clear.
  4. Return ONLY the text of the greeting and question.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    return {
        message: response.text || "Hello! Let's start the interview. Tell me about yourself and why you're interested in this role.",
    };
};

export const processInterviewAnswer = async (
    currentQuestion: string,
    userAnswer: string,
    jobDesc: string,
    resumeContext: string,
    messageHistory: { role: 'user' | 'model', content: string }[] = []
): Promise<InterviewResponse> => {
    await requireProSubscription();

    // Define schema for structured output
    const schema = {
        type: Type.OBJECT,
        properties: {
            feedback: {
                type: Type.OBJECT,
                properties: {
                    rating: { type: Type.NUMBER, description: "Score 1-10" },
                    feedback: { type: Type.STRING, description: "Constructive critique of the answer" },
                    betterAnswer: { type: Type.STRING, description: "Example of a stronger answer" }
                },
                required: ["rating", "feedback", "betterAnswer"]
            },
            nextQuestion: { type: Type.STRING, description: "The next interview question to ask" }
        },
        required: ["feedback", "nextQuestion"]
    };

    const prompt = `You are an expert Technical Recruiter conducting a mock interview.
  
  JOB DESCRIPTION:
  ${jobDesc.slice(0, 1000)}
  
  CURRENT QUESTION: "${currentQuestion}"
  
  CANDIDATE ANSWER: "${userAnswer}"
  
  INSTRUCTIONS:
  1. Analyze the candidate's answer.
  2. Provide constructive feedback (Rating 1-10, what was good, what was missing).
  3. Suggest a "Better Answer" that uses the STAR method if applicable.
  4. Generate the NEXT question. It should follow up on their answer or move to a new relevant topic (Technical or Behavioral).
  5. Keep the tone professional and encouraging.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        },
    });

    const result = JSON.parse(response.text || "{}");

    return {
        message: result.nextQuestion || "Thank you. Let's move on. What are your salary expectations?",
        feedback: result.feedback
    };
};
