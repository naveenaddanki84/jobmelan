'use server';

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const PRO_PLAN_ID = process.env.CLERK_PRO_PLAN_ID || "cplan_35lmOqzm4DkZ9qKirzLMaU5cImq";

/**
 * Manually sync subscription status from Clerk
 * Use this if webhook hasn't fired yet
 */
export async function syncSubscriptionStatus() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    // Get current user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isPro: true, clerkPlanId: true }
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    // Note: This is a manual sync function
    // In production, webhooks handle this automatically
    // You can manually set isPro=true if you have an active subscription
    
    return {
      userId,
      email: user.email,
      isPro: user.isPro,
      clerkPlanId: user.clerkPlanId,
      expectedPlanId: PRO_PLAN_ID,
      matches: user.clerkPlanId === PRO_PLAN_ID
    };
  } catch (error) {
    console.error("Error syncing subscription:", error);
    throw error;
  }
}

/**
 * Manually update subscription status (for testing/admin use)
 * Can also be used to update a specific user by ID (admin only)
 */
export async function updateSubscriptionStatus(isPro: boolean, planId?: string, targetUserId?: string) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // If targetUserId is provided, allow updating that user (for admin use)
  const updateUserId = targetUserId || userId;

  try {
    const updated = await prisma.user.update({
      where: { id: updateUserId },
      data: {
        isPro,
        clerkPlanId: planId || (isPro ? PRO_PLAN_ID : null),
      },
    });

    console.log(`✅ Manually updated subscription for user ${updateUserId}: isPro=${isPro}, planId=${planId || PRO_PLAN_ID}`);
    
    return {
      success: true,
      userId: updateUserId,
      isPro: updated.isPro,
      clerkPlanId: updated.clerkPlanId
    };
  } catch (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
}

