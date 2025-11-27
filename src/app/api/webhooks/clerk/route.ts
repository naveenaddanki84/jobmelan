import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { config } from "dotenv";
import { resolve } from "path";
import { prisma } from "@/lib/prisma";

// Explicitly load only .env file (not .env.local)
config({ path: resolve(process.cwd(), '.env') });

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type as string;

  if (eventType === "user.created") {
    const userData = evt.data as any;
    const { id, email_addresses } = userData;

    // Get the primary email address
    const primaryEmail = email_addresses.find(
      (email: any) => email.id === userData.primary_email_address_id
    )?.email_address;

    if (!primaryEmail) {
      return new Response("Error: No email address found", {
        status: 400,
      });
    }

    try {
      // Create user in database
      await prisma.user.create({
        data: {
          id: id,
          email: primaryEmail,
          isPro: false,
        },
      });

      console.log(`User created in database: ${id} (${primaryEmail})`);
    } catch (error: any) {
      // Handle unique constraint violation (user already exists)
      if (error.code === "P2002") {
        console.log(`User already exists: ${id}`);
        return new Response("User already exists", {
          status: 200,
        });
      }
      console.error("Error creating user:", error);
      return new Response("Error creating user", {
        status: 500,
      });
    }
  }

  if (eventType === "user.updated") {
    const userData = evt.data as any;
    const { id, email_addresses } = userData;

    // Get the primary email address
    const primaryEmail = email_addresses.find(
      (email: any) => email.id === userData.primary_email_address_id
    )?.email_address;

    if (primaryEmail) {
      try {
        // Update user in database
        await prisma.user.update({
          where: { id },
          data: {
            email: primaryEmail,
          },
        });

        console.log(`User updated in database: ${id}`);
      } catch (error) {
        console.error("Error updating user:", error);
        // Don't fail the webhook if user doesn't exist yet
      }
    }
  }

  if (eventType === "user.deleted") {
    const userData = evt.data as any;
    const { id } = userData;

    try {
      // Delete user from database (cascade will handle related records)
      await prisma.user.delete({
        where: { id },
      });

      console.log(`User deleted from database: ${id}`);
    } catch (error) {
      console.error("Error deleting user:", error);
      // Don't fail if user doesn't exist
    }
  }

  // Handle subscription events
  // Clerk uses subscription.* events (not billing.subscription.*)
  const PRO_PLAN_ID = process.env.CLERK_PRO_PLAN_ID || "cplan_35lmOqzm4DkZ9qKirzLMaU5cImq";
  
  // Log all subscription-related events for debugging
  if (eventType.includes("subscription") || eventType.includes("billing")) {
    console.log(`[Webhook] Received ${eventType} event:`, JSON.stringify(evt.data, null, 2));
  }
  
  if (eventType === "subscription.created" || 
      eventType === "subscription.updated" ||
      eventType === "subscription.active" ||
      eventType === "subscription.pastDue" ||
      eventType === "subscriptionItem.canceled" ||
      eventType === "subscriptionItem.ended" ||
      eventType === "billing.subscription.created" ||
      eventType === "billing.subscription.updated" ||
      eventType === "billing.subscription.deleted") {
    
    // Extract data from the event - try multiple possible structures
    const subscriptionData = evt.data as any;
    
    // Try different possible field names for user ID
    const user_id = subscriptionData.user_id || 
                    subscriptionData.userId || 
                    subscriptionData.user?.id ||
                    subscriptionData.customer?.id ||
                    subscriptionData.object?.user_id;
    
    // Try different possible field names for plan ID
    const plan_id = subscriptionData.plan_id || 
                    subscriptionData.planId || 
                    subscriptionData.plan?.id ||
                    subscriptionData.object?.plan_id ||
                    subscriptionData.items?.[0]?.plan_id ||
                    subscriptionData.items?.[0]?.plan?.id;
    
    // Try different possible field names for subscription ID
    const subscription_id = subscriptionData.subscription_id || 
                             subscriptionData.id ||
                             subscriptionData.object?.id;

    console.log(`[Webhook] Processing subscription event:`, {
      eventType,
      user_id,
      plan_id,
      subscription_id,
      fullData: JSON.stringify(subscriptionData, null, 2)
    });

    if (!user_id) {
      console.error(`[Webhook] No user_id found in ${eventType} event:`, JSON.stringify(subscriptionData, null, 2));
      return new Response("", { status: 200 });
    }

    try {
      // Determine if user should have pro access
      // Active subscriptions with matching plan ID = pro
      const isActive = eventType === "subscription.active" || 
                       eventType === "subscription.created" || 
                       eventType === "subscription.updated" ||
                       eventType === "billing.subscription.created" ||
                       eventType === "billing.subscription.updated";
      const isCanceled = eventType === "subscriptionItem.canceled" || 
                         eventType === "subscriptionItem.ended" ||
                         eventType === "subscription.pastDue" ||
                         eventType === "billing.subscription.deleted";
      
      // Check if plan ID matches Pro plan (or if plan_id is null but subscription is active, still grant pro)
      const planMatches = plan_id === PRO_PLAN_ID;
      const isPro = isActive && !isCanceled && (planMatches || !plan_id); // Grant pro if active and plan matches OR if no plan_id but active
      
      await prisma.user.update({
        where: { id: user_id },
        data: {
          isPro,
          clerkPlanId: isPro ? (plan_id || PRO_PLAN_ID) : null,
          subscriptionId: subscription_id || null,
        },
      });

      console.log(`✅ [Webhook] Subscription ${eventType} for user ${user_id}: isPro=${isPro}, plan=${plan_id}, matchesProPlan=${planMatches}, PRO_PLAN_ID=${PRO_PLAN_ID}`);
    } catch (error: any) {
      // If user doesn't exist, create them first
      if (error.code === "P2025") {
        console.log(`[Webhook] User ${user_id} not found, creating user record`);
        try {
          // Try to get email from Clerk user data if available
          const email = subscriptionData.email || 
                       subscriptionData.user?.email_addresses?.[0]?.email_address ||
                       `${user_id}@unknown.com`;
          const isActive = eventType === "subscription.active" || 
                           eventType === "subscription.created" || 
                           eventType === "subscription.updated" ||
                           eventType === "billing.subscription.created" ||
                           eventType === "billing.subscription.updated";
          const isCanceled = eventType === "subscriptionItem.canceled" || 
                             eventType === "subscriptionItem.ended" ||
                             eventType === "billing.subscription.deleted";
          const planMatches = plan_id === PRO_PLAN_ID;
          const isPro = isActive && !isCanceled && (planMatches || !plan_id);
          
          await prisma.user.create({
            data: {
              id: user_id,
              email,
              isPro,
              clerkPlanId: isPro ? (plan_id || PRO_PLAN_ID) : null,
              subscriptionId: subscription_id || null,
            },
          });
          console.log(`✅ [Webhook] Created user ${user_id} with isPro=${isPro}`);
        } catch (createError) {
          console.error("[Webhook] Error creating user from subscription event:", createError);
        }
      } else {
        console.error("[Webhook] Error updating subscription:", error);
      }
    }
  }

  return new Response("", { status: 200 });
}

