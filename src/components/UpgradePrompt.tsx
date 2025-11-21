'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from './Button';
import { Sparkles, X } from 'lucide-react';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  feature = "this feature"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-gradient-to-r from-brand-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 rounded-xl text-brand-700 shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display">Upgrade to Pro</h2>
              <p className="text-xs text-stone-500">Unlock powerful AI features</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-full hover:bg-stone-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-stone-700 leading-relaxed">
            <span className="font-semibold">{feature}</span> is available with a Pro subscription.
          </p>
          
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-stone-900 text-sm">Pro features include:</h3>
            <ul className="text-sm text-stone-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-brand-600 mt-0.5">✓</span>
                <span>One-click AI resume tailoring</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-600 mt-0.5">✓</span>
                <span>AI cover letter generation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-600 mt-0.5">✓</span>
                <span>Personalized interview prep</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-600 mt-0.5">✓</span>
                <span>Advanced ATS optimization</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-600 mt-0.5">✓</span>
                <span>Unlimited AI generations</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-200 bg-stone-50 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Maybe Later
          </Button>
          <Link href="/pricing" className="flex-1">
            <Button variant="primary" className="w-full">
              View Plans
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

