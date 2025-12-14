import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getResumeById } from '@/actions/resume-actions';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    try {
        const { searchParams } = new URL(req.url);
        const resumeId = searchParams.get('resumeId');

        if (!resumeId) {
            return NextResponse.json({ error: 'Resume ID is required' }, { status: 400, headers: corsHeaders });
        }

        // Get resume data
        const resume = await getResumeById(resumeId);
        const resumeContent = resume.content as any;

        // Return resume data that can be used to generate PDF client-side
        // The client will need to generate the PDF using html2pdf or similar
        return NextResponse.json({
            success: true,
            resumeData: resumeContent,
            resumeId: resume.id,
            title: resume.title
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Extension Get Resume PDF Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
