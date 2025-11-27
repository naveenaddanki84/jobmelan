'use server';

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ResumeSchema } from "@/types";
import { ensureUser } from "@/lib/ensure-user";
import { revalidatePath } from "next/cache";

/**
 * Save a new resume to the database
 */
export async function saveResume(content: ResumeSchema, title: string = "My Resume", source: string = "User") {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized: You must be signed in to save resumes");
  }

  // Ensure user exists in database
  await ensureUser();

  try {
    // Check limits
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // Use more lenient check - if isPro flag is set, grant access
    const isPro = user?.isPro === true;
    const limit = isPro ? 5 : 2;

    // Only count "User" resumes against the limit
    const count = await prisma.resume.count({
      where: { userId, source: "User" }
    });

    if (source === "User" && count >= limit) {
      throw new Error(`Resume limit reached (${limit}). Upgrade to Pro for more.`);
    }

    // Check if user has any resumes (for default setting)
    const totalCount = await prisma.resume.count({ where: { userId } });
    const isFirstResume = totalCount === 0;

    // If not first resume, ensure there is a default set to prevent this new one from taking over
    if (!isFirstResume) {
      const hasDefault = await prisma.resume.findFirst({
        where: { userId, isDefault: true }
      });

      if (!hasDefault) {
        // No default exists, but user has resumes. 
        // Set the most recent existing one as default to "lock" the profile state.
        const mostRecent = await prisma.resume.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' }
        });

        if (mostRecent) {
          await prisma.resume.update({
            where: { id: mostRecent.id },
            data: { isDefault: true }
          });
        }
      }
    }

    const resume = await prisma.resume.create({
      data: {
        userId,
        title,
        content: content as any,
        isDefault: isFirstResume,
        source,
      },
    });

    // Mark onboarding as complete on first resume and set initial profile content
    if (isFirstResume) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          onboardingCompleted: true,
          profileContent: content as any
        }
      });
      revalidatePath('/profile');
    }

    revalidatePath('/documents');
    revalidatePath('/profile');
    return resume;
  } catch (error: any) {
    console.error("Error saving resume:", error);
    throw new Error(error.message || "Failed to save resume");
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

    revalidatePath('/documents');
    revalidatePath('/profile');
    revalidatePath(`/profile-editor/${id}`);
    revalidatePath(`/editor/${id}`);
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
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        score: true,
        createdAt: true,
        updatedAt: true,
        isDefault: true,
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

    // Check total resume count (including all sources)
    const totalCount = await prisma.resume.count({
      where: { userId }
    });

    // Prevent deletion if this is the last resume
    if (totalCount <= 1) {
      throw new Error("Cannot delete the last resume. You must have at least one resume.");
    }

    // If deleting the default resume, set another one as default first
    if (existing.isDefault) {
      // Find another resume to set as default
      const otherResume = await prisma.resume.findFirst({
        where: {
          userId,
          id: { not: id }
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (otherResume) {
        await prisma.resume.update({
          where: { id: otherResume.id },
          data: { isDefault: true }
        });
      }
    }

    // Delete the resume
    // Note: Profile content (user.profileContent) is stored separately and will NOT be affected
    await prisma.resume.delete({
      where: { id },
    });

    revalidatePath('/profile');
    revalidatePath('/documents');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting resume:", error);
    throw new Error(error.message || "Failed to delete resume");
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

/**
 * Set a resume as default
 */
export async function setDefaultResume(id: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    // 1. Unset current default
    await prisma.resume.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false }
    });

    // 2. Set new default
    await prisma.resume.update({
      where: { id, userId },
      data: { isDefault: true }
    });

    // 3. Revalidate profile page
    revalidatePath('/profile');

    return { success: true };
  } catch (error) {
    console.error("Error setting default resume:", error);
    throw new Error("Failed to set default resume");
  }
}

/**
 * Rename a resume
 */
export async function renameResume(id: string, title: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    await prisma.resume.update({
      where: { id, userId },
      data: { title }
    });

    revalidatePath('/profile');
    revalidatePath('/documents');
    return { success: true };
  } catch (error) {
    console.error("Error renaming resume:", error);
    throw new Error("Failed to rename resume");
  }
}

/**
 * Create a new empty resume document
 */
export async function createEmptyResume(title: string = "New Resume") {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized: You must be signed in to create resumes");
  }

  // Ensure user exists in database
  await ensureUser();

  try {
    // Check limits
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // Use more lenient check - if isPro flag is set, grant access
    const isPro = user?.isPro === true;
    const limit = isPro ? 5 : 2;

    // Only count "User" resumes against the limit
    const count = await prisma.resume.count({
      where: { userId, source: "User" }
    });

    if (count >= limit) {
      throw new Error(`Resume limit reached (${limit}). Upgrade to Pro for more.`);
    }

    // Check if user has any resumes (for default setting)
    const totalCount = await prisma.resume.count({ where: { userId } });
    const isFirstResume = totalCount === 0;

    // If not first resume, ensure there is a default set to prevent this new one from taking over
    if (!isFirstResume) {
      const hasDefault = await prisma.resume.findFirst({
        where: { userId, isDefault: true }
      });

      if (!hasDefault) {
        // No default exists, but user has resumes. 
        // Set the most recent existing one as default to "lock" the profile state.
        const mostRecent = await prisma.resume.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' }
        });

        if (mostRecent) {
          await prisma.resume.update({
            where: { id: mostRecent.id },
            data: { isDefault: true }
          });
        }
      }
    }

    // Create empty resume template
    const emptyResume: ResumeSchema = {
      meta: {
        sectionOrder: ['experience', 'education', 'projects', 'skills', 'certifications'],
        visible: { education: true, experience: true, skills: true, projects: true, certifications: true, phone: true, location: true }
      },
      basics: {
        name: "",
        email: "",
        phone: "",
        location: "",
        profiles: []
      },
      skills: [],
      experience: [],
      education: [],
      projects: [],
      certifications: []
    };

    const resume = await prisma.resume.create({
      data: {
        userId,
        title,
        content: emptyResume as any,
        isDefault: isFirstResume,
        source: "User",
      },
    });

    // Mark onboarding as complete on first resume and set initial profile content
    if (isFirstResume) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          onboardingCompleted: true,
          profileContent: emptyResume as any
        }
      });
    }

    revalidatePath('/documents');
    return resume;
  } catch (error: any) {
    console.error("Error creating empty resume:", error);
    throw new Error(error.message || "Failed to create resume");
  }
}

