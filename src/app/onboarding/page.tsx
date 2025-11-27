'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { extractTextFromFile } from '@/services/fileParser';
import { parseResumeToJSON } from '@/actions/ai-actions';
import { saveResume } from '@/actions/resume-actions';
import { Upload, FileText, ArrowRight, Sparkles } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { BasicsWizard } from '@/components/onboarding/BasicsWizard';

export default function OnboardingPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'parsing' | 'saving' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('parsing');
        setErrorMsg(null);

        try {
            // 1. Extract Text
            const text = await extractTextFromFile(file);

            // 2. Parse with AI
            const parsedData = await parseResumeToJSON(text);

            // 3. Save as Default Resume
            setStatus('saving');
            await saveResume(parsedData, "My Resume");

            // 4. Redirect to Profile
            router.push('/profile?onboarding=true');
        } catch (e: any) {
            console.error(e);
            setErrorMsg(e.message || "Failed to process resume");
            setStatus('error');
        }
    };

    const handleWizardComplete = async (data: { name: string; email: string; phone: string; location: string }) => {
        setStatus('saving');
        try {
            // Create resume with wizard data
            const emptyResume = {
                meta: {
                    sectionOrder: ['experience', 'education', 'projects', 'skills', 'certifications'],
                    visible: { education: true, experience: true, skills: true, projects: true, certifications: true, phone: true, location: true }
                },
                basics: {
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    location: data.location,
                    profiles: []
                },
                skills: [],
                experience: [],
                education: [],
                projects: [],
                certifications: []
            };

            const savedResume = await saveResume(emptyResume, "My Resume");
            router.push(`/profile-editor/${savedResume.id}?onboarding=true`);
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to create resume");
            setStatus('error');
            setShowWizard(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col">
            <Navbar />

            <main className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-4xl w-full">
                    <div className="text-center mb-12 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold uppercase tracking-wider">
                            <Sparkles className="w-4 h-4" />
                            <span>Welcome to JobMélan</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-stone-900 font-display">
                            Let's set up your profile
                        </h1>
                        <p className="text-stone-500 text-lg max-w-xl mx-auto">
                            To get started, we need a base resume. This will be your default profile for tailoring applications.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        {/* Option 1: Upload */}
                        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl shadow-stone-200/50 hover:border-brand-300 hover:shadow-brand-100/50 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Upload className="w-32 h-32 text-brand-500" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mb-6 text-brand-600">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-2">Upload Existing Resume</h3>
                                <p className="text-stone-500 text-sm mb-8 flex-1">
                                    We'll extract your data using AI and format it perfectly. Supports PDF, DOCX, TXT.
                                </p>

                                <label className="block w-full">
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.docx,.txt,.json"
                                        onChange={handleFileUpload}
                                        disabled={status !== 'idle' && status !== 'error'}
                                    />
                                    <div className={`
                    w-full py-3 px-4 rounded-xl font-bold text-center cursor-pointer transition-all flex items-center justify-center gap-2
                    ${status === 'parsing' || status === 'saving'
                                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                            : 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30'
                                        }
                  `}>
                                        {status === 'parsing' ? 'Analyzing...' : status === 'saving' ? 'Saving...' : 'Select File'}
                                        {status === 'idle' && <ArrowRight className="w-4 h-4" />}
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Option 2: Create New */}
                        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl shadow-stone-200/50 hover:border-stone-300 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <FileText className="w-32 h-32 text-stone-500" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mb-6 text-stone-600">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-2">Create from Scratch</h3>
                                <p className="text-stone-500 text-sm mb-8 flex-1">
                                    Start with a blank canvas and use our AI tools to build a professional resume section by section.
                                </p>

                                <Button
                                    variant="secondary"
                                    className="w-full justify-center py-6"
                                    onClick={() => setShowWizard(true)}
                                    disabled={status !== 'idle' && status !== 'error'}
                                >
                                    Start Blank Resume
                                </Button>
                            </div>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="max-w-3xl mx-auto mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-center text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                            {errorMsg}
                        </div>
                    )}
                </div>
            </main>

            {/* Wizard Modal */}
            {showWizard && (
                <BasicsWizard
                    onComplete={handleWizardComplete}
                    onCancel={() => setShowWizard(false)}
                />
            )}
        </div>
    );
}
