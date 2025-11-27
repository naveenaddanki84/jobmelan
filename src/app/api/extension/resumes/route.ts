import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

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
        const resumes = await prisma.resume.findMany({
            where: { userId },
            select: {
                id: true,
                title: true,
                isDefault: true,
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json({ resumes }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Extension Get Resumes Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
