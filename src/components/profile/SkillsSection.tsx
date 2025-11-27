'use client';

import React, { useState } from 'react';
import { ResumeSchema } from '@/types';
import { Pencil, Plus, Trash2, Tag } from 'lucide-react';
import { updateProfileSection } from '@/actions/profile-actions';
import { Button } from '@/components/Button';

interface Props {
    resumeId: string;
    content: ResumeSchema['skills'];
}

export const SkillsSection: React.FC<Props> = ({ resumeId, content }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [items, setItems] = useState(content);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateProfileSection(resumeId, 'skills', items);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setItems([...items, {
            category: '',
            keywords: [],
            level: ''
        }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleChange = (index: number, field: keyof ResumeSchema['skills'][0], value: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleKeywordsChange = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index].keywords = value.split(',').map(s => s.trim()).filter(Boolean);
        setItems(newItems);
    };

    if (isEditing) {
        return (
            <div className="relative bg-white rounded-2xl border border-brand-100 shadow-sm p-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-brand-600" />
                        Edit Skills
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} isLoading={loading}>
                            Save Changes
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    {items.map((item, i) => (
                        <div key={i} className="p-4 bg-stone-50 rounded-xl border border-stone-200 relative group">
                            <button
                                onClick={() => handleRemoveItem(i)}
                                className="absolute top-2 right-2 p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="space-y-4 pr-8">
                                <div>
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Category</label>
                                    <input
                                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                        value={item.category}
                                        onChange={(e) => handleChange(i, 'category', e.target.value)}
                                        placeholder="e.g. Frontend Development"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Keywords (comma separated)</label>
                                    <textarea
                                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none resize-none"
                                        rows={2}
                                        value={item.keywords.join(', ')}
                                        onChange={(e) => handleKeywordsChange(i, e.target.value)}
                                        placeholder="e.g. React, TypeScript, Tailwind CSS"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <Button variant="secondary" className="w-full border-dashed" onClick={handleAddItem}>
                        <Plus className="w-4 h-4 mr-2" /> Add Skill Category
                    </Button>
                </div>
            </div>
        );
    }

    // Read-only View
    const allKeywords = content.flatMap(s => s.keywords);

    return (
        <div className="relative group">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-brand-600" />
                    Skills
                </h2>
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-stone-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                    <Pencil className="w-4 h-4" />
                </button>
            </div>

            {content.length === 0 ? (
                <div className="text-stone-400 italic text-sm">No skills added yet. Click edit to add.</div>
            ) : (
                <div className="space-y-6">
                    {/* Grouped View */}
                    {content.map((skillGroup, i) => (
                        <div key={i}>
                            <h3 className="text-sm font-bold text-stone-700 mb-2">{skillGroup.category}</h3>
                            <div className="flex flex-wrap gap-2">
                                {skillGroup.keywords.map((keyword, k) => (
                                    <span
                                        key={k}
                                        className="bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-stone-200"
                                    >
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
