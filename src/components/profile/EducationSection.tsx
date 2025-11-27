'use client';

import React, { useState } from 'react';
import { ResumeSchema } from '@/types';
import { Pencil, Plus, Trash2, X, Check, School, Calendar } from 'lucide-react';
import { updateProfileSection, toggleNoEducation } from '@/actions/profile-actions';
import { Button } from '@/components/Button';

interface Props {
    resumeId: string;
    content: ResumeSchema['education'];
    noEducation?: boolean;
}

export const EducationSection: React.FC<Props> = ({ resumeId, content, noEducation = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [items, setItems] = useState(content);
    const [noEdu, setNoEdu] = useState(noEducation);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            // Save content updates
            await updateProfileSection(resumeId, 'education', items);
            // Save toggle state
            if (noEdu !== noEducation) {
                await toggleNoEducation(resumeId, noEdu);
            }
            setIsEditing(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setItems([...items, {
            institution: '',
            url: '',
            area: '',
            studyType: '',
            startDate: '',
            endDate: '',
            score: '',
            courses: [],
            date: '' // Legacy field support
        }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleChange = (index: number, field: keyof ResumeSchema['education'][0], value: string) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = value;
        setItems(newItems);
    };

    if (isEditing) {
        return (
            <div className="relative bg-white rounded-2xl border border-brand-100 shadow-sm p-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <School className="w-5 h-5 text-brand-600" />
                        Edit Education
                    </h2>
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer mr-4">
                            <input
                                type="checkbox"
                                checked={noEdu}
                                onChange={(e) => setNoEdu(e.target.checked)}
                                className="rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                            />
                            No Education
                        </label>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} isLoading={loading}>
                            Save Changes
                        </Button>
                    </div>
                </div>

                {!noEdu && (
                    <div className="space-y-6">
                        {items.map((item, i) => (
                            <div key={i} className="p-4 bg-stone-50 rounded-xl border border-stone-200 relative group">
                                <button
                                    onClick={() => handleRemoveItem(i)}
                                    className="absolute top-2 right-2 p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Institution</label>
                                        <input
                                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                            value={item.institution}
                                            onChange={(e) => handleChange(i, 'institution', e.target.value)}
                                            placeholder="University Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Degree / Study Type</label>
                                        <input
                                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                            value={item.studyType}
                                            onChange={(e) => handleChange(i, 'studyType', e.target.value)}
                                            placeholder="e.g. Bachelor's, Master's"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Field of Study</label>
                                        <input
                                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                            value={item.area}
                                            onChange={(e) => handleChange(i, 'area', e.target.value)}
                                            placeholder="e.g. Computer Science"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Date Range</label>
                                        <input
                                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                            value={item.date || item.startDate} // Handle both formats
                                            onChange={(e) => handleChange(i, 'date', e.target.value)}
                                            placeholder="e.g. 2018 - 2022"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <Button variant="secondary" className="w-full border-dashed" onClick={handleAddItem}>
                            <Plus className="w-4 h-4 mr-2" /> Add Education
                        </Button>
                    </div>
                )}

                {noEdu && (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
                        <p className="text-stone-500 italic">You have marked that you have no formal education to list.</p>
                    </div>
                )}
            </div>
        );
    }

    // Read-only View
    return (
        <div className="relative group">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                    <School className="w-5 h-5 text-brand-600" />
                    Education
                </h2>
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-stone-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                    <Pencil className="w-4 h-4" />
                </button>
            </div>

            {noEducation ? (
                <div className="text-stone-500 italic text-sm">No education listed.</div>
            ) : (
                <div className="space-y-8">
                    {content.length === 0 && (
                        <div className="text-stone-400 italic text-sm">No education added yet. Click edit to add.</div>
                    )}
                    {content.map((edu, i) => (
                        <div key={i} className="relative pl-6 border-l-2 border-brand-100 last:border-0 pb-6 last:pb-0">
                            <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-brand-600 shadow-sm" />

                            <div className="text-xs text-stone-500 mb-1 font-medium flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {edu.date || `${edu.startDate} - ${edu.endDate}`}
                            </div>

                            <h3 className="text-lg font-bold text-stone-900">{edu.institution}</h3>
                            <p className="text-stone-600 font-medium">{edu.studyType} {edu.area && `in ${edu.area}`}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
