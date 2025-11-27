import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { analyzeResumeAgainstJob, rewriteWholeSection, optimizeSkillsSection, generateSummarySection } from '@/actions/ai-actions';
import { saveResume } from '@/actions/resume-actions';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // In production, replace with extension ID
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}


export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    try {
        const { jobDescription, resumeId } = await req.json();

        if (!jobDescription || !resumeId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
        }

        // 1. Fetch the base resume
        const baseResume = await prisma.resume.findUnique({
            where: { id: resumeId, userId },
        });

        if (!baseResume) {
            return NextResponse.json({ error: 'Resume not found' }, { status: 404, headers: corsHeaders });
        }

        const resumeContent = baseResume.content as any;

        // 2. Analyze against Job Description
        const analysis = await analyzeResumeAgainstJob(resumeContent, jobDescription);

        // 3. Optimize Resume (Simplified flow for extension - auto-optimize)
        // In a real app, we might want more granular control, but for "one-click" extension:

        // Optimize Skills
        const optimizedSkills = await optimizeSkillsSection(resumeContent.skills, analysis.missingKeywords);

        // Generate new Summary
        const newSummary = await generateSummarySection(jobDescription, analysis.missingKeywords.slice(0, 5));

        // Create new resume object
        const tailoredResumeContent = {
            ...resumeContent,
            skills: optimizedSkills,
            basics: {
                ...resumeContent.basics,
                summary: newSummary
            }
        };

        // 4. Save as new "Tailored" resume
        const newTitle = `Tailored for ${jobDescription.slice(0, 20)}...`;
        const savedResume = await saveResume(tailoredResumeContent, newTitle, "Extension");

        return NextResponse.json({
            success: true,
            resumeId: savedResume.id,
            analysis
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Extension Tailor Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
