'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Star, Calendar, MoreVertical, Trash2, Edit2, Check, X, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { deleteResume, setDefaultResume, renameResume, getResumeById } from '@/actions/resume-actions';
import { useRouter } from 'next/navigation';
import { JakesResumeRenderer } from '@/components/ResumePreview';
import { ResumeSchema } from '@/types';
import { getDocumentLimit } from '@/lib/subscription';
import { DocumentCreationModal } from './DocumentCreationModal';

interface Document {
    id: string;
    title: string;
    updatedAt: Date;
    isDefault: boolean;
}

interface Props {
    documents: Document[];
}

export const DocumentsSection: React.FC<Props> = ({ documents }) => {
    const router = useRouter();
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [downloadData, setDownloadData] = useState<ResumeSchema | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [documentLimit, setDocumentLimit] = useState<number>(2);

    useEffect(() => {
        getDocumentLimit().then(setDocumentLimit);
    }, []);

    const handleSetDefault = async (id: string) => {
        setLoading(true);
        try {
            await setDefaultResume(id);
            setActiveMenu(null);
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this resume?")) return;

        setLoading(true);
        try {
            await deleteResume(id);
            setActiveMenu(null);
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to delete resume");
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (doc: Document) => {
        setEditingId(doc.id);
        setEditTitle(doc.title);
        setActiveMenu(null);
    };

    const saveTitle = async (id: string) => {
        if (!editTitle.trim()) return;

        setLoading(true);
        try {
            await renameResume(id, editTitle);
            setEditingId(null);
            setEditTitle("");
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to rename resume");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id: string, title: string) => {
        setLoading(true);
        setActiveMenu(null);
        try {
            const data = await getResumeById(id);
            setDownloadData(data.content);

            // Allow time for render
            setTimeout(async () => {
                const element = document.getElementById('hidden-resume-content');
                if (!element) return;

                try {
                    // Add style override for PDF generation
                    const styleId = 'pdf-color-override-hidden';
                    let overrideStyle = document.getElementById(styleId);
                    if (!overrideStyle) {
                        overrideStyle = document.createElement('style');
                        overrideStyle.id = styleId;
                        overrideStyle.textContent = `
                            #hidden-resume-content { background-color: #ffffff !important; color: #000000 !important; }
                            #hidden-resume-content * { color: inherit; background-color: transparent; border-color: inherit; }
                            #hidden-resume-content .text-gray-900 { color: #111827 !important; }
                            #hidden-resume-content .text-gray-700 { color: #374151 !important; }
                            #hidden-resume-content .text-gray-500 { color: #6b7280 !important; }
                            #hidden-resume-content .resume-section-header { color: #000000 !important; border-bottom-color: #333333 !important; }
                        `;
                        document.head.appendChild(overrideStyle);
                    }

                    const html2pdf = (await import('html2pdf.js')).default;
                    const opt = {
                        margin: 0,
                        filename: `${title.replace(/\s+/g, '_')}_Resume.pdf`,
                        image: { type: 'jpeg' as const, quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true, backgroundColor: '#ffffff' },
                        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                    };

                    await html2pdf().set(opt).from(element).save();

                    // Cleanup
                    setTimeout(() => {
                        const style = document.getElementById(styleId);
                        if (style) style.remove();
                        setDownloadData(null);
                    }, 1000);

                } catch (err) {
                    console.error("PDF Generation Error:", err);
                    alert("Failed to generate PDF");
                    setDownloadData(null);
                }
            }, 100);

        } catch (error) {
            console.error("Fetch Error:", error);
            alert("Failed to fetch resume data");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setShowCreateModal(true);
    };

    return (
        <div onClick={() => setActiveMenu(null)}>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-stone-900">My Documents</h2>
                <span className="text-xs font-medium text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
                    {documents.length} / {documentLimit} Resumes{documentLimit === 5 ? ' (Pro)' : ''}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documents.map((doc) => (
                    <div key={doc.id} className="bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-lg hover:border-brand-200 transition-all group relative">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-stone-50 rounded-xl group-hover:bg-brand-50 transition-colors">
                                <FileText className="w-6 h-6 text-stone-400 group-hover:text-brand-600 transition-colors" />
                            </div>

                            <div className="flex items-center gap-2">
                                {doc.isDefault && (
                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-current" />
                                        Default
                                    </span>
                                )}

                                <div className="relative" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === doc.id ? null : doc.id)}
                                        className="p-1 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition-colors"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>

                                    {activeMenu === doc.id && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                                            {!doc.isDefault && (
                                                <button
                                                    onClick={() => handleSetDefault(doc.id)}
                                                    className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2"
                                                >
                                                    <Star className="w-4 h-4" /> Set as Default
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDownload(doc.id, doc.title)}
                                                className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2"
                                            >
                                                <Download className="w-4 h-4" /> Download PDF
                                            </button>
                                            <button
                                                onClick={() => startEditing(doc)}
                                                className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2"
                                            >
                                                <Edit2 className="w-4 h-4" /> Rename
                                            </button>
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {editingId === doc.id ? (
                            <div className="mb-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="flex-1 text-lg font-bold text-stone-900 border-b-2 border-brand-500 focus:outline-none bg-transparent"
                                    autoFocus
                                />
                                <button onClick={() => saveTitle(doc.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <h3 className="font-bold text-stone-900 mb-1 truncate pr-8 text-lg">{doc.title}</h3>
                        )}

                        <div className="flex items-center gap-2 text-xs text-stone-500 mb-6">
                            <Calendar className="w-3.5 h-3.5" />
                            Last edited {new Date(doc.updatedAt).toLocaleDateString()}
                        </div>

                        <div className="flex gap-2">
                            <Link
                                href={`/profile-editor/${doc.id}`}
                                className="flex-1 bg-stone-900 text-white text-center py-2.5 rounded-xl text-sm font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/10 hover:shadow-stone-900/20"
                            >
                                Open Editor
                            </Link>
                        </div>
                    </div>
                ))}

                {documents.length < documentLimit && (
                    <button
                        onClick={handleCreateNew}
                        className="border-2 border-dashed border-stone-200 rounded-2xl p-4 flex flex-col items-center justify-center text-stone-400 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/30 transition-all min-h-[200px] group cursor-pointer"
                    >
                        <div className="w-12 h-12 rounded-full bg-stone-50 group-hover:bg-brand-100 flex items-center justify-center mb-3 transition-colors">
                            <span className="text-2xl group-hover:text-brand-600 transition-colors">+</span>
                        </div>
                        <span className="font-bold">Create New Resume</span>
                    </button>
                )}
            </div>

            {/* Hidden Resume Renderer for PDF Generation */}
            <div className="absolute left-[-9999px] top-0 w-[21cm]" id="hidden-resume-wrapper">
                {downloadData && (
                    <div id="hidden-resume-content" className="bg-white p-8">
                        <JakesResumeRenderer data={downloadData} />
                    </div>
                )}
            </div>

            {/* Document Creation Modal */}
            <DocumentCreationModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />
        </div>
    );
};
