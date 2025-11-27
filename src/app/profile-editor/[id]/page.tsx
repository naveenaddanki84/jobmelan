'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getResumeById, updateResume } from '@/actions/resume-actions';
import { ResumeSchema } from '@/types';
import { Navbar } from '@/components/Navbar';
import { ProfileResumeEditor } from '@/components/ProfileResumeEditor';
import { ResumePreview } from '@/components/ResumePreview';

export default function ProfileEditorPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isOnboarding = searchParams?.get('onboarding') === 'true';

    const [resume, setResume] = useState<ResumeSchema | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadResume();
    }, [params.id]);

    const loadResume = async () => {
        try {
            const data = await getResumeById(params.id as string);
            setResume(data.content);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updatedResume: ResumeSchema) => {
        setSaving(true);
        try {
            await updateResume(params.id as string, updatedResume);
            setResume(updatedResume);
            router.refresh(); // Refresh to sync with backend

            // If onboarding, redirect to profile
            if (isOnboarding) {
                router.push('/profile?onboarding=true');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <div className="text-stone-500">Loading your resume...</div>
            </div>
        );
    }

    if (!resume) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <div className="text-stone-500">Resume not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col h-screen overflow-hidden">
            <Navbar />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Editor */}
                <div className="w-full lg:w-1/2 flex flex-col border-r border-stone-200 bg-white h-full">
                    <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white z-10">
                        <div>
                            <h1 className="text-xl font-bold text-stone-900">
                                {isOnboarding ? 'Build Your Profile' : 'Edit Profile Resume'}
                            </h1>
                            <p className="text-stone-500 text-xs mt-1">
                                {isOnboarding
                                    ? 'Add your details. AI tools available.'
                                    : 'Update your resume content.'
                                }
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {!isOnboarding && (
                                <button
                                    onClick={() => router.push('/profile')}
                                    className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={() => handleSave(resume)}
                                disabled={saving}
                                className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-500/20"
                            >
                                {saving ? 'Saving...' : isOnboarding ? 'Save & Continue' : 'Save Changes'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-stone-50/30">
                        <ProfileResumeEditor
                            resumeData={resume}
                            setResumeData={setResume}
                            resumeId={params.id as string}
                        />
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className="hidden lg:flex w-1/2 bg-stone-100 h-full flex-col">
                    <div className="flex-1 overflow-hidden p-8 flex items-center justify-center">
                        <div className="h-full w-full max-w-[21cm] shadow-2xl rounded-xl overflow-hidden">
                            <ResumePreview resumeData={resume} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
