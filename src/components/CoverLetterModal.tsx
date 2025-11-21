'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { generateCoverLetter } from '@/actions/ai-actions';
import { ResumeSchema, CoverLetterOptions } from '@/types';
import { X, FileText, Wand2, Copy, Check, Download } from 'lucide-react';
import { UpgradePrompt } from './UpgradePrompt';
import Link from 'next/link';

interface CoverLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeSchema;
  jobDescription: string;
}

export const CoverLetterModal: React.FC<CoverLetterModalProps> = ({
  isOpen,
  onClose,
  resumeData,
  jobDescription
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [options, setOptions] = useState<CoverLetterOptions>({
    tone: 'professional',
    includeRelocation: false
  });

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const result = await generateCoverLetter(resumeData, jobDescription, options);
      setContent(result);
    } catch (error: any) {
      console.error(error);
      if (error?.message === "PRO_SUBSCRIPTION_REQUIRED") {
        setShowUpgradePrompt(true);
        setContent("");
      } else {
      setContent("Error generating cover letter. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generate on first open if empty
  useEffect(() => {
    if (isOpen && !content) {
      handleGenerate();
    }
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 rounded-xl text-brand-700 shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display">Cover Letter Generator</h2>
              <p className="text-xs text-stone-500">Tailored to your resume and the job description.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-full hover:bg-stone-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Options */}
          <div className="w-64 bg-stone-50 border-r border-stone-200 p-6 space-y-6 hidden md:block overflow-y-auto">
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 block">Tone</label>
              <div className="space-y-2">
                {['professional', 'enthusiastic', 'confident', 'concise'].map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="tone" 
                      checked={options.tone === t}
                      onChange={() => setOptions({...options, tone: t as any})}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-stone-600 group-hover:text-stone-900 capitalize">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
               <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 block">Preferences</label>
               <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={options.includeRelocation}
                    onChange={() => setOptions({...options, includeRelocation: !options.includeRelocation})}
                    className="text-brand-600 focus:ring-brand-500 rounded"
                  />
                  <span className="text-sm text-stone-600 group-hover:text-stone-900">Willing to Relocate</span>
               </label>
            </div>

            <Button 
              className="w-full" 
              onClick={handleGenerate} 
              isLoading={isLoading}
              icon={<Wand2 className="w-4 h-4" />}
            >
              Regenerate
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col bg-white">
             <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
               {isLoading ? (
                 <div className="h-full flex flex-col items-center justify-center space-y-4 text-stone-400">
                   <Wand2 className="w-12 h-12 animate-pulse text-brand-300" />
                   <p className="animate-pulse">Drafting your letter...</p>
                 </div>
               ) : (
                 <textarea
                   className="w-full h-full resize-none outline-none text-stone-800 leading-relaxed font-serif text-lg p-4 border-none focus:ring-0"
                   value={content}
                   onChange={(e) => setContent(e.target.value)}
                   placeholder="Your cover letter will appear here..."
                 />
               )}
             </div>
             
             {/* Toolbar */}
             <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-between items-center">
                <div className="text-xs text-stone-400 italic">
                  {content.split(/\s+/).length} words
                </div>
                <div className="flex gap-2">
                   <Button variant="ghost" onClick={handleCopy}>
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      <span className="ml-2">{copied ? 'Copied' : 'Copy Text'}</span>
                   </Button>
                   <Button variant="primary" onClick={onClose}>Done</Button>
                </div>
             </div>
          </div>
        </div>

      </div>
      
      <UpgradePrompt 
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Cover Letter Generation"
      />
    </div>
  );
};

