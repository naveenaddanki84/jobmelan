import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

const PRO_PLAN_ID = process.env.CLERK_PRO_PLAN_ID || "cplan_35lmOqzm4DkZ9qKirzLMaU5cImq";

/**
 * Admin endpoint to manually sync/update subscription status
 * POST /api/admin/sync-subscription
 * Body: { userId: string, isPro: boolean, planId?: string }
 */
export async function POST(req: Request) {
  try {
    const { userId: currentUserId } = await auth();
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, isPro, planId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Update the user's subscription status
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isPro: isPro === true,
        clerkPlanId: isPro ? (planId || PRO_PLAN_ID) : null,
      },
    });

    console.log(`✅ [Admin] Manually synced subscription for user ${userId}: isPro=${updated.isPro}, planId=${updated.clerkPlanId}`);

    return NextResponse.json({
      success: true,
      userId: updated.id,
      email: updated.email,
      isPro: updated.isPro,
      clerkPlanId: updated.clerkPlanId,
    });
  } catch (error: any) {
    console.error('[Admin] Error syncing subscription:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

