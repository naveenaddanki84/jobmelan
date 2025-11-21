'use server';

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ResumeSchema } from "@/types";
import { ensureUser } from "@/lib/ensure-user";

/**
 * Save a new resume to the database
 */
export async function saveResume(content: ResumeSchema, title: string = "My Resume") {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized: You must be signed in to save resumes");
  }

  // Ensure user exists in database
  await ensureUser();

  try {
    const resume = await prisma.resume.create({
      data: {
        userId,
        title,
        content: content as any, // Prisma Json type
      },
    });

    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

/**
 * Update an existing resume
 */
export async function updateResume(id: string, content: ResumeSchema, title?: string) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized: You must be signed in to update resumes");
  }

  try {
    // Verify the resume belongs to the user
    const existing = await prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error("Resume not found or access denied");
    }

    const resume = await prisma.resume.update({
      where: { id },
      data: {
        content: content as any,
        ...(title && { title }),
      },
    });

    return resume;
  } catch (error) {
    console.error("Error updating resume:", error);
    throw new Error("Failed to update resume");
  }
}

/**
 * Get all resumes for the current user
 */
export async function getResumes() {
  const { userId } = await auth();
  
  if (!userId) {
    return [];
  }

  try {
    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        score: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return resumes;
  } catch (error) {
    console.error("Error fetching resumes:", error);
    return [];
  }
}

/**
 * Get a single resume by ID
 */
export async function getResumeById(id: string) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized: You must be signed in to view resumes");
  }

  try {
    const resume = await prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!resume) {
      throw new Error("Resume not found");
    }

    return {
      ...resume,
      content: resume.content as unknown as ResumeSchema,
    };
  } catch (error) {
    console.error("Error fetching resume:", error);
    throw new Error("Failed to fetch resume");
  }
}

/**
 * Delete a resume
 */
export async function deleteResume(id: string) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized: You must be signed in to delete resumes");
  }

  try {
    // Verify the resume belongs to the user
    const existing = await prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error("Resume not found or access denied");
    }

    await prisma.resume.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting resume:", error);
    throw new Error("Failed to delete resume");
  }
}

/**
 * Update resume score (used after analysis)
 */
export async function updateResumeScore(id: string, score: number) {
  const { userId } = await auth();
  
  if (!userId) {
    return;
  }

  try {
    await prisma.resume.updateMany({
      where: { id, userId },
      data: { score },
    });
  } catch (error) {
    console.error("Error updating resume score:", error);
  }
}

