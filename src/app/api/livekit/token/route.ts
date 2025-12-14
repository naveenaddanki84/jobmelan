import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AccessToken } from 'livekit-server-sdk';
import { requireProSubscription } from '@/lib/subscription';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

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
    const roomName: string =
      body?.roomName ||
      `mi_${userId}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const participantIdentity = userId;
    const metadata = body?.metadata ?? {};

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantIdentity,
      metadata: JSON.stringify(metadata),
      ttl: 60 * 60, // 1 hour
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
      token,
      url: LIVEKIT_URL,
      roomName,
      identity: participantIdentity,
    });
  } catch (error: any) {
    const message = error?.message || 'Internal Server Error';
    const status =
      message === 'PRO_SUBSCRIPTION_REQUIRED' ? 402 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

