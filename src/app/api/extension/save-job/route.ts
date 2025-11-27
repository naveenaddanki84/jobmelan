import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ensureUser } from '@/lib/ensure-user';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}


export async function POST(req: Request) {
    console.log("Extension: Received save-job request");
    const { userId } = await auth();
    console.log("Extension: Auth check result:", userId);

    if (!userId) {
        console.log("Extension: Unauthorized request");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    await ensureUser();

    try {
        const {
            company,
            position,
            jobDescription,
            url,
            source,
            status = 'applied',
            tailoredResumeId,
            coverLetter
        } = await req.json();

        if (!company || !position) {
            return NextResponse.json({ error: 'Company and Position are required' }, { status: 400, headers: corsHeaders });
        }

        const job = await prisma.jobApplication.create({
            data: {
                userId,
                company,
                position,
                status,
                url,
                source,
                jobDescription,
                tailoredResumeId,
                coverLetter
            }
        });

        revalidatePath('/dashboard');
        return NextResponse.json({ success: true, jobId: job.id }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Extension Save Job Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
