'use client';

import React from 'react';
import { CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface Props {
    percentage: number;
    incomplete: string[];
    complete: string[];
}

export const CompletionCard: React.FC<Props> = ({ percentage, incomplete, complete }) => {
    if (percentage === 100) return null; // Don't show if profile is complete

    const circumference = 2 * Math.PI * 38; // radius = 38
    const progress = (percentage / 100) * circumference;

    return (
        <div className="bg-gradient-to-br from-brand-50 to-white border border-brand-100 rounded-2xl p-6 mb-8 shadow-lg shadow-brand-100/50">
            <div className="flex items-start justify-between gap-6">
                {/* Progress Ring */}
                <div className="relative flex-shrink-0">
                    <svg className="w-24 h-24 transform -rotate-90">
                        {/* Background circle */}
                        <circle
                            cx="48"
                            cy="48"
                            r="38"
                            strokeWidth="6"
                            className="fill-none stroke-stone-200"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="48"
                            cy="48"
                            r="38"
                            strokeWidth="6"
                            className="fill-none stroke-brand-600 transition-all duration-500"
                            strokeLinecap="round"
                            style={{
                                strokeDasharray: circumference,
                                strokeDashoffset: circumference - progress
                            }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-brand-700">{percentage}%</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-brand-600" />
                                Complete Your Profile
                            </h3>
                            <p className="text-sm text-stone-600 mt-1">
                                A complete profile helps you create better-tailored resumes
                            </p>
                        </div>
                    </div>

                    {/* Completed Items */}
                    {complete.length > 0 && (
                        <div className="mb-3">
                            <div className="flex flex-wrap gap-2">
                                {complete.map((item, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Incomplete Items */}
                    {incomplete.length > 0 && (
                        <div className="space-y-2 mt-4">
                            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">What's Missing:</p>
                            <div className="space-y-1.5">
                                {incomplete.map((item, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm">
                                        <Circle className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-stone-700">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
