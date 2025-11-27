'use client';

import React, { useState } from 'react';
import { ResumeSchema } from '@/types';
import { Pencil, Plus, Trash2, Briefcase, Calendar, MapPin } from 'lucide-react';
import { updateProfileSection, toggleNoExperience } from '@/actions/profile-actions';
import { Button } from '@/components/Button';

interface Props {
    resumeId: string;
    content: ResumeSchema['experience'];
    noExperience?: boolean;
}

export const ExperienceSection: React.FC<Props> = ({ resumeId, content, noExperience = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [items, setItems] = useState(content);
    const [noExp, setNoExp] = useState(noExperience);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateProfileSection(resumeId, 'experience', items);
            if (noExp !== noExperience) {
                await toggleNoExperience(resumeId, noExp);
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
            id: crypto.randomUUID(),
            company: '',
            position: '',
            startDate: '',
            endDate: '',
            location: '',
            highlights: [''],
            visible: true
        }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleChange = (index: number, field: keyof ResumeSchema['experience'][0], value: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleBulletChange = (itemIndex: number, bulletIndex: number, value: string) => {
        const newItems = [...items];
        newItems[itemIndex].highlights[bulletIndex] = value;
        setItems(newItems);
    };

    const handleAddBullet = (itemIndex: number) => {
        const newItems = [...items];
        newItems[itemIndex].highlights.push('');
        setItems(newItems);
    };

    const handleRemoveBullet = (itemIndex: number, bulletIndex: number) => {
        const newItems = [...items];
        newItems[itemIndex].highlights.splice(bulletIndex, 1);
        setItems(newItems);
    };

    if (isEditing) {
        return (
            <div className="relative bg-white rounded-2xl border border-brand-100 shadow-sm p-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-brand-600" />
                        Edit Experience
                    </h2>
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer mr-4">
                            <input
                                type="checkbox"
                                checked={noExp}
                                onChange={(e) => setNoExp(e.target.checked)}
                                className="rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                            />
                            No Experience
                        </label>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} isLoading={loading}>
                            Save Changes
                        </Button>
                    </div>
                </div>

                {!noExp && (
                    <div className="space-y-8">
                        {items.map((item, i) => (
                            <div key={item.id || i} className="p-5 bg-stone-50 rounded-xl border border-stone-200 relative group">
                                <button
                                    onClick={() => handleRemoveItem(i)}
                                    className="absolute top-2 right-2 p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-8">
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Company</label>
                                        <input
                                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                            value={item.company}
                                            onChange={(e) => handleChange(i, 'company', e.target.value)}
                                            placeholder="Company Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Position</label>
                                        <input
                                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                            value={item.position}
                                            onChange={(e) => handleChange(i, 'position', e.target.value)}
                                            placeholder="Job Title"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Start Date</label>
                                        <input
                                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                            value={item.startDate}
                                            onChange={(e) => handleChange(i, 'startDate', e.target.value)}
                                            placeholder="e.g. Jan 2020"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">End Date</label>
                                        <input
                                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                            value={item.endDate}
                                            onChange={(e) => handleChange(i, 'endDate', e.target.value)}
                                            placeholder="e.g. Present"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Highlights</label>
                                    {item.highlights.map((bullet, bIdx) => (
                                        <div key={bIdx} className="flex gap-2 items-start">
                                            <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0" />
                                            <textarea
                                                className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none resize-none"
                                                rows={2}
                                                value={bullet}
                                                onChange={(e) => handleBulletChange(i, bIdx, e.target.value)}
                                                placeholder="Describe your achievement..."
                                            />
                                            <button
                                                onClick={() => handleRemoveBullet(i, bIdx)}
                                                className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => handleAddBullet(i)}
                                        className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-2 px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Add Highlight
                                    </button>
                                </div>
                            </div>
                        ))}

                        <Button variant="secondary" className="w-full border-dashed" onClick={handleAddItem}>
                            <Plus className="w-4 h-4 mr-2" /> Add Position
                        </Button>
                    </div>
                )}

                {noExp && (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
                        <p className="text-stone-500 italic">You have marked that you have no work experience to list.</p>
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
                    <Briefcase className="w-5 h-5 text-brand-600" />
                    Work Experience
                </h2>
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-stone-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                    <Pencil className="w-4 h-4" />
                </button>
            </div>

            {noExperience ? (
                <div className="text-stone-500 italic text-sm">No work experience listed.</div>
            ) : (
                <div className="space-y-8">
                    {content.length === 0 && (
                        <div className="text-stone-400 italic text-sm">No experience added yet. Click edit to add.</div>
                    )}
                    {content.map((exp, i) => (
                        <div key={i} className="relative pl-6 border-l-2 border-brand-100 last:border-0 pb-8 last:pb-0">
                            <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-brand-600 shadow-sm" />

                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-stone-500 mb-2 font-medium">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {exp.startDate} - {exp.endDate}
                                </span>
                                {exp.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {exp.location}
                                    </span>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-stone-900">{exp.company}</h3>
                            <p className="text-stone-600 font-medium mb-3">{exp.position}</p>

                            <ul className="space-y-2">
                                {exp.highlights.map((highlight, j) => (
                                    <li key={j} className="text-sm text-stone-600 flex gap-2 leading-relaxed">
                                        <span className="text-stone-400 mt-1.5">•</span>
                                        <span>{highlight}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
