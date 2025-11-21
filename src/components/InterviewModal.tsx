'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { generateInterviewQuestions } from '@/actions/ai-actions';
import { ResumeSchema } from '@/types';
import { X, MessageSquare, Lightbulb, RefreshCcw, Briefcase } from 'lucide-react';
import { UpgradePrompt } from './UpgradePrompt';

interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeSchema;
  jobDescription: string;
}

export const InterviewModal: React.FC<InterviewModalProps> = ({
  isOpen,
  onClose,
  resumeData,
  jobDescription
}) => {
  const [questions, setQuestions] = useState<Array<{ question: string; type: string; tip: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (isOpen && questions.length === 0) {
      handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setShowUpgradePrompt(false);
    try {
      // Create a simplified context string from resume
      const context = `
        Role: ${resumeData.basics.name}
        Skills: ${resumeData.skills.map(s => s.keywords.join(', ')).join('; ')}
        Experience: ${resumeData.experience.map(e => `${e.position} at ${e.company}`).join('; ')}
      `;
      
      const results = await generateInterviewQuestions(jobDescription, context);
      setQuestions(results);
    } catch (e: any) {
      // Check for subscription required error
      const errorMessage = e?.message || String(e);
      if (errorMessage.includes("PRO_SUBSCRIPTION_REQUIRED") || errorMessage === "PRO_SUBSCRIPTION_REQUIRED") {
        setShowUpgradePrompt(true);
        setLoading(false);
        return; // Don't show generic error, upgrade prompt handles it
      }
      console.error("Interview prep error:", e);
      setError("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-gradient-to-r from-brand-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 rounded-xl text-brand-700 shadow-sm">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display">Interview Prep</h2>
              <p className="text-xs text-stone-500">AI-Generated Questions based on your tailored resume.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-full hover:bg-stone-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50/30 custom-scrollbar">
          {loading && !showUpgradePrompt ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
               <RefreshCcw className="w-10 h-10 text-brand-500 animate-spin" />
               <p className="text-stone-500 font-medium">Analyzing your resume & job description...</p>
            </div>
          ) : showUpgradePrompt ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
              <p className="text-stone-600">Upgrade to Pro to unlock Interview Prep</p>
            </div>
          ) : error ? (
            <div className="text-center p-8 text-red-500 bg-red-50 rounded-xl border border-red-100">
               {error}
               <Button variant="secondary" size="sm" onClick={handleGenerate} className="mt-4">Try Again</Button>
            </div>
          ) : (
            <div className="space-y-4">
               {questions.map((q, idx) => (
                 <div key={idx} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between gap-4 mb-2">
                       <span className="px-2 py-1 bg-brand-50 text-brand-700 text-[10px] font-bold uppercase tracking-wider rounded border border-brand-100">
                         {q.type}
                       </span>
                    </div>
                    <h3 className="text-stone-900 font-bold mb-3 flex items-start gap-2">
                       <MessageSquare className="w-5 h-5 text-stone-400 mt-0.5 shrink-0" />
                       {q.question}
                    </h3>
                    <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 text-sm text-stone-600 flex items-start gap-2">
                       <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                       <span><span className="font-bold text-stone-700">Target Answer:</span> {q.tip}</span>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-white flex justify-between items-center">
           <span className="text-xs text-stone-400 italic hidden sm:block">Questions are tailored to your specific resume gaps and strengths.</span>
           <div className="flex gap-3">
             <Button variant="secondary" onClick={handleGenerate} disabled={loading} icon={<RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}>
               Regenerate
             </Button>
             <Button variant="primary" onClick={onClose}>Done</Button>
           </div>
        </div>

      </div>
      
      <UpgradePrompt 
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Interview Prep"
      />
    </div>
  );
};

