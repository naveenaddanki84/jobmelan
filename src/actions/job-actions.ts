'use server';

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { JobApplication, JobStatus } from "@/types";
import { ensureUser } from "@/lib/ensure-user";

/**
 * Save a new job application
 */
export async function saveJobApplication(job: Omit<JobApplication, 'id' | 'dateAdded'>) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized: You must be signed in to save job applications");
  }

  // Ensure user exists in database
  await ensureUser();

  try {
    const jobApplication = await prisma.jobApplication.create({
      data: {
        userId,
        company: job.company,
        position: job.position,
        status: job.status as string,
        salary: job.salary,
        url: job.url,
      },
    });

    return {
      id: jobApplication.id,
      company: jobApplication.company,
      position: jobApplication.position,
      status: jobApplication.status as JobStatus,
      salary: jobApplication.salary || undefined,
      url: jobApplication.url || undefined,
      dateAdded: jobApplication.createdAt.toISOString().split('T')[0],
      notes: undefined,
      nextActionDate: undefined,
    } as JobApplication;
  } catch (error) {
    console.error("Error saving job application:", error);
    throw new Error("Failed to save job application");
  }
}

/**
 * Get all job applications for the current user
 */
export async function getJobApplications(): Promise<JobApplication[]> {
  const { userId } = await auth();
  
  if (!userId) {
    return [];
  }

  try {
    const jobs = await prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        company: true,
        position: true,
        status: true,
        salary: true,
        url: true,
        jobDescription: true,
        createdAt: true,
      },
    });

    return jobs.map(job => ({
      id: job.id,
      company: job.company,
      position: job.position,
      status: job.status as JobStatus,
      salary: job.salary || undefined,
      url: job.url || undefined,
      dateAdded: job.createdAt.toISOString().split('T')[0],
      notes: undefined,
      nextActionDate: undefined,
      jobDescription: job.jobDescription || undefined,
    }));
  } catch (error) {
    console.error("Error fetching job applications:", error);
    return [];
  }
}

/**
 * Update a job application
 */
export async function updateJobApplication(
  id: string,
  updates: Partial<Pick<JobApplication, 'status' | 'salary' | 'url' | 'company' | 'position'>>
) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized: You must be signed in to update job applications");
  }

  try {
    // Verify the job belongs to the user
    const existing = await prisma.jobApplication.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error("Job application not found or access denied");
    }

    const jobApplication = await prisma.jobApplication.update({
      where: { id },
      data: {
        ...(updates.status && { status: updates.status }),
        ...(updates.salary !== undefined && { salary: updates.salary }),
        ...(updates.url !== undefined && { url: updates.url }),
        ...(updates.company && { company: updates.company }),
        ...(updates.position && { position: updates.position }),
      },
    });

    return {
      id: jobApplication.id,
      company: jobApplication.company,
      position: jobApplication.position,
      status: jobApplication.status as JobStatus,
      salary: jobApplication.salary || undefined,
      url: jobApplication.url || undefined,
      dateAdded: jobApplication.createdAt.toISOString().split('T')[0],
      notes: undefined,
      nextActionDate: undefined,
    } as JobApplication;
  } catch (error) {
    console.error("Error updating job application:", error);
    throw new Error("Failed to update job application");
  }
}

/**
 * Delete a job application
 */
export async function deleteJobApplication(id: string) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized: You must be signed in to delete job applications");
  }

  try {
    // Verify the job belongs to the user
    const existing = await prisma.jobApplication.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error("Job application not found or access denied");
    }

    await prisma.jobApplication.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting job application:", error);
    throw new Error("Failed to delete job application");
  }
}

