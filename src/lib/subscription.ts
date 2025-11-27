'use server';

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Get the Pro plan ID from environment variable
const PRO_PLAN_ID = process.env.CLERK_PRO_PLAN_ID || "cplan_35lmOqzm4DkZ9qKirzLMaU5cImq";

/**
 * Check if the current user has a pro subscription
 * Relies on database sync from Clerk webhooks
 */
export async function checkProSubscription(): Promise<boolean> {
  const { userId } = await auth();
  
  if (!userId) {
    return false;
  }

  try {
    // Check subscription status from database
    // This is synced via Clerk webhooks when subscription changes
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPro: true, clerkPlanId: true }
    });

    // More lenient check: if isPro is true, grant access
    // Also check if plan ID matches (strict check)
    // This handles cases where webhook synced isPro but planId might be null or different
    const hasPro = user?.isPro === true || (user?.clerkPlanId === PRO_PLAN_ID && user?.clerkPlanId !== null);
    
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Subscription Check] User ${userId}: isPro=${user?.isPro}, planId=${user?.clerkPlanId}, expectedPlan=${PRO_PLAN_ID}, hasPro=${hasPro}`);
      
      // Warn if there's a mismatch
      if (user?.isPro === true && user?.clerkPlanId !== PRO_PLAN_ID && user?.clerkPlanId !== null) {
        console.warn(`[Subscription Warning] User ${userId} has isPro=true but planId (${user?.clerkPlanId}) doesn't match expected (${PRO_PLAN_ID})`);
      }
    }
    
    return hasPro;
  } catch (error) {
    console.error("Error checking subscription:", error);
    return false;
  }
}

/**
 * Get the current user's subscription status
 */
export async function getSubscriptionStatus() {
  const { userId } = await auth();
  
  if (!userId) {
    return { isPro: false, planId: null, subscriptionId: null };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPro: true, clerkPlanId: true, subscriptionId: true }
    });

    // More lenient check: if isPro is true, grant access
    const isPro = user?.isPro === true || (user?.clerkPlanId === PRO_PLAN_ID && user?.clerkPlanId !== null);
    
    return {
      isPro,
      planId: user?.clerkPlanId || null,
      subscriptionId: user?.subscriptionId || null
    };
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return { isPro: false, planId: null, subscriptionId: null };
  }
}

/**
 * Get document limit based on subscription status
 */
export async function getDocumentLimit(): Promise<number> {
  const isPro = await checkProSubscription();
  return isPro ? 5 : 2;
}

/**
 * Require pro subscription - throws error if user doesn't have pro
 */
export async function requireProSubscription() {
  const isPro = await checkProSubscription();
  
  if (!isPro) {
    throw new Error("PRO_SUBSCRIPTION_REQUIRED");
  }
  
  return true;
}

