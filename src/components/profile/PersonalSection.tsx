'use client';

import React, { useState } from 'react';
import { ResumeSchema } from '@/types';
import { updateProfileSection } from '@/actions/profile-actions';
import { Pencil, MapPin, Mail, Phone, Linkedin, Github, Globe, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/Button';

interface Props {
    resumeId: string;
    content: ResumeSchema['basics'];
}

export const PersonalSection: React.FC<Props> = ({ resumeId, content }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(content);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateProfileSection(resumeId, 'basics', formData);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddProfile = () => {
        setFormData({
            ...formData,
            profiles: [...formData.profiles, { network: '', username: '', url: '' }]
        });
    };

    const handleRemoveProfile = (index: number) => {
        const newProfiles = [...formData.profiles];
        newProfiles.splice(index, 1);
        setFormData({ ...formData, profiles: newProfiles });
    };

    const handleProfileChange = (index: number, field: keyof ResumeSchema['basics']['profiles'][0], value: string) => {
        const newProfiles = [...formData.profiles];
        (newProfiles[index] as any)[field] = value;
        setFormData({ ...formData, profiles: newProfiles });
    };

    if (isEditing) {
        return (
            <div className="relative bg-white rounded-2xl border border-brand-100 shadow-sm p-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-stone-900">Edit Personal Details</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} isLoading={loading}>
                            Save Changes
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Full Name</label>
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                placeholder="Your Name"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Email</label>
                            <input
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                placeholder="email@example.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Phone</label>
                            <input
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Location</label>
                            <input
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                placeholder="City, State"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block">Professional Summary</label>
                        <textarea
                            value={formData.summary || ''}
                            onChange={e => setFormData({ ...formData, summary: e.target.value })}
                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none resize-none"
                            rows={4}
                            placeholder="Briefly describe your professional background..."
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Social Profiles</label>
                        <div className="space-y-3">
                            {formData.profiles.map((profile, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <input
                                        value={profile.network}
                                        onChange={e => handleProfileChange(i, 'network', e.target.value)}
                                        className="w-1/3 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                        placeholder="Network (e.g. LinkedIn)"
                                    />
                                    <input
                                        value={profile.url}
                                        onChange={e => handleProfileChange(i, 'url', e.target.value)}
                                        className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                        placeholder="URL"
                                    />
                                    <button
                                        onClick={() => handleRemoveProfile(i)}
                                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <Button variant="secondary" size="sm" onClick={handleAddProfile} className="w-full border-dashed">
                                <Plus className="w-4 h-4 mr-2" /> Add Profile
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative group">
            <button
                onClick={() => setIsEditing(true)}
                className="absolute top-0 right-0 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
            >
                <Pencil className="w-4 h-4" />
            </button>

            <h2 className="text-3xl font-bold text-stone-900 mb-4 font-display">{content.name}</h2>

            <div className="flex flex-wrap gap-4 mb-6 text-sm text-stone-600">
                {content.location && (
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-stone-400" />
                        {content.location}
                    </div>
                )}
                {content.email && (
                    <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-stone-400" />
                        {content.email}
                    </div>
                )}
                {content.phone && (
                    <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-stone-400" />
                        {content.phone}
                    </div>
                )}
            </div>

            {content.summary && (
                <p className="text-stone-600 leading-relaxed mb-6 max-w-3xl">
                    {content.summary}
                </p>
            )}

            <div className="flex flex-wrap gap-3">
                {content.profiles.map((profile, i) => (
                    <a
                        key={i}
                        href={profile.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-1.5 rounded-lg text-sm text-stone-600 hover:border-brand-300 hover:text-brand-600 transition-colors shadow-sm"
                    >
                        {profile.network.toLowerCase().includes('linkedin') ? <Linkedin className="w-3.5 h-3.5" /> :
                            profile.network.toLowerCase().includes('github') ? <Github className="w-3.5 h-3.5" /> :
                                <Globe className="w-3.5 h-3.5" />}
                        {profile.network}
                    </a>
                ))}
            </div>
        </div>
    );
};
