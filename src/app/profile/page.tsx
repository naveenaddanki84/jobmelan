'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { Navbar } from '@/components/Navbar';
import { getProfileData } from '@/actions/profile-actions';
import { ResumeSchema } from '@/types';
import { Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Components
import { PersonalSection } from '@/components/profile/PersonalSection';
import { EducationSection } from '@/components/profile/EducationSection';
import { ExperienceSection } from '@/components/profile/ExperienceSection';
import { SkillsSection } from '@/components/profile/SkillsSection';
import { EqualEmploymentSection } from '@/components/profile/EqualEmploymentSection';
import { CompletionCard } from '@/components/profile/CompletionCard';
import { DeleteAccountSection } from '@/components/profile/DeleteAccountSection';

function ProfilePageContent() {
    const searchParams = useSearchParams();
    const isOnboarding = searchParams?.get('onboarding') === 'true';

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        resume: { id: string, content: ResumeSchema } | null,
        equalEmployment: any,
        documents: any[],
        completion: { percentage: number, incomplete: string[], complete: string[] }
    } | null>(null);
    const [activeTab, setActiveTab] = useState('Personal');

    useEffect(() => {
        const loadData = async () => {
            const profileData = await getProfileData();
            setData(profileData);
            setLoading(false);
        };
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    if (!data || !data.resume) {
        return (
            <div className="min-h-screen bg-stone-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <h2 className="text-2xl font-bold mb-4">No Profile Found</h2>
                        <p className="text-stone-600 mb-6">Please create a resume first to generate your profile.</p>
                        <Link href="/onboarding" className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700">
                            Create Resume
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const tabs = ['Personal', 'Education', 'Work Experience', 'Skills', 'Equal Employment'];

    return (
        <div className="min-h-screen bg-[#fafaf9] font-sans text-stone-900">
            <Navbar />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-10">
                    <h1 className="text-4xl font-bold font-display text-stone-900 mb-2">My Profile</h1>
                    <p className="text-stone-500">Manage your professional identity and documents.</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 overflow-hidden">
                    {/* Tabs Header */}
                    <div className="bg-stone-50/50 border-b border-stone-200 px-6 pt-2">
                        <div className="flex overflow-x-auto no-scrollbar gap-8">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === tab
                                        ? 'border-brand-600 text-brand-600'
                                        : 'border-transparent text-stone-500 hover:text-stone-800'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-8 min-h-[500px]">
                        {activeTab === 'Personal' && (
                            <PersonalSection resumeId={data.resume.id} content={data.resume.content.basics} />
                        )}
                        {activeTab === 'Education' && (
                            <EducationSection resumeId={data.resume.id} content={data.resume.content.education} />
                        )}
                        {activeTab === 'Work Experience' && (
                            <ExperienceSection resumeId={data.resume.id} content={data.resume.content.experience} />
                        )}
                        {activeTab === 'Skills' && (
                            <SkillsSection resumeId={data.resume.id} content={data.resume.content.skills} />
                        )}
                        {activeTab === 'Equal Employment' && (
                            <EqualEmploymentSection data={data.equalEmployment} />
                        )}
                    </div>
                </div>

                {/* Delete Account Section */}
                <DeleteAccountSection />
            </main>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        }>
            <ProfilePageContent />
        </Suspense>
    );
}
