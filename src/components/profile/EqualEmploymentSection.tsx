'use client';

import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { updateEqualEmployment } from '@/actions/profile-actions';
import { Button } from '@/components/Button';

interface Props {
    data: any;
}

export const EqualEmploymentSection: React.FC<Props> = ({ data }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(data || {
        authorized: 'Yes',
        disability: 'No',
        gender: 'Decline to state',
        sponsorship: 'No',
        veteran: 'No',
        race: 'Decline to state',
        lgbtq: 'No'
    });

    const handleSave = async () => {
        await updateEqualEmployment(formData);
        setIsEditing(false);
    };

    const getOptionsForField = (key: string) => {
        switch (key) {
            case 'authorized':
            case 'sponsorship':
            case 'veteran':
            case 'lgbtq':
            case 'disability':
                return [
                    { value: 'Yes', label: 'Yes' },
                    { value: 'No', label: 'No' },
                    { value: 'Decline to state', label: 'Decline to state' }
                ];
            case 'gender':
                return [
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Non-binary', label: 'Non-binary' },
                    { value: 'Other', label: 'Other' },
                    { value: 'Decline to state', label: 'Decline to state' }
                ];
            case 'race':
                return [
                    { value: 'American Indian or Alaska Native', label: 'American Indian or Alaska Native' },
                    { value: 'Asian', label: 'Asian' },
                    { value: 'Black or African American', label: 'Black or African American' },
                    { value: 'Hispanic or Latino', label: 'Hispanic or Latino' },
                    { value: 'Native Hawaiian or Other Pacific Islander', label: 'Native Hawaiian or Other Pacific Islander' },
                    { value: 'White', label: 'White' },
                    { value: 'Two or More Races', label: 'Two or More Races' },
                    { value: 'Decline to state', label: 'Decline to state' }
                ];
            default:
                return [
                    { value: 'Yes', label: 'Yes' },
                    { value: 'No', label: 'No' },
                    { value: 'Decline to state', label: 'Decline to state' }
                ];
        }
    };

    const fields = [
        { key: 'authorized', label: 'Are you authorized to work in the US?' },
        { key: 'disability', label: 'Do you have a disability?' },
        { key: 'gender', label: 'What is your gender?' },
        { key: 'sponsorship', label: 'Will you now or in the future require sponsorship for employment visa status?' },
        { key: 'lgbtq', label: 'Do you identify as LGBTQ+?' },
        { key: 'veteran', label: 'Are you a veteran?' },
        { key: 'race', label: 'How would you identify your race?' },
    ];

    if (isEditing) {
        return (
            <div className="space-y-6">
                {fields.map((field) => {
                    const options = getOptionsForField(field.key);
                    return (
                    <div key={field.key} className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-stone-700">{field.label}</label>
                        <select
                                value={formData[field.key] || ''}
                            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                            className="p-2 border border-stone-200 rounded-lg bg-white"
                        >
                                <option value="">Select an option...</option>
                                {options.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                        </select>
                    </div>
                    );
                })}
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsEditing(true)}
                className="absolute top-0 right-0 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            >
                <Pencil className="w-4 h-4" />
            </button>

            <h2 className="text-xl font-bold text-stone-900 mb-6">Equal Employment</h2>

            <div className="space-y-6">
                {fields.map((field) => (
                    <div key={field.key} className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0">
                        <span className="text-stone-600 text-sm">{field.label}</span>
                        <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-md text-sm font-medium">
                            {formData[field.key] || '-'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
