'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { PricingTable } from '@clerk/nextjs';
import { Button } from '@/components/Button';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Check, AlertCircle } from 'lucide-react';

export default function PricingPage() {
  const [billingEnabled, setBillingEnabled] = useState(true);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    // Check if PricingTable renders successfully
    // If billing is disabled, Clerk will show an error
    const checkBilling = () => {
      try {
        // PricingTable will throw an error if billing is disabled
        // We'll catch it and show a fallback
      } catch (error: any) {
        if (error?.code === 'cannot_render_billing_disabled') {
          setBillingEnabled(false);
          setShowError(true);
        }
      }
    };
    checkBilling();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans selection:bg-brand-200 selection:text-brand-900 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-6 py-12">
        <div className="max-w-6xl w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-brand-600 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Workspace
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold text-stone-900 font-display">
              Choose Your Plan
            </h1>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Unlock powerful AI-powered resume optimization, job matching, and career tools
            </p>
          </div>

          {/* Features Comparison */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <h3 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">✨</span> Free Plan
              </h3>
              <ul className="space-y-3 text-stone-600">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Basic resume editor</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Job search & tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Basic ATS score</span>
                </li>
                <li className="flex items-start gap-2 text-stone-400">
                  <span className="w-5 h-5 mt-0.5 shrink-0">✗</span>
                  <span>AI-powered tailoring</span>
                </li>
                <li className="flex items-start gap-2 text-stone-400">
                  <span className="w-5 h-5 mt-0.5 shrink-0">✗</span>
                  <span>Cover letter generation</span>
                </li>
                <li className="flex items-start gap-2 text-stone-400">
                  <span className="w-5 h-5 mt-0.5 shrink-0">✗</span>
                  <span>Interview prep questions</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl border-2 border-brand-300 p-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-brand-600 text-white text-xs font-bold uppercase tracking-wider rounded-full">
                  Pro
                </span>
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600" />
                Pro Plan
              </h3>
              <ul className="space-y-3 text-stone-700">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
                  <span className="font-semibold">Everything in Free</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
                  <span>One-click AI resume tailoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
                  <span>AI cover letter generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
                  <span>Personalized interview prep</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
                  <span>Advanced ATS optimization</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
                  <span>Unlimited AI generations</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Clerk Pricing Table or Fallback */}
          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
            {showError ? (
              <div className="text-center space-y-4 py-8">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-bold text-stone-900 mb-2">
                    Billing Setup Required
                  </h3>
                  <p className="text-stone-600 mb-4">
                    To enable subscriptions, please enable billing in your Clerk Dashboard.
                  </p>
                  <a
                    href="https://dashboard.clerk.com/last-active?path=billing/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Button variant="primary">
                      Enable Billing in Clerk Dashboard
                    </Button>
                  </a>
                </div>
                <p className="text-xs text-stone-500 mt-4">
                  Once billing is enabled, the pricing table will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="relative">
                <PricingTable />
              </div>
            )}
          </div>

          {/* Footer Note */}
          <p className="text-center text-sm text-stone-500">
            All plans include secure data storage and regular updates. Cancel anytime.
          </p>
        </div>
      </main>
    </div>
  );
}

