'use client';

import React, { useState } from 'react';
import { ArrowRight, User, Mail, Phone, MapPin } from 'lucide-react';

interface Props {
    onComplete: (data: { name: string; email: string; phone: string; location: string }) => void;
    onCancel: () => void;
}

export const BasicsWizard: React.FC<Props> = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');

    const totalSteps = 3;

    const canProceed = () => {
        if (step === 1) return name.trim().length > 0;
        if (step === 2) return email.trim().length > 0 && phone.trim().length > 0;
        if (step === 3) return location.trim().length > 0;
        return false;
    };

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            onComplete({ name, email, phone, location });
        }
    };

    return (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-200">
                {/* Progress */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                            Step {step} of {totalSteps}
                        </span>
                        <span className="text-xs font-medium text-stone-400">
                            {Math.round((step / totalSteps) * 100)}% Complete
                        </span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-300"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Step 1: Name */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 mb-4">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-stone-900 mb-2">What's your name?</h2>
                            <p className="text-stone-500 text-sm">This will appear on your resume and profile.</p>
                        </div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-lg"
                            autoFocus
                        />
                    </div>
                )}

                {/* Step 2: Contact */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 mb-4">
                            <Mail className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-stone-900 mb-2">Contact Information</h2>
                            <p className="text-stone-500 text-sm">How can employers reach you?</p>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-stone-600 mb-1 block">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="john@example.com"
                                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-stone-600 mb-1 block">Phone</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1 (555) 123-4567"
                                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Location */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 mb-4">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-stone-900 mb-2">Where are you located?</h2>
                            <p className="text-stone-500 text-sm">City, State or Country</p>
                        </div>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="San Francisco, CA"
                            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-lg"
                            autoFocus
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 mt-8">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-medium transition-colors"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-bold hover:bg-brand-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30"
                    >
                        {step === totalSteps ? 'Start Building' : 'Continue'}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
