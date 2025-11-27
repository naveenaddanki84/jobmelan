'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { getResumes, saveResume } from '@/actions/resume-actions';
import { DocumentsSection } from '@/components/profile/DocumentsSection';
import { Loader2, Upload, ArrowRight } from 'lucide-react';
import { extractTextFromFile } from '@/services/fileParser';
import { parseResumeToJSON } from '@/actions/ai-actions';
import { useRouter } from 'next/navigation';
import { getDocumentLimit } from '@/lib/subscription';

export default function DocumentsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [resumes, setResumes] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [documentLimit, setDocumentLimit] = useState<number>(2);

    useEffect(() => {
        loadResumes();
        getDocumentLimit().then(setDocumentLimit);
    }, []);

    const loadResumes = async () => {
        try {
            const data = await getResumes();
            setResumes(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // 1. Extract Text
            const text = await extractTextFromFile(file);

            // 2. Parse with AI
            const parsedData = await parseResumeToJSON(text);

            // 3. Save Resume
            await saveResume(parsedData, "Uploaded Resume");

            // 4. Refresh list
            await loadResumes();
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to upload resume");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafaf9] font-sans text-stone-900">
            <Navbar />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-4xl font-bold font-display text-stone-900 mb-2">My Documents</h1>
                        <p className="text-stone-500">Manage your resumes and tailored applications.</p>
                    </div>

                    {resumes.length < documentLimit ? (
                        <label className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold cursor-pointer transition-all shadow-lg
                            ${uploading
                                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                : 'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-900/20'
                            }
                        `}>
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.docx,.txt"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    <span>Upload Resume</span>
                                </>
                            )}
                        </label>
                    ) : (
                        <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-stone-100 text-stone-400 cursor-not-allowed">
                            <span>Limit Reached ({documentLimit}/{documentLimit})</span>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                    </div>
                ) : (
                    <DocumentsSection documents={resumes} />
                )}
            </main>
        </div>
    );
}
