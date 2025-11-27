'use server';

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { ResumeSchema } from "@/types";
import { revalidatePath } from "next/cache";
import { calculateProfileCompletion } from "./profile-completion";

export async function getProfileData() {
    const { userId } = await auth();
    console.log("getProfileData - UserId:", userId);
    if (!userId) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                equalEmployment: true,
                profileContent: true
            }
        });
        console.log("getProfileData - User found:", !!user);

        let profileContent = user?.profileContent as unknown as ResumeSchema | null;
        let resumeId = "profile"; // Virtual ID for profile

        // Migration: If no profileContent, try to get from default resume
        if (!profileContent) {
            const defaultResume = await prisma.resume.findFirst({
                where: { userId, isDefault: true },
            });

            // If no default, get the most recent one
            const resume = defaultResume || await prisma.resume.findFirst({
                where: { userId },
                orderBy: { updatedAt: 'desc' }
            });

            if (resume) {
                profileContent = resume.content as unknown as ResumeSchema;
                resumeId = resume.id;

                // Save this as the profile content to complete migration
                await prisma.user.update({
                    where: { id: userId },
                    data: { profileContent: profileContent as any }
                });
            }
        }

        // Fetch all resumes for "My Documents" (Only User uploaded/created ones)
        const allResumes = await prisma.resume.findMany({
            where: { userId, source: "User" },
            orderBy: [
                { isDefault: 'desc' },
                { updatedAt: 'desc' }
            ],
            select: {
                id: true,
                title: true,
                updatedAt: true,
                isDefault: true
            }
        });

        // Calculate profile completion
        const completion = profileContent
            ? await calculateProfileCompletion(profileContent, user?.equalEmployment)
            : { percentage: 0, incomplete: [], complete: [] };

        return {
            equalEmployment: user?.equalEmployment || {},
            resume: profileContent ? {
                id: resumeId,
                content: profileContent
            } : null,
            documents: allResumes,
            completion
        };
    } catch (error) {
        console.error("Error fetching profile data:", error);
        return null;
    }
}

export async function updateEqualEmployment(data: any) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await prisma.user.update({
        where: { id: userId },
        data: { equalEmployment: data }
    });

    revalidatePath('/profile');
}

export async function updateProfileSection(resumeId: string, section: string, data: any) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get current profile content
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileContent: true }
    });

    if (!user) throw new Error("User not found");

    const content = (user.profileContent as unknown as ResumeSchema) || {};

    // Update specific section
    // @ts-ignore
    content[section] = data;

    await prisma.user.update({
        where: { id: userId },
        data: { profileContent: content as any }
    });

    revalidatePath('/profile');
}

export async function toggleNoEducation(resumeId: string, value: boolean) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileContent: true }
    });

    if (!user) throw new Error("User not found");

    const content = (user.profileContent as unknown as ResumeSchema) || {};
    if (!content.meta) content.meta = { sectionOrder: [], visible: {} } as any;
    content.meta.noEducation = value;

    await prisma.user.update({
        where: { id: userId },
        data: { profileContent: content as any }
    });

    revalidatePath('/profile');
}

export async function toggleNoExperience(resumeId: string, value: boolean) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileContent: true }
    });

    if (!user) throw new Error("User not found");

    const content = (user.profileContent as unknown as ResumeSchema) || {};
    if (!content.meta) content.meta = { sectionOrder: [], visible: {} } as any;
    content.meta.noExperience = value;

    await prisma.user.update({
        where: { id: userId },
        data: { profileContent: content as any }
    });

    revalidatePath('/profile');
}
