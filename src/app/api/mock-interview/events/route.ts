import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { requireProSubscription } from '@/lib/subscription';

type IncomingEvent = {
  stage: string;
  role: 'user' | 'ai' | 'system';
  text?: string;
  isFinal?: boolean;
  ts?: string;
};

export async function POST(req: Request) {
  try {
    await requireProSubscription();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { sessionId, events } = body ?? {};

    if (!sessionId || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'sessionId and events[] required' },
        { status: 400 },
      );
    }

    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const sanitized: IncomingEvent[] = events
      .map((e: IncomingEvent) => ({
        stage: String(e.stage || 'unknown'),
        role:
          e.role === 'user' || e.role === 'ai' || e.role === 'system'
            ? e.role
            : 'system',
        text: typeof e.text === 'string' ? e.text.slice(0, 4000) : undefined,
        isFinal: Boolean(e.isFinal),
        ts: e.ts,
      }))
      .slice(0, 50); // protect against oversized batches

    await prisma.interviewEvent.createMany({
      data: sanitized.map((e) => ({
        sessionId,
        stage: e.stage,
        role: e.role,
        text: e.text ?? null,
        isFinal: e.isFinal ?? false,
        ts: e.ts ? new Date(e.ts) : new Date(),
      })),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = error?.message || 'Internal Server Error';
    const status =
      message === 'PRO_SUBSCRIPTION_REQUIRED' ? 402 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

