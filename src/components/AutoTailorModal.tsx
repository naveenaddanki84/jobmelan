'use client';

import React, { useState } from 'react';
import { Button } from './Button';
import { Wand2, X, CheckSquare, Square, Sparkles, AlertCircle } from 'lucide-react';
import { AutoTailorOptions } from '@/types';

interface AutoTailorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: AutoTailorOptions) => void;
  missingKeywords: string[];
}

export const AutoTailorModal: React.FC<AutoTailorModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  missingKeywords
}) => {
  const [enableSummary, setEnableSummary] = useState(true);
  const [enableSkills, setEnableSkills] = useState(true);
  const [enableExperience, setEnableExperience] = useState(true);
  const [experienceMode, setExperienceMode] = useState<'quick' | 'full'>('quick');
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleKeyword = (kw: string) => {
    const next = new Set(selectedKeywords);
    if (next.has(kw)) next.delete(kw);
    else next.add(kw);
    setSelectedKeywords(next);
  };

  const handleConfirm = () => {
    onConfirm({
      enableSummary,
      enableSkills,
      enableExperience,
      experienceMode,
      selectedKeywords: Array.from(selectedKeywords)
    });
  };

  const handleSelectAllKeywords = () => {
    if (selectedKeywords.size === missingKeywords.length) {
      setSelectedKeywords(new Set());
    } else {
      setSelectedKeywords(new Set(missingKeywords));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display">One-Click Tailoring</h2>
              <p className="text-sm text-stone-500">Automatically enhance your resume based on the job description.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-full hover:bg-stone-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-stone-50/30">
          
          {/* Left Column: Sections */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-stone-800 font-display">1. Choose sections to enhance</h3>
            
            <div className="space-y-3">
              {/* Summary Option */}
              <div 
                className={`flex items-start gap-3 p-5 rounded-xl border cursor-pointer transition-all shadow-sm ${enableSummary ? 'bg-white border-brand-500 ring-1 ring-brand-500/50' : 'bg-white border-stone-200 hover:border-stone-300'}`}
                onClick={() => setEnableSummary(!enableSummary)}
              >
                <div className={`mt-1 ${enableSummary ? 'text-brand-600' : 'text-stone-300'}`}>
                  {enableSummary ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </div>
                <div>
                  <span className={`font-bold ${enableSummary ? 'text-stone-800' : 'text-stone-500'}`}>Summary</span>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">Generates a professional summary optimized for this role.</p>
                </div>
              </div>

              {/* Skills Option */}
              <div 
                className={`flex items-start gap-3 p-5 rounded-xl border cursor-pointer transition-all shadow-sm ${enableSkills ? 'bg-white border-brand-500 ring-1 ring-brand-500/50' : 'bg-white border-stone-200 hover:border-stone-300'}`}
                onClick={() => setEnableSkills(!enableSkills)}
              >
                <div className={`mt-1 ${enableSkills ? 'text-brand-600' : 'text-stone-300'}`}>
                  {enableSkills ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </div>
                <div>
                  <span className={`font-bold ${enableSkills ? 'text-stone-800' : 'text-stone-500'}`}>Skills</span>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">Intelligently adds missing keywords to relevant categories.</p>
                </div>
              </div>

              {/* Experience Option */}
              <div 
                className={`flex flex-col gap-3 p-5 rounded-xl border shadow-sm transition-all ${enableExperience ? 'bg-white border-brand-500 ring-1 ring-brand-500/50' : 'bg-white border-stone-200'}`}
              >
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => setEnableExperience(!enableExperience)}>
                  <div className={`mt-1 ${enableExperience ? 'text-brand-600' : 'text-stone-300'}`}>
                    {enableExperience ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className={`font-bold ${enableExperience ? 'text-stone-800' : 'text-stone-500'}`}>Work Experience</span>
                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">Rewrites bullet points to include keywords and improve impact.</p>
                  </div>
                </div>
                
                {enableExperience && (
                  <div className="ml-8 mt-2 space-y-2 bg-stone-50 p-4 rounded-lg border border-stone-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="expMode" 
                        checked={experienceMode === 'quick'} 
                        onChange={() => setExperienceMode('quick')}
                        className="text-brand-500 focus:ring-brand-500 bg-white border-stone-300"
                      />
                      <span className="text-sm text-stone-600 font-medium">Quick Edit (First 2 key experiences)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="expMode" 
                        checked={experienceMode === 'full'} 
                        onChange={() => setExperienceMode('full')}
                        className="text-brand-500 focus:ring-brand-500 bg-white border-stone-300"
                      />
                      <span className="text-sm text-stone-600 font-medium">Full Edit (All experiences - takes longer)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Keywords */}
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-800 font-display">2. Add missing skill keywords ({selectedKeywords.size}/{missingKeywords.length})</h3>
              <button 
                onClick={handleSelectAllKeywords} 
                className="text-sm font-bold text-brand-600 hover:text-brand-700 hover:underline"
              >
                {selectedKeywords.size === missingKeywords.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="flex-1 bg-white border border-stone-200 rounded-xl p-4 overflow-y-auto custom-scrollbar shadow-inner">
              {missingKeywords.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center">
                    <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-medium">No missing keywords found!</p>
                 </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {missingKeywords.map(kw => (
                    <label 
                      key={kw} 
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-all ${
                        selectedKeywords.has(kw)
                          ? 'bg-brand-50 border-brand-200 text-brand-800 font-medium'
                          : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedKeywords.has(kw)} 
                        onChange={() => toggleKeyword(kw)}
                        className="hidden"
                      />
                      {selectedKeywords.has(kw) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      <span className="text-sm">{kw}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-800 leading-relaxed font-medium">
                Selected keywords will be prioritized during the rewrite. The AI will attempt to include them naturally in the selected sections to boost your match score.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-200 bg-white flex justify-end gap-3">
           <Button variant="ghost" onClick={onClose} className="text-stone-500 hover:text-stone-800">Cancel</Button>
           <Button variant="primary" onClick={handleConfirm} icon={<Wand2 className="w-4 h-4" />} className="shadow-lg shadow-brand-500/20">
             Start Tailoring
           </Button>
        </div>
      </div>
    </div>
  );
};

