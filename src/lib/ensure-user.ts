'use server';

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Ensures the current user exists in the database.
 * Creates the user if they don't exist (useful if webhook hasn't fired yet).
 */
export async function ensureUser() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized: You must be signed in");
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (existingUser) {
    return existingUser;
  }

  // User doesn't exist, create them
  // Get email from Clerk
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    throw new Error("Unable to get user email from Clerk");
  }

  try {
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email,
        isPro: false,
      },
    });

    console.log(`User created on-demand: ${userId} (${email})`);
    return newUser;
  } catch (error: any) {
    // Handle race condition where user was created between check and create
    if (error.code === 'P2002') {
      // User was created by another request, fetch it
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) return user;
    }
    console.error("Error creating user:", error);
    throw new Error("Failed to create user record");
  }
}

