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
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses } = evt.data;

    // Get the primary email address
    const primaryEmail = email_addresses.find(
      (email: any) => email.id === evt.data.primary_email_address_id
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
    const { id, email_addresses } = evt.data;

    // Get the primary email address
    const primaryEmail = email_addresses.find(
      (email: any) => email.id === evt.data.primary_email_address_id
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
    const { id } = evt.data;

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
  
  if (eventType === "subscription.created" || 
      eventType === "subscription.updated" ||
      eventType === "subscription.active" ||
      eventType === "subscription.pastDue" ||
      eventType === "subscriptionItem.canceled" ||
      eventType === "subscriptionItem.ended") {
    
    // Extract data from the event
    const subscriptionData = evt.data as any;
    const user_id = subscriptionData.user_id || subscriptionData.userId;
    const plan_id = subscriptionData.plan_id || subscriptionData.planId;
    const subscription_id = subscriptionData.subscription_id || subscriptionData.id;

    if (!user_id) {
      console.error("No user_id in subscription event:", JSON.stringify(subscriptionData, null, 2));
      return new Response("", { status: 200 });
    }

    try {
      // Determine if user should have pro access
      // Active subscriptions with matching plan ID = pro
      const isActive = eventType === "subscription.active" || 
                       eventType === "subscription.created" || 
                       eventType === "subscription.updated";
      const isCanceled = eventType === "subscriptionItem.canceled" || 
                         eventType === "subscriptionItem.ended" ||
                         eventType === "subscription.pastDue";
      
      // Check if plan ID matches Pro plan
      const isPro = isActive && !isCanceled && plan_id === PRO_PLAN_ID;
      
      await prisma.user.update({
        where: { id: user_id },
        data: {
          isPro,
          clerkPlanId: isPro ? plan_id : null,
          subscriptionId: subscription_id || null,
        },
      });

      console.log(`✅ Subscription ${eventType} for user ${user_id}: isPro=${isPro}, plan=${plan_id}, matchesProPlan=${plan_id === PRO_PLAN_ID}`);
    } catch (error: any) {
      // If user doesn't exist, create them first
      if (error.code === "P2025") {
        console.log(`User ${user_id} not found, creating user record`);
        try {
          // Try to get email from Clerk user data if available
          const email = subscriptionData.email || `${user_id}@unknown.com`;
          const isActive = eventType === "subscription.active" || 
                           eventType === "subscription.created" || 
                           eventType === "subscription.updated";
          const isCanceled = eventType === "subscriptionItem.canceled" || 
                             eventType === "subscriptionItem.ended";
          const isPro = isActive && !isCanceled && plan_id === PRO_PLAN_ID;
          
          await prisma.user.create({
            data: {
              id: user_id,
              email,
              isPro,
              clerkPlanId: isPro ? plan_id : null,
              subscriptionId: subscription_id || null,
            },
          });
          console.log(`✅ Created user ${user_id} with isPro=${isPro}`);
        } catch (createError) {
          console.error("Error creating user from subscription event:", createError);
        }
      } else {
        console.error("Error updating subscription:", error);
      }
    }
  }

  return new Response("", { status: 200 });
}

