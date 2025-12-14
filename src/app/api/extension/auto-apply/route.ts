import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUser } from '@/lib/ensure-user';
import { analyzeResumeAgainstJob, generateSummarySection, optimizeSkillsSection } from '@/actions/ai-actions';
import { saveResume } from '@/actions/resume-actions';
import { generateCoverLetter } from '@/actions/ai-actions';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    console.log("Extension: Received auto-apply request");
    const { userId } = await auth();
    
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    await ensureUser();

    try {
        const { 
            jobUrl, 
            jobDescription, 
            resumeId, 
            platform = 'Lever',
            autoSubmit = false // Whether to actually submit the form
        } = await req.json();

        if (!jobUrl || !resumeId) {
            return NextResponse.json({ 
                error: 'Job URL and Resume ID are required' 
            }, { status: 400, headers: corsHeaders });
        }

        // 1. Fetch the resume and user profile
        const baseResume = await prisma.resume.findUnique({
            where: { id: resumeId, userId },
        });

        if (!baseResume) {
            return NextResponse.json({ error: 'Resume not found' }, { status: 404, headers: corsHeaders });
        }

        const resumeContent = baseResume.content as any;

        // Fetch user profile data (for diversity fields, preferences, etc.)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                equalEmployment: true,
                profileContent: true
            }
        });

        const userProfile = user?.profileContent as any;
        const equalEmployment = user?.equalEmployment as any;
        
        // Ensure location is populated - fallback to profileContent if missing from resume
        if (!resumeContent.basics?.location && userProfile?.basics?.location) {
            resumeContent.basics = resumeContent.basics || {};
            resumeContent.basics.location = userProfile.basics.location;
        }
        
        // Map equalEmployment to Lever's diversity format
        const diversityData: any = {};
        if (equalEmployment) {
          // Gender mapping
          if (equalEmployment.gender && equalEmployment.gender !== 'Decline to state') {
            diversityData.gender = equalEmployment.gender; // Male, Female, etc.
          }
          
          // Ethnicity/Race mapping
          if (equalEmployment.race && equalEmployment.race !== 'Decline to state') {
            diversityData.ethnicity = equalEmployment.race;
          } else {
            diversityData.ethnicity = 'Prefer not to say';
          }
          
          // Age bracket - would need to calculate from profile or store separately
          // For now, we'll leave it null and let the form handle it
        } else {
          // Default values if no diversity data
          diversityData.ethnicity = 'Prefer not to say';
        }
        
        // Default preferences
        diversityData.whereDidYouHear = 'LinkedIn'; // Can be customized later

        // 2. Tailor resume if job description provided
        let tailoredResumeContent = resumeContent;
        let tailoredResumeId = resumeId;
        
        if (jobDescription && jobDescription.length > 100) {
            try {
                // Analyze resume against job
                const analysis = await analyzeResumeAgainstJob(resumeContent, jobDescription);
                
                // Optimize skills
                const optimizedSkills = await optimizeSkillsSection(
                    resumeContent.skills, 
                    analysis.missingKeywords
                );
                
                // Generate tailored summary
                const newSummary = await generateSummarySection(
                    jobDescription, 
                    analysis.missingKeywords.slice(0, 5)
                );
                
                // Create tailored resume (preserve location from original or profileContent)
                const tailoredBasics = {
                    ...resumeContent.basics,
                    summary: newSummary
                };
                // Ensure location is preserved
                if (!tailoredBasics.location && userProfile?.basics?.location) {
                    tailoredBasics.location = userProfile.basics.location;
                }
                
                tailoredResumeContent = {
                    ...resumeContent,
                    skills: optimizedSkills,
                    basics: tailoredBasics
                };
                
                // Save tailored resume
                const tailoredTitle = `Tailored for ${jobDescription.substring(0, 30)}...`;
                const savedTailoredResume = await saveResume(
                    tailoredResumeContent, 
                    tailoredTitle, 
                    "Auto-Apply"
                );
                tailoredResumeId = savedTailoredResume.id;
            } catch (error) {
                console.error('Error tailoring resume:', error);
                // Continue with base resume if tailoring fails
            }
        }

        // 3. Generate cover letter
        let coverLetter = '';
        if (jobDescription && jobDescription.length > 100) {
            try {
                coverLetter = await generateCoverLetter(
                    tailoredResumeContent,
                    jobDescription,
                    { tone: 'professional', includeRelocation: false }
                );
            } catch (error) {
                console.error('Error generating cover letter:', error);
                // Continue without cover letter if generation fails
            }
        }

        // 4. Determine current company (most recent experience if still active)
        let currentCompany = '';
        if (tailoredResumeContent.experience && tailoredResumeContent.experience.length > 0) {
            const mostRecentExp = tailoredResumeContent.experience[0];
            // Check if it's current (no endDate or endDate indicates present)
            const isCurrent = !mostRecentExp.endDate || 
                             mostRecentExp.endDate.toLowerCase().includes('present') ||
                             mostRecentExp.endDate.toLowerCase().includes('current') ||
                             mostRecentExp.endDate === '';
            if (isCurrent) {
                currentCompany = mostRecentExp.company || '';
            }
        }

        // 5. Prepare resume data for form filling
        // Ensure location is present (fallback to profileContent if still missing)
        const basicsWithLocation = {
            ...tailoredResumeContent.basics,
            location: tailoredResumeContent.basics?.location || userProfile?.basics?.location || ''
        };
        
        const formData = {
            basics: basicsWithLocation,
            experience: tailoredResumeContent.experience || [],
            education: tailoredResumeContent.education || [],
            skills: tailoredResumeContent.skills || [],
            currentCompany: currentCompany,
            coverLetter: coverLetter,
            // User preferences and diversity data
            preferences: {
                noticePeriod: '1 month', // Default, can be customized later
                salaryRange: 'Negotiable based on experience and industry standards',
                howDidYouHear: 'Job board', // Default, can be customized
            },
            diversity: diversityData
        };

        // 5. Save job application to tracker
        let jobApplication;
        try {
            // Extract company and position from job description or URL
            const companyMatch = jobUrl.match(/jobs\.lever\.co\/([^\/]+)/);
            const company = companyMatch 
                ? companyMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : 'Unknown Company';
            
            const position = tailoredResumeContent.basics?.summary 
                ? tailoredResumeContent.basics.summary.substring(0, 50)
                : 'Position';

            jobApplication = await prisma.jobApplication.create({
                data: {
                    userId,
                    company,
                    position,
                    status: autoSubmit ? 'applied' : 'wishlist',
                    url: jobUrl,
                    source: platform,
                    jobDescription: jobDescription || '',
                    tailoredResumeId: tailoredResumeId,
                    coverLetter: coverLetter || undefined
                }
            });
        } catch (error) {
            console.error('Error saving job application:', error);
            // Continue even if save fails
        }

        // 6. Return data for Chrome extension to use
        return NextResponse.json({
            success: true,
            formData,
            tailoredResumeId,
            coverLetter,
            jobApplicationId: jobApplication?.id,
            platform,
            instructions: {
                // Instructions for the extension on how to fill the form
                steps: [
                    'Fill basic information (name, email, phone, location)',
                    'Fill LinkedIn URL if available',
                    'Upload resume file (needs to be done client-side)',
                    'Fill cover letter if provided',
                    'Fill work authorization questions',
                    'Fill experience and education if fields exist',
                    'Submit form if autoSubmit is true'
                ]
            }
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Extension Auto-Apply Error:', error);
        return NextResponse.json({ 
            error: error.message || 'Internal Server Error' 
        }, { status: 500, headers: corsHeaders });
    }
}

