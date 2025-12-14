import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AccessToken, RoomServiceClient, AgentDispatchClient } from 'livekit-server-sdk';
import { prisma } from '@/lib/prisma';
import { requireProSubscription } from '@/lib/subscription';
import { getProfileData } from '@/actions/profile-actions';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// Convert wss:// to https:// for API calls
function getHttpUrl(wsUrl: string): string {
  return wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
}

export async function POST(req: Request) {
  try {
    await requireProSubscription();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return NextResponse.json(
        { error: 'LiveKit env vars missing' },
        { status: 500 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { jobApplicationId, resumeId, jobDescription: pastedJobDescription } = body ?? {};

    // Fetch user profile data for personalized interview
    const profileData = await getProfileData();
    const profileContent = profileData?.resume?.content || null;
    
    // Get job description: prefer pasted JD, then from saved job application
    let jobDescription: string | null = null;
    if (pastedJobDescription && pastedJobDescription.trim()) {
      jobDescription = pastedJobDescription.trim();
    } else if (jobApplicationId) {
      const jobApp = await prisma.jobApplication.findFirst({
        where: { id: jobApplicationId, userId },
        select: { jobDescription: true },
      });
      jobDescription = jobApp?.jobDescription || null;
    }

    const roomName = `mi_${userId}_${crypto.randomUUID()
      .replace(/-/g, '')
      .slice(0, 12)}`;

    const session = await prisma.interviewSession.create({
      data: {
        userId,
        roomName,
        stage: 'selfIntro',
        jobApplicationId: jobApplicationId ?? null,
        resumeId: resumeId ?? null,
      },
    });

    const httpUrl = getHttpUrl(LIVEKIT_URL);

    // Create the room first
    const roomService = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 60 * 10, // 10 minutes
      metadata: JSON.stringify({ sessionId: session.id }),
    });

    // Prepare metadata with profile and job description for agent
    const agentMetadata = {
      sessionId: session.id,
      profile: profileContent ? {
        name: profileContent.basics?.name,
        experience: profileContent.experience || [],
        projects: profileContent.projects || [],
        skills: profileContent.skills || [],
        summary: profileContent.basics?.summary,
      } : null,
      jobDescription: jobDescription,
    };

    // Explicitly dispatch the agent to the room
    const agentDispatch = new AgentDispatchClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    await agentDispatch.createDispatch(roomName, 'mock-interviewer', {
      metadata: JSON.stringify(agentMetadata),
    });

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: userId,
      metadata: JSON.stringify({ sessionId: session.id }),
      ttl: 60 * 60,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      sessionId: session.id,
      roomName,
      stage: session.stage,
      token,
      url: LIVEKIT_URL,
      identity: userId,
    });
  } catch (error: any) {
    console.error('Mock interview session error:', error);
    const message = error?.message || 'Internal Server Error';
    const status =
      message === 'PRO_SUBSCRIPTION_REQUIRED' ? 402 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

