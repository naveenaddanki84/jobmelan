'use server';

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteAccount() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    try {
        // Delete from database (cascade will handle resumes and jobs)
        await prisma.user.delete({
            where: { id: userId }
        });

        // Delete from Clerk
        const client = await clerkClient();
        await client.users.deleteUser(userId);

        return { success: true };
    } catch (error) {
        console.error("Error deleting account:", error);
        throw new Error("Failed to delete account");
    }
}
