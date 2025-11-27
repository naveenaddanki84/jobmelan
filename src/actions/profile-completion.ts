'use server';

import { ResumeSchema } from "@/types";

interface CompletionResult {
    percentage: number;
    incomplete: string[];
    complete: string[];
}

/**
 * Calculate profile completion percentage
 * Categories (20% each):
 * - Basics (name, email, phone)
 * - Experience (has entries OR noExperience flag)
 * - Education (has entries OR noEducation flag)
 * - Skills (has at least 3 skills)
 * - EEOC Data (passed separately)
 */
export async function calculateProfileCompletion(
    resume: ResumeSchema,
    eeocData?: any
): Promise<CompletionResult> {
    const incomplete: string[] = [];
    const complete: string[] = [];
    let score = 0;

    // 1. Basics (20%)
    const hasBasics =
        resume.basics?.name &&
        resume.basics?.email &&
        resume.basics?.phone;

    if (hasBasics) {
        score += 20;
        complete.push("Personal Information");
    } else {
        incomplete.push("Complete Personal Information (Name, Email, Phone)");
    }

    // 2. Experience (20%)
    const hasExperience = resume.experience && resume.experience.length > 0;
    const markedNoExperience = resume.meta?.noExperience === true;

    if (hasExperience || markedNoExperience) {
        score += 20;
        complete.push("Work Experience");
    } else {
        incomplete.push("Add Work Experience or mark 'No Experience'");
    }

    // 3. Education (20%)
    const hasEducation = resume.education && resume.education.length > 0;
    const markedNoEducation = resume.meta?.noEducation === true;

    if (hasEducation || markedNoEducation) {
        score += 20;
        complete.push("Education");
    } else {
        incomplete.push("Add Education or mark 'No Education'");
    }

    // 4. Skills (20%)
    const skillCount = resume.skills?.reduce((count, skillGroup) => {
        return count + (skillGroup.keywords?.length || 0);
    }, 0) || 0;

    if (skillCount >= 3) {
        score += 20;
        complete.push("Skills");
    } else {
        incomplete.push(`Add at least ${3 - skillCount} more skill(s)`);
    }

    // 5. EEOC Data (20%)
    const eeocComplete =
        eeocData &&
        eeocData.gender &&
        eeocData.race &&
        eeocData.veteranStatus &&
        eeocData.disabilityStatus;

    if (eeocComplete) {
        score += 20;
        complete.push("Equal Employment Information");
    } else {
        incomplete.push("Complete Equal Employment Information");
    }

    return {
        percentage: score,
        incomplete,
        complete
    };
}
