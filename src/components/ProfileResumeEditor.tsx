'use client';
import React, { useState } from 'react';
import { ResumeSchema } from '@/types';
import { saveResume, updateResume } from '@/actions/resume-actions';
import { Button } from './Button';
import {
    ChevronDown, ChevronUp, Plus, Trash2,
    GripVertical, Eye, EyeOff, Save, CheckCircle2, AlertCircle, Wand2, Loader2, RefreshCcw, Sparkles
} from 'lucide-react';
import { 
    improveProfileBulletPoint,
    rewriteWholeSectionStandalone,
    optimizeSkillsSectionStandalone,
    generateSummaryStandalone,
    suggestBulletPointStandalone
} from '@/actions/ai-actions';
import { UpgradePrompt } from './UpgradePrompt';

interface ProfileResumeEditorProps {
    resumeData: ResumeSchema;
    setResumeData: (data: ResumeSchema) => void;
    resumeId?: string;
}

interface DragItemState {
    section: string;
    index: number;
}

export const ProfileResumeEditor: React.FC<ProfileResumeEditorProps> = ({ resumeData, setResumeData, resumeId }) => {
    // UI State
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basics', 'experience', 'education', 'skills', 'projects', 'certifications']));
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [improvingBullet, setImprovingBullet] = useState<{ section: string, itemIndex: number, bulletIndex: number } | null>(null);
    const [rewritingSection, setRewritingSection] = useState<string | null>(null);
    const [optimizingSkills, setOptimizingSkills] = useState(false);
    const [generatingSummary, setGeneratingSummary] = useState(false);
    const [suggestingBullet, setSuggestingBullet] = useState<{ section: string, itemIndex: number } | null>(null);
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
    const [upgradeFeature, setUpgradeFeature] = useState<string>('');

    // Dragging States
    const [draggedSection, setDraggedSection] = useState<string | null>(null);
    const [draggedItem, setDraggedItem] = useState<DragItemState | null>(null);

    const toggleSection = (section: string) => {
        const newSet = new Set(expandedSections);
        if (newSet.has(section)) {
            newSet.delete(section);
        } else {
            newSet.add(section);
        }
        setExpandedSections(newSet);
    };

    const toggleVisibility = (section: keyof ResumeSchema['meta']['visible']) => {
        setResumeData({
            ...resumeData,
            meta: {
                ...resumeData.meta,
                visible: {
                    ...resumeData.meta.visible,
                    [section]: !resumeData.meta.visible[section]
                }
            }
        });
    };

    // ... Drag handling ...
    const handleSectionDragStart = (e: React.DragEvent, section: string) => {
        setDraggedSection(section);
        e.dataTransfer.effectAllowed = 'move';
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        setTimeout(() => target.classList.add('opacity-50'), 0);
    };

    const handleSectionDragEnd = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('opacity-50');
        setDraggedSection(null);
    };

    const handleSectionDragOver = (e: React.DragEvent, targetSection: string) => {
        e.preventDefault();
        if (!draggedSection || draggedSection === targetSection || draggedItem) return;
        const order = [...resumeData.meta.sectionOrder];
        const draggedIdx = order.indexOf(draggedSection);
        const targetIdx = order.indexOf(targetSection);
        if (draggedIdx === -1 || targetIdx === -1) return;
        order.splice(draggedIdx, 1);
        order.splice(targetIdx, 0, draggedSection);
        setResumeData({
            ...resumeData,
            meta: { ...resumeData.meta, sectionOrder: order }
        });
    };

    const handleItemDragStart = (e: React.DragEvent, section: string, index: number) => {
        e.stopPropagation();
        setDraggedItem({ section, index });
        e.dataTransfer.effectAllowed = 'move';
        const target = e.currentTarget as HTMLElement;
        setTimeout(() => target.classList.add('opacity-40'), 0);
    };

    const handleItemDragOver = (e: React.DragEvent, section: string, targetIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedItem || draggedItem.section !== section || draggedItem.index === targetIndex) return;
        const newData = { ...resumeData };
        // @ts-ignore
        const list = [...newData[section]];
        const [movedItem] = list.splice(draggedItem.index, 1);
        list.splice(targetIndex, 0, movedItem);
        // @ts-ignore
        newData[section] = list;
        setResumeData(newData);
        setDraggedItem({ section, index: targetIndex });
    };

    const handleItemDragEnd = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('opacity-40');
        setDraggedItem(null);
    };

    const SectionHeader = ({
        title,
        sectionKey,
        visibleKey,
        dragHandle = false
    }: {
        title: string,
        sectionKey: string,
        visibleKey?: keyof ResumeSchema['meta']['visible'],
        dragHandle?: boolean
    }) => (
        <div
            className={`w-full px-5 py-4 bg-white flex items-center justify-between border-b border-stone-100 transition-colors ${dragHandle ? 'cursor-move' : ''}`}
            draggable={dragHandle}
            onDragStart={(e) => dragHandle && handleSectionDragStart(e, sectionKey)}
            onDragEnd={handleSectionDragEnd}
            onDragOver={(e) => dragHandle && handleSectionDragOver(e, sectionKey)}
        >
            <div className="flex items-center gap-3 flex-1 group" onClick={(e) => {
                if ((e.target as HTMLElement).closest('.no-toggle')) return;
                toggleSection(sectionKey);
            }}>
                {dragHandle && <GripVertical className="w-4 h-4 text-stone-300 group-hover:text-stone-500 drag-grip cursor-move transition-colors" />}
                {expandedSections.has(sectionKey) ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                <span className="font-bold text-stone-800 select-none text-sm uppercase tracking-wide font-display">{title}</span>
            </div>
            {visibleKey && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(visibleKey);
                    }}
                    className={`p-1.5 rounded-lg hover:bg-stone-100 no-toggle transition-colors ${resumeData.meta.visible[visibleKey] ? 'text-brand-600 bg-brand-50/50' : 'text-stone-300'}`}
                    title={resumeData.meta.visible[visibleKey] ? "Section Visible" : "Section Hidden"}
                >
                    {resumeData.meta.visible[visibleKey] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
            )}
        </div>
    );

    const handleImproveBullet = async (section: string, itemIndex: number, bulletIndex: number, currentText: string, context: string) => {
        if (!currentText.trim()) return;

        setImprovingBullet({ section, itemIndex, bulletIndex });
        try {
            const improvedText = await improveProfileBulletPoint(currentText, context);

            const newData = { ...resumeData };
            // @ts-ignore
            const items = [...newData[section]];
            items[itemIndex].highlights[bulletIndex] = improvedText;
            // @ts-ignore
            newData[section] = items;
            setResumeData(newData);
        } catch (error: any) {
            console.error("Failed to improve bullet:", error);
            if (error?.message === "PRO_SUBSCRIPTION_REQUIRED") {
                setUpgradeFeature("Bullet Point Improvement");
                setShowUpgradePrompt(true);
            }
        } finally {
            setImprovingBullet(null);
        }
    };

    const handleRewriteSection = async (sectionType: 'experience' | 'projects', index: number, bullets: string[], context: string) => {
        const id = sectionType === 'experience' ? resumeData.experience[index].id : resumeData.projects[index].id;
        setRewritingSection(id);
        
        try {
            const newBullets = await rewriteWholeSectionStandalone(bullets, context);

            if (sectionType === 'experience') {
                const n = [...resumeData.experience];
                n[index].highlights = newBullets;
                setResumeData({ ...resumeData, experience: n });
            } else if (sectionType === 'projects') {
                const n = [...resumeData.projects];
                n[index].description = newBullets.join('\n');
                setResumeData({ ...resumeData, projects: n });
            }
        } catch (error: any) {
            console.error("Bulk rewrite failed", error);
            if (error?.message === "PRO_SUBSCRIPTION_REQUIRED") {
                setUpgradeFeature("Section Rewriting");
                setShowUpgradePrompt(true);
            }
        } finally {
            setRewritingSection(null);
        }
    };

    const handleOptimizeSkills = async () => {
        setOptimizingSkills(true);
        try {
            const optimizedSkills = await optimizeSkillsSectionStandalone(resumeData.skills);
            setResumeData({ ...resumeData, skills: optimizedSkills });
        } catch (error: any) {
            console.error("Skills optimization failed", error);
            if (error?.message === "PRO_SUBSCRIPTION_REQUIRED") {
                setUpgradeFeature("Skills Optimization");
                setShowUpgradePrompt(true);
            }
        } finally {
            setOptimizingSkills(false);
        }
    };

    const handleGenerateSummary = async () => {
        setGeneratingSummary(true);
        try {
            const summary = await generateSummaryStandalone(resumeData);
            setResumeData({ 
                ...resumeData, 
                basics: { ...resumeData.basics, summary },
                meta: { ...resumeData.meta, visible: { ...resumeData.meta.visible, summary: true } }
            });
        } catch (error: any) {
            console.error("Summary generation failed", error);
            if (error?.message === "PRO_SUBSCRIPTION_REQUIRED") {
                setUpgradeFeature("Summary Generation");
                setShowUpgradePrompt(true);
            }
        } finally {
            setGeneratingSummary(false);
        }
    };

    const handleSuggestBullet = async (section: string, itemIndex: number, context: string, existingBullets: string[]) => {
        setSuggestingBullet({ section, itemIndex });
        try {
            const suggestedBullet = await suggestBulletPointStandalone(context, existingBullets);
            
            const newData = { ...resumeData };
            // @ts-ignore
            const items = [...newData[section]];
            items[itemIndex].highlights.push(suggestedBullet);
            // @ts-ignore
            newData[section] = items;
            setResumeData(newData);
        } catch (error: any) {
            console.error("Bullet suggestion failed", error);
            if (error?.message === "PRO_SUBSCRIPTION_REQUIRED") {
                setUpgradeFeature("Bullet Point Suggestion");
                setShowUpgradePrompt(true);
            }
        } finally {
            setSuggestingBullet(null);
        }
    };

    const renderSectionContent = (key: string) => {
        switch (key) {
            case 'experience':
                return (
                    <div className="p-5 bg-stone-50/50 space-y-4">
                        {resumeData.experience.map((exp, idx) => (
                            <div key={exp.id}
                                draggable
                                onDragStart={(e) => handleItemDragStart(e, 'experience', idx)}
                                onDragOver={(e) => handleItemDragOver(e, 'experience', idx)}
                                onDragEnd={handleItemDragEnd}
                                className={`relative group rounded-xl p-5 border shadow-sm transition-all bg-white ${exp.visible !== false ? 'border-stone-200 hover:border-brand-200' : 'border-stone-100 opacity-75'}`}
                            >
                                {/* ... (keep existing grip and inputs) ... */}
                                <div className="pl-4">
                                    <div className="grid grid-cols-12 gap-3 mb-4">
                                        {/* ... (keep existing inputs for company, position, dates, location) ... */}
                                        <div className="col-span-6">
                                            <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300"
                                                placeholder="Company" value={exp.company}
                                                onChange={(e) => {
                                                    const n = [...resumeData.experience]; n[idx].company = e.target.value; setResumeData({ ...resumeData, experience: n });
                                                }} />
                                        </div>
                                        <div className="col-span-6">
                                            <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300"
                                                placeholder="Position" value={exp.position}
                                                onChange={(e) => {
                                                    const n = [...resumeData.experience]; n[idx].position = e.target.value; setResumeData({ ...resumeData, experience: n });
                                                }} />
                                        </div>
                                        <div className="col-span-5">
                                            <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-xs text-stone-600 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300"
                                                placeholder="Date Range" value={`${exp.startDate} - ${exp.endDate}`}
                                                onChange={(e) => {
                                                    const parts = e.target.value.split('-');
                                                    const n = [...resumeData.experience];
                                                    n[idx].startDate = parts[0]?.trim() || '';
                                                    n[idx].endDate = parts[1]?.trim() || '';
                                                    setResumeData({ ...resumeData, experience: n });
                                                }} />
                                        </div>
                                        <div className="col-span-5">
                                            <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-xs text-stone-600 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300"
                                                placeholder="Location" value={exp.location}
                                                onChange={(e) => {
                                                    const n = [...resumeData.experience]; n[idx].location = e.target.value; setResumeData({ ...resumeData, experience: n });
                                                }} />
                                        </div>

                                        <div className="col-span-2 flex items-center justify-end gap-1">
                                            <button
                                                className={`p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-100 transition-colors ${rewritingSection === exp.id ? 'animate-pulse' : ''}`}
                                                title="AI Enhance this experience"
                                                onClick={() => handleRewriteSection('experience', idx, exp.highlights, `${exp.position} at ${exp.company}`)}
                                                disabled={!!rewritingSection}
                                            >
                                                {rewritingSection === exp.id ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                                            </button>
                                            <button
                                                className={`p-2 rounded-lg hover:bg-stone-100 transition-colors ${exp.visible !== false ? 'text-stone-400 hover:text-stone-600' : 'text-stone-300'}`}
                                                onClick={() => {
                                                    const n = [...resumeData.experience]; n[idx].visible = exp.visible === false; setResumeData({ ...resumeData, experience: n });
                                                }}
                                            >
                                                {exp.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pl-3 border-l-2 border-stone-100">
                                        {exp.highlights.map((bullet, bIdx) => (
                                            <div key={bIdx} className="flex gap-2 items-start group/bullet">
                                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0"></div>
                                                <div className="flex-1 relative">
                                                    <textarea
                                                        className="w-full bg-transparent border-b border-transparent hover:border-stone-200 focus:border-brand-500 outline-none text-sm text-stone-700 resize-none overflow-hidden transition-colors placeholder-stone-300 py-1 leading-relaxed pr-8"
                                                        rows={Math.max(1, Math.ceil(bullet.length / 90))}
                                                        placeholder="Describe your achievement..."
                                                        value={bullet}
                                                        onChange={(e) => {
                                                            const n = [...resumeData.experience];
                                                            n[idx].highlights[bIdx] = e.target.value;
                                                            setResumeData({ ...resumeData, experience: n });
                                                        }}
                                                    />
                                                    {improvingBullet?.section === 'experience' && improvingBullet?.itemIndex === idx && improvingBullet?.bulletIndex === bIdx ? (
                                                        <div className="absolute right-0 top-1">
                                                            <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="absolute right-0 top-1 p-1 text-stone-300 hover:text-brand-600 transition-colors opacity-0 group-hover/bullet:opacity-100"
                                                            title="Improve with AI"
                                                            onClick={() => handleImproveBullet('experience', idx, bIdx, bullet, `${exp.position} at ${exp.company}`)}
                                                        >
                                                            <Wand2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <button
                                                    className="p-1.5 bg-white border border-stone-200 text-stone-400 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm transition-colors opacity-0 group-hover/bullet:opacity-100"
                                                    onClick={() => {
                                                        const n = [...resumeData.experience];
                                                        n[idx].highlights.splice(bIdx, 1);
                                                        setResumeData({ ...resumeData, experience: n });
                                                    }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2 mt-3">
                                            <button className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center px-2 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                                                onClick={() => {
                                                    const n = [...resumeData.experience];
                                                    n[idx].highlights.push("");
                                                    setResumeData({ ...resumeData, experience: n });
                                                }}>
                                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Bullet
                                            </button>
                                            <button 
                                                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center px-2 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                                                onClick={() => handleSuggestBullet('experience', idx, `${exp.position} at ${exp.company}`, exp.highlights)}
                                                disabled={!!suggestingBullet}
                                                title="AI Suggest Bullet Point"
                                            >
                                                {suggestingBullet?.section === 'experience' && suggestingBullet?.itemIndex === idx ? (
                                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                                ) : (
                                                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                                )}
                                                AI Suggest
                                            </button>
                                        </div>
                                    </div>

                                    <button className="absolute top-4 right-4 p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        onClick={() => {
                                            const n = [...resumeData.experience]; n.splice(idx, 1); setResumeData({ ...resumeData, experience: n });
                                        }}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <Button variant="secondary" size="sm" className="w-full border-dashed border-stone-300 text-stone-500 hover:text-brand-600 hover:border-brand-300 bg-transparent justify-center"
                            onClick={() => setResumeData({ ...resumeData, experience: [...resumeData.experience, { id: crypto.randomUUID(), company: "New Role", position: "", startDate: "", endDate: "", highlights: [""], location: "", visible: true }] })}>
                            <Plus className="w-4 h-4 mr-2" /> Add Position
                        </Button>
                    </div>
                );

            case 'education':
                return (
                    <div className="p-5 bg-stone-50/50 space-y-4">
                        {resumeData.education.map((edu, idx) => (
                            <div key={idx}
                                draggable
                                onDragStart={(e) => handleItemDragStart(e, 'education', idx)}
                                onDragOver={(e) => handleItemDragOver(e, 'education', idx)}
                                onDragEnd={handleItemDragEnd}
                                className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative group pl-6 hover:border-brand-200 transition-colors"
                            >
                                <div className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-move opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity">
                                    <GripVertical className="w-4 h-4 text-stone-400" />
                                </div>

                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-6">
                                        <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300"
                                            placeholder="Institution" value={edu.institution}
                                            onChange={(e) => {
                                                const n = [...resumeData.education]; n[idx].institution = e.target.value; setResumeData({ ...resumeData, education: n });
                                            }} />
                                    </div>
                                    <div className="col-span-6">
                                        <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300"
                                            placeholder="Area of Study" value={edu.area}
                                            onChange={(e) => {
                                                const n = [...resumeData.education]; n[idx].area = e.target.value; setResumeData({ ...resumeData, education: n });
                                            }} />
                                    </div>
                                    <div className="col-span-6">
                                        <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-xs text-stone-600 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300"
                                            placeholder="Study Type (e.g. BS, MS)" value={edu.studyType}
                                            onChange={(e) => {
                                                const n = [...resumeData.education]; n[idx].studyType = e.target.value; setResumeData({ ...resumeData, education: n });
                                            }} />
                                    </div>
                                    <div className="col-span-6">
                                        <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-xs text-stone-600 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300"
                                            placeholder="Date (e.g. 2018 - 2022)" value={edu.date}
                                            onChange={(e) => {
                                                const n = [...resumeData.education]; n[idx].date = e.target.value; setResumeData({ ...resumeData, education: n });
                                            }} />
                                    </div>
                                </div>

                                <button className="absolute top-4 right-4 p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    onClick={() => {
                                        const n = [...resumeData.education]; n.splice(idx, 1); setResumeData({ ...resumeData, education: n });
                                    }}>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <Button variant="secondary" size="sm" className="w-full border-dashed border-stone-300 text-stone-500 hover:text-brand-600 hover:border-brand-300 bg-transparent justify-center"
                            onClick={() => setResumeData({ ...resumeData, education: [...resumeData.education, { id: crypto.randomUUID(), institution: "New University", area: "", studyType: "", date: "" }] })}>
                            <Plus className="w-4 h-4 mr-2" /> Add Education
                        </Button>
                    </div>
                );

            case 'projects':
                return (
                    <div className="p-5 bg-stone-50/50 space-y-4">
                        {resumeData.projects.map((proj, idx) => (
                            <div key={proj.id}
                                draggable
                                onDragStart={(e) => handleItemDragStart(e, 'projects', idx)}
                                onDragOver={(e) => handleItemDragOver(e, 'projects', idx)}
                                onDragEnd={handleItemDragEnd}
                                className={`bg-white p-5 rounded-xl border shadow-sm relative group pl-6 transition-all ${proj.visible !== false ? 'border-stone-200 hover:border-brand-200' : 'border-stone-100 opacity-70'}`}
                            >
                                <div className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-move opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity">
                                    <GripVertical className="w-4 h-4 text-stone-400" />
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                    <input className="bg-transparent font-bold text-sm w-full text-stone-800 outline-none focus:border-b focus:border-brand-500 transition-all placeholder-stone-300"
                                        value={proj.name} placeholder="Project Name"
                                        onChange={(e) => { const n = [...resumeData.projects]; n[idx].name = e.target.value; setResumeData({ ...resumeData, projects: n }); }} />
                                    <div className="flex items-center gap-2">
                                        <button
                                            className={`p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-100 transition-colors ${rewritingSection === proj.id ? 'animate-pulse' : ''}`}
                                            title="AI Enhance this project"
                                            onClick={() => {
                                                const bullets = proj.description.split('\n').filter(b => b.trim());
                                                handleRewriteSection('projects', idx, bullets, proj.name);
                                            }}
                                            disabled={!!rewritingSection}
                                        >
                                            {rewritingSection === proj.id ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                                        </button>
                                        <button
                                            className={`p-1.5 rounded-lg hover:bg-stone-100 transition-colors ${proj.visible !== false ? 'text-stone-400' : 'text-stone-300'}`}
                                            onClick={() => {
                                                const n = [...resumeData.projects]; n[idx].visible = proj.visible === false; setResumeData({ ...resumeData, projects: n });
                                            }}
                                        >
                                            {proj.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <textarea
                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all placeholder-stone-300"
                                        rows={3}
                                        value={proj.description}
                                        placeholder="Project description..."
                                        onChange={(e) => {
                                            const n = [...resumeData.projects];
                                            n[idx].description = e.target.value;
                                            setResumeData({ ...resumeData, projects: n });
                                        }}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Tech:</span>
                                    <input className="flex-1 bg-transparent border-b border-stone-100 focus:border-brand-500 text-xs text-stone-600 focus:outline-none py-1 placeholder-stone-300"
                                        value={proj.technologies.join(', ')} placeholder="React, Node.js, TypeScript..."
                                        onChange={(e) => { const n = [...resumeData.projects]; n[idx].technologies = e.target.value.split(',').map(s => s.trim()); setResumeData({ ...resumeData, projects: n }); }} />
                                </div>

                                <button className="absolute top-3 right-8 text-stone-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    onClick={() => { const n = [...resumeData.projects]; n.splice(idx, 1); setResumeData({ ...resumeData, projects: n }); }}>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <Button variant="secondary" size="sm" className="w-full border-dashed border-stone-300 text-stone-500 hover:text-brand-600 hover:border-brand-300 bg-transparent justify-center"
                            onClick={() => setResumeData({ ...resumeData, projects: [...resumeData.projects, { id: crypto.randomUUID(), name: "New Project", description: "", technologies: [], link: "", visible: true }] })}>
                            <Plus className="w-4 h-4 mr-2" /> Add Project
                        </Button>
                    </div>
                );

            case 'skills':
                return (
                    <div className="p-5 bg-stone-50/50 space-y-4">
                        <div className="mb-4 flex justify-end">
                            <button
                                onClick={handleOptimizeSkills}
                                disabled={optimizingSkills}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                {optimizingSkills ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Optimizing...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4" />
                                        AI Optimize Skills
                                    </>
                                )}
                            </button>
                        </div>
                        {resumeData.skills.map((skill, idx) => (
                            <div key={idx}
                                draggable
                                onDragStart={(e) => handleItemDragStart(e, 'skills', idx)}
                                onDragOver={(e) => handleItemDragOver(e, 'skills', idx)}
                                onDragEnd={handleItemDragEnd}
                                className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative group pl-6 hover:border-brand-200 transition-colors"
                            >
                                <div className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-move opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity">
                                    <GripVertical className="w-4 h-4 text-stone-400" />
                                </div>
                                <input
                                    className="bg-transparent font-bold text-sm w-full mb-3 text-stone-800 outline-none focus:text-brand-700 placeholder-stone-300"
                                    value={skill.category}
                                    placeholder="Category Name"
                                    onChange={(e) => {
                                        const newSkills = [...resumeData.skills];
                                        newSkills[idx].category = e.target.value;
                                        setResumeData({ ...resumeData, skills: newSkills });
                                    }}
                                />
                                <textarea
                                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-stone-600 placeholder-stone-300"
                                    rows={2}
                                    value={skill.keywords.join(', ')}
                                    placeholder="Keywords (comma separated)"
                                    onChange={(e) => {
                                        const newSkills = [...resumeData.skills];
                                        newSkills[idx].keywords = e.target.value.split(',').map(s => s.trim());
                                        setResumeData({ ...resumeData, skills: newSkills });
                                    }}
                                />
                                <button className="absolute top-4 right-4 text-stone-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    onClick={() => { const n = [...resumeData.skills]; n.splice(idx, 1); setResumeData({ ...resumeData, skills: n }); }}>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <Button variant="secondary" size="sm" className="w-full border-dashed border-stone-300 text-stone-500 hover:text-brand-600 hover:border-brand-300 bg-transparent justify-center"
                            onClick={() => setResumeData({ ...resumeData, skills: [...resumeData.skills, { category: "New Category", keywords: ["Skill 1"] }] })}>
                            <Plus className="w-4 h-4 mr-2" /> Add Skill Group
                        </Button>
                    </div>
                );

            case 'certifications':
                return (
                    <div className="p-5 bg-stone-50/50 space-y-4">
                        {resumeData.certifications.map((cert, idx) => (
                            <div key={idx}
                                draggable
                                onDragStart={(e) => handleItemDragStart(e, 'certifications', idx)}
                                onDragOver={(e) => handleItemDragOver(e, 'certifications', idx)}
                                onDragEnd={handleItemDragEnd}
                                className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative group pl-6 hover:border-brand-200 transition-colors"
                            >
                                <div className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-move opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity">
                                    <GripVertical className="w-4 h-4 text-stone-400" />
                                </div>

                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-8">
                                        <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300"
                                            placeholder="Certification Name" value={cert.name}
                                            onChange={(e) => {
                                                const n = [...resumeData.certifications]; n[idx].name = e.target.value; setResumeData({ ...resumeData, certifications: n });
                                            }} />
                                    </div>
                                    <div className="col-span-4">
                                        <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-xs text-stone-600 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300"
                                            placeholder="Date" value={cert.date}
                                            onChange={(e) => {
                                                const n = [...resumeData.certifications]; n[idx].date = e.target.value; setResumeData({ ...resumeData, certifications: n });
                                            }} />
                                    </div>
                                    <div className="col-span-12">
                                        <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300"
                                            placeholder="Issuer" value={cert.issuer}
                                            onChange={(e) => {
                                                const n = [...resumeData.certifications]; n[idx].issuer = e.target.value; setResumeData({ ...resumeData, certifications: n });
                                            }} />
                                    </div>
                                </div>

                                <button className="absolute top-4 right-4 p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    onClick={() => {
                                        const n = [...resumeData.certifications]; n.splice(idx, 1); setResumeData({ ...resumeData, certifications: n });
                                    }}>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <Button variant="secondary" size="sm" className="w-full border-dashed border-stone-300 text-stone-500 hover:text-brand-600 hover:border-brand-300 bg-transparent justify-center"
                            onClick={() => setResumeData({ ...resumeData, certifications: [...resumeData.certifications, { id: crypto.randomUUID(), name: "New Certification", issuer: "", date: "" }] })}>
                            <Plus className="w-4 h-4 mr-2" /> Add Certification
                        </Button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white relative rounded-xl overflow-hidden border border-stone-200 shadow-sm">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Basics Section (Always Top) */}
                <div className="border-b border-stone-100">
                    <div
                        className="w-full px-5 py-4 bg-white flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
                        onClick={() => toggleSection('basics')}
                    >
                        <div className="flex items-center gap-3">
                            {expandedSections.has('basics') ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                            <span className="font-bold text-stone-800 text-sm uppercase tracking-wide font-display">Personal Details</span>
                        </div>
                    </div>

                    {expandedSections.has('basics') && (
                        <div className="p-5 bg-stone-50/50 grid grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">Full Name</label>
                                <input className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                    value={resumeData.basics.name}
                                    onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, name: e.target.value } })} />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">Email</label>
                                <input className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                    value={resumeData.basics.email}
                                    onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, email: e.target.value } })} />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">Phone</label>
                                <input className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                    value={resumeData.basics.phone}
                                    onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, phone: e.target.value } })} />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">Location</label>
                                <input className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                    value={resumeData.basics.location}
                                    onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, location: e.target.value } })} />
                            </div>
                            <div className="col-span-2">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Professional Summary</label>
                                    <button
                                        onClick={handleGenerateSummary}
                                        disabled={generatingSummary}
                                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
                                        title="AI Generate Summary"
                                    >
                                        {generatingSummary ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3 h-3" />
                                                AI Generate
                                            </>
                                        )}
                                    </button>
                                </div>
                                <textarea className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                    rows={4}
                                    value={resumeData.basics.summary || ''}
                                    placeholder="Briefly describe your professional background..."
                                    onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, summary: e.target.value } })} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Dynamic Sections */}
                {resumeData.meta.sectionOrder.map((key) => (
                    <div key={key} className="border-b border-stone-100 last:border-0">
                        <SectionHeader
                            title={key}
                            sectionKey={key}
                            visibleKey={key as keyof ResumeSchema['meta']['visible']}
                            dragHandle={true}
                        />
                        {expandedSections.has(key) && renderSectionContent(key)}
                    </div>
                ))}
            </div>

            {/* Upgrade Prompt Modal */}
            {showUpgradePrompt && (
                <UpgradePrompt
                    isOpen={showUpgradePrompt}
                    feature={upgradeFeature}
                    onClose={() => setShowUpgradePrompt(false)}
                />
            )}
        </div>
    );
};
