import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
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
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    try {
        const { jobDescription, resumeId } = await req.json();

        if (!jobDescription || !resumeId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
        }

        // Fetch resume
        const resume = await prisma.resume.findUnique({
            where: { id: resumeId, userId },
        });

        if (!resume) {
            return NextResponse.json({ error: 'Resume not found' }, { status: 404, headers: corsHeaders });
        }

        // Generate Cover Letter
        const coverLetter = await generateCoverLetter(
            resume.content as any,
            jobDescription,
            { tone: 'professional', includeRelocation: false } // Default options
        );

        return NextResponse.json({ success: true, coverLetter }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Extension Cover Letter Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
