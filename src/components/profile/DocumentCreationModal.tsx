'use client';

import React, { useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { extractTextFromFile } from '@/services/fileParser';
import { parseResumeToJSON } from '@/actions/ai-actions';
import { saveResume, createEmptyResume } from '@/actions/resume-actions';
import { useRouter } from 'next/navigation';

interface DocumentCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DocumentCreationModal: React.FC<DocumentCreationModalProps> = ({ isOpen, onClose }) => {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'parsing' | 'saving' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

            // 3. Save Resume
            setStatus('saving');
            const savedResume = await saveResume(parsedData, "Uploaded Resume");

            // 4. Navigate to editor
            router.push(`/profile-editor/${savedResume.id}`);
            router.refresh();
            onClose();
        } catch (e: any) {
            console.error(e);
            setErrorMsg(e.message || "Failed to process resume");
            setStatus('error');
        }
    };

    const handleCreateFromScratch = async () => {
        setStatus('saving');
        setErrorMsg(null);
        try {
            const newResume = await createEmptyResume("New Resume");
            router.push(`/profile-editor/${newResume.id}`);
            router.refresh();
            onClose();
        } catch (e: any) {
            console.error(e);
            setErrorMsg(e.message || "Failed to create resume");
            setStatus('error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-stone-200 px-8 py-6 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold text-stone-900">Create New Document</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                        disabled={status !== 'idle' && status !== 'error'}
                    >
                        <X className="w-5 h-5 text-stone-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Option 1: Upload Resume */}
                        <div className="bg-white p-8 rounded-3xl border-2 border-stone-200 shadow-xl shadow-stone-200/50 hover:border-brand-300 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Upload className="w-32 h-32 text-stone-500" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mb-6 text-brand-600">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-2">Upload Resume</h3>
                                <p className="text-stone-500 text-sm mb-8 flex-1">
                                    Upload your existing resume (PDF, DOCX, or TXT) and we'll parse it automatically using AI.
                                </p>

                                <label className={`
                                    w-full px-6 py-4 rounded-xl font-bold text-center cursor-pointer transition-all shadow-lg
                                    ${status !== 'idle' && status !== 'error'
                                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                        : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/20'
                                    }
                                `}>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.docx,.txt"
                                        onChange={handleFileUpload}
                                        disabled={status !== 'idle' && status !== 'error'}
                                    />
                                    {status === 'parsing' ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Parsing...
                                        </span>
                                    ) : status === 'saving' ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <Upload className="w-4 h-4" />
                                            Choose File
                                        </span>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Option 2: Create from Scratch */}
                        <div className="bg-white p-8 rounded-3xl border-2 border-stone-200 shadow-xl shadow-stone-200/50 hover:border-brand-300 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <FileText className="w-32 h-32 text-stone-500" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mb-6 text-stone-600">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-2">Start from Scratch</h3>
                                <p className="text-stone-500 text-sm mb-8 flex-1">
                                    Start with a blank canvas and use our AI tools to build a professional resume section by section.
                                </p>

                                <button
                                    onClick={handleCreateFromScratch}
                                    disabled={status !== 'idle' && status !== 'error'}
                                    className={`
                                        w-full px-6 py-4 rounded-xl font-bold transition-all shadow-lg
                                        ${status !== 'idle' && status !== 'error'
                                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                            : 'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-900/20'
                                        }
                                    `}
                                >
                                    {status === 'saving' ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating...
                                        </span>
                                    ) : (
                                        'Create Blank Resume'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-center text-sm font-medium">
                            {errorMsg}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

