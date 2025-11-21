'use client';
import React, { useState, useEffect } from 'react';
import { ResumeSchema, KeywordAnalysis, AutoTailorOptions } from '@/types';
import { 
  extractKeywordsFromJD, 
  evaluateResumeAgainstKeywords, 
  suggestBulletPoint, 
  rewriteWholeSection,
  optimizeSkillsSection,
  generateSummarySection
} from '@/actions/ai-actions';
import { saveResume, updateResume, updateResumeScore } from '@/actions/resume-actions';
import { Button } from './Button';
import { AutoTailorModal } from './AutoTailorModal';
import { InterviewModal } from './InterviewModal';
import { UpgradePrompt } from './UpgradePrompt';
import { 
  ChevronDown, ChevronUp, Plus, Trash2, 
  Wand2, CheckCircle2, XCircle, RefreshCcw, Eye, EyeOff, Save, GripVertical, Link as LinkIcon, Type, Sparkles, MessageSquarePlus, Lock, Unlock, AlertCircle, ArrowRight, Briefcase
} from 'lucide-react';

interface ResumeEditorProps {
  resumeData: ResumeSchema;
  setResumeData: (data: ResumeSchema) => void;
  jobDescription: string;
  resumeId?: string; // Optional: if provided, will update existing resume
}

interface DragItemState {
  section: string;
  index: number;
}

interface BulletPointEditorProps {
  value: string;
  onChange: (val: string) => void;
  onDelete: () => void;
  context: string;
  jobDescription: string;
  missingKeywords: string[];
}

const BulletPointEditor: React.FC<BulletPointEditorProps> = ({
  value, onChange, onDelete, context, jobDescription, missingKeywords
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [customInstruction, setCustomInstruction] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleKeyword = (kw: string) => {
    const next = new Set(selectedKeywords);
    if (next.has(kw)) next.delete(kw);
    else next.add(kw);
    setSelectedKeywords(next);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await suggestBulletPoint(
        value, 
        context, 
        jobDescription, 
        Array.from(selectedKeywords),
        customInstruction
      );
      setSuggestion(result);
    } catch(e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (suggestion) {
      onChange(suggestion);
      setSuggestion(null);
      setIsOpen(false);
      setSelectedKeywords(new Set());
      setCustomInstruction("");
    }
  };

  return (
    <div className="relative group/bullet">
       {/* Main Text Area */}
       <div className="flex gap-3 items-start">
          <div className="mt-2 w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0"></div>
          <textarea 
            className="flex-1 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-brand-500 outline-none text-sm text-stone-700 resize-none overflow-hidden transition-colors placeholder-stone-300 py-1 leading-relaxed"
            rows={Math.max(2, Math.ceil(value.length / 90))} 
            placeholder="Describe your achievement..."
            value={value}
            onChange={(e) => onChange(e.target.value)} 
          />
          <div className="flex flex-col gap-1 opacity-0 group-hover/bullet:opacity-100 transition-opacity pt-1">
             <button 
                className={`p-1.5 rounded-lg transition-all shadow-sm ${isOpen ? 'bg-brand-600 text-white shadow-brand-500/30' : 'bg-white text-brand-600 hover:bg-brand-50 border border-stone-200'}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Rewrite with AI"
             >
                <Wand2 className="w-3.5 h-3.5"/>
             </button>
             <button 
                className="p-1.5 bg-white border border-stone-200 text-stone-400 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm transition-colors"
                onClick={onDelete}
             >
                <Trash2 className="w-3.5 h-3.5"/>
             </button>
          </div>
       </div>

       {/* AI Panel */}
       {isOpen && (
         <div className="mt-3 p-5 bg-white rounded-xl border border-stone-200 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 z-20 relative ring-1 ring-stone-100 mx-2">
            <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-t border-l border-stone-200 transform rotate-45"></div>
            
            {/* Custom Instruction Input */}
            <div className="mb-4">
              <label className="text-xs font-bold text-stone-500 mb-2 flex items-center gap-1 uppercase tracking-wider">
                 <MessageSquarePlus className="w-3 h-3 text-brand-500" />
                 Instructions
              </label>
              <input 
                 type="text" 
                 className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none placeholder-stone-400 transition-all"
                 placeholder="e.g. Make it punchier, focus on leadership..."
                 value={customInstruction}
                 onChange={(e) => setCustomInstruction(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>

            {/* Keywords */}
            <div className="mb-4">
               <label className="text-xs font-bold text-stone-500 mb-2 flex items-center gap-1 uppercase tracking-wider">
                 <Sparkles className="w-3 h-3 text-brand-500" />
                 Inject Keywords
               </label>
               <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                  {missingKeywords.length > 0 ? missingKeywords.map(kw => (
                    <button
                      key={kw}
                      onClick={() => toggleKeyword(kw)}
                      className={`px-2.5 py-1 text-[10px] rounded-md border transition-all flex items-center gap-1 font-medium ${
                        selectedKeywords.has(kw) 
                          ? 'bg-brand-100 text-brand-800 border-brand-300 shadow-sm' 
                          : 'bg-stone-50 text-stone-500 border-stone-200 hover:border-brand-300 hover:text-brand-600 hover:bg-white'
                      }`}
                    >
                      {selectedKeywords.has(kw) ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {kw}
                    </button>
                  )) : (
                    <span className="text-xs text-stone-400 italic">No specific missing keywords identified.</span>
                  )}
               </div>
            </div>
            
            <Button 
               size="sm" 
               className="w-full mb-4 bg-brand-600 hover:bg-brand-700" 
               onClick={handleGenerate} 
               disabled={isGenerating}
               icon={isGenerating ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            >
               {isGenerating ? 'Generating Suggestion...' : suggestion ? 'Regenerate Suggestion' : 'Generate Suggestion'}
            </Button>

            {suggestion && (
              <div className="bg-brand-50/50 p-4 rounded-lg border border-brand-100">
                 <label className="text-xs font-bold text-brand-700 mb-2 block uppercase tracking-wider">AI Suggestion</label>
                 <div className="text-sm text-stone-800 mb-4 leading-relaxed border-l-4 border-brand-400 pl-3 py-1 bg-white rounded-r shadow-sm">
                    "{suggestion}"
                 </div>
                 <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={handleApply} className="flex-1 h-9 text-xs shadow-none">
                       Apply Change
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setSuggestion(null)} className="flex-1 h-9 text-xs bg-white">
                       Discard
                    </Button>
                 </div>
              </div>
            )}
         </div>
       )}
    </div>
  );
};

export const ResumeEditor: React.FC<ResumeEditorProps> = ({ resumeData, setResumeData, jobDescription, resumeId }) => {
  // Analysis State
  const [jobKeywords, setJobKeywords] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // UI State
  const [isRewritingSection, setIsRewritingSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['experience', 'basics']));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Auto Tailor State
  const [isAutoTailorOpen, setIsAutoTailorOpen] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorProgress, setTailorProgress] = useState<string>("");

  // Interview Prep State
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  
  // Upgrade Prompt State
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>("this feature");

  // Dragging States
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<DragItemState | null>(null);

  // Initial Analysis
  useEffect(() => {
    if (jobDescription && resumeData.basics.name && !analysis) {
      runAnalysis();
    }
  }, []); // Run once on mount if data exists

  const runAnalysis = async (forceExtract = false) => {
    setIsAnalyzing(true);
    try {
      let currentKeywords = jobKeywords;
      
      // Keyword Locking Logic:
      // Only extract if: 
      // 1. We don't have keywords yet
      // 2. OR forceExtract is true (Manual Reset)
      // 3. OR we aren't "Locked" (though we default to soft-locking once fetched)
      if (currentKeywords.length === 0 || forceExtract) {
        currentKeywords = await extractKeywordsFromJD(jobDescription);
        setJobKeywords(currentKeywords);
        setIsLocked(true); // Auto-lock after first fetch
      }

      // Always evaluate score against the LOCKED keywords
      const result = await evaluateResumeAgainstKeywords(resumeData, currentKeywords);
      setAnalysis(result);
      
      // Save score to database if resumeId exists
      if (resumeId && result.score !== undefined) {
        updateResumeScore(resumeId, result.score).catch(console.error);
      }
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUnlockAndRefresh = () => {
    // Reset keywords and re-extract
    setJobKeywords([]);
    setIsLocked(false);
    runAnalysis(true);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      if (resumeId) {
        // Update existing resume
        await updateResume(resumeId, resumeData);
      } else {
        // Save new resume
        const saved = await saveResume(resumeData);
        // Note: In a real app, you'd want to update the URL with the new ID
        // For now, we'll just save it
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error("Failed to save resume:", error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  const toggleVisibility = (section: keyof ResumeSchema['meta']['visible']) => {
    setResumeData({
      ...resumeData,
      meta: {
        ...resumeData.meta,
        visible: {
          ...resumeData.meta.visible,
          [section]: !resumeData.meta.visible[section]
        }
      }
    });
  };

  // ---- AUTO TAILOR FLOW ----
  const handleAutoTailor = async (options: AutoTailorOptions) => {
    setIsAutoTailorOpen(false);
    setIsTailoring(true);
    
    let updatedData = { ...resumeData };

    try {
      // 1. Skills Optimization
      if (options.enableSkills) {
        setTailorProgress("Optimizing Skills...");
        const newSkills = await optimizeSkillsSection(updatedData.skills, options.selectedKeywords);
        updatedData.skills = newSkills;
        setResumeData({...updatedData});
      }

      // 2. Summary Generation
      if (options.enableSummary) {
        setTailorProgress("Generating Summary...");
        const newSummary = await generateSummarySection(jobDescription, options.selectedKeywords);
        updatedData.basics.summary = newSummary;
        updatedData.meta.visible.summary = true;
        setResumeData({...updatedData});
      }

      // 3. Experience Optimization
      if (options.enableExperience && updatedData.experience.length > 0) {
        const count = options.experienceMode === 'quick' ? Math.min(2, updatedData.experience.length) : updatedData.experience.length;
        
        for (let i = 0; i < count; i++) {
          const exp = updatedData.experience[i];
          setTailorProgress(`Refining Experience: ${exp.company}...`);
          
          const newBullets = await rewriteWholeSection(
            exp.highlights,
            `${exp.position} at ${exp.company}`,
            jobDescription,
            analysis?.missingKeywords || []
          );
          
          updatedData.experience[i].highlights = newBullets;
          setResumeData({...updatedData}); 
        }
      }

      setResumeData(updatedData);
      
      setTailorProgress("Recalculating Match Score...");
      await runAnalysis(false); // Re-analyze against locked keywords

    } catch (e: any) {
      console.error("Auto tailor failed", e);
      if (e?.message === "PRO_SUBSCRIPTION_REQUIRED") {
        setUpgradeFeature("One-Click Tailoring");
        setShowUpgradePrompt(true);
      }
    } finally {
      setIsTailoring(false);
      setTailorProgress("");
    }
  };

  // ---- BULK REWRITE (Single Section) ----
  const handleRewriteSection = async (
    sectionType: 'experience' | 'projects', 
    index: number, 
    bullets: string[], 
    context: string
  ) => {
    const id = sectionType === 'experience' ? resumeData.experience[index].id : resumeData.projects[index].id;
    setIsRewritingSection(id);
    
    try {
      const newBullets = await rewriteWholeSection(
        bullets, 
        context, 
        jobDescription, 
        analysis?.missingKeywords || []
      );

      if (sectionType === 'experience') {
        const n = [...resumeData.experience];
        n[index].highlights = newBullets;
        setResumeData({ ...resumeData, experience: n });
      } 
      
      // Trigger slight re-analysis
      runAnalysis(false);

    } catch (e: any) {
      console.error("Bulk rewrite failed", e);
      if (e?.message === "PRO_SUBSCRIPTION_REQUIRED") {
        setUpgradeFeature("Section Rewriting");
        setShowUpgradePrompt(true);
      }
    } finally {
      setIsRewritingSection(null);
    }
  };

  // ... Drag handling ...
  const handleSectionDragStart = (e: React.DragEvent, section: string) => {
    setDraggedSection(section);
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation(); 
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => target.classList.add('opacity-50'), 0);
  };

  const handleSectionDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedSection(null);
  };

  const handleSectionDragOver = (e: React.DragEvent, targetSection: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetSection || draggedItem) return;
    const order = [...resumeData.meta.sectionOrder];
    const draggedIdx = order.indexOf(draggedSection);
    const targetIdx = order.indexOf(targetSection);
    if (draggedIdx === -1 || targetIdx === -1) return;
    order.splice(draggedIdx, 1);
    order.splice(targetIdx, 0, draggedSection);
    setResumeData({
      ...resumeData,
      meta: { ...resumeData.meta, sectionOrder: order }
    });
  };

  const handleItemDragStart = (e: React.DragEvent, section: string, index: number) => {
    e.stopPropagation();
    setDraggedItem({ section, index });
    e.dataTransfer.effectAllowed = 'move';
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => target.classList.add('opacity-40'), 0);
  };

  const handleItemDragOver = (e: React.DragEvent, section: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.section !== section || draggedItem.index === targetIndex) return;
    const newData = { ...resumeData };
    // @ts-ignore
    const list = [...newData[section]];
    const [movedItem] = list.splice(draggedItem.index, 1);
    list.splice(targetIndex, 0, movedItem);
    // @ts-ignore
    newData[section] = list;
    setResumeData(newData);
    setDraggedItem({ section, index: targetIndex });
  };

  const handleItemDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('opacity-40');
    setDraggedItem(null);
  };

  const SectionHeader = ({ 
    title, 
    sectionKey, 
    visibleKey,
    dragHandle = false
  }: { 
    title: string, 
    sectionKey: string, 
    visibleKey?: keyof ResumeSchema['meta']['visible'],
    dragHandle?: boolean
  }) => (
    <div 
      className={`w-full px-5 py-4 bg-white flex items-center justify-between border-b border-stone-100 transition-colors ${dragHandle ? 'cursor-move' : ''}`}
      draggable={dragHandle}
      onDragStart={(e) => dragHandle && handleSectionDragStart(e, sectionKey)}
      onDragEnd={handleSectionDragEnd}
      onDragOver={(e) => dragHandle && handleSectionDragOver(e, sectionKey)}
    >
       <div className="flex items-center gap-3 flex-1 group" onClick={(e) => { 
          if((e.target as HTMLElement).closest('.no-toggle')) return;
          toggleSection(sectionKey); 
        }}>
         {dragHandle && <GripVertical className="w-4 h-4 text-stone-300 group-hover:text-stone-500 drag-grip cursor-move transition-colors" />}
         {expandedSections.has(sectionKey) ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
         <span className="font-bold text-stone-800 select-none text-sm uppercase tracking-wide font-display">{title}</span>
       </div>
       {visibleKey && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleVisibility(visibleKey);
            }}
            className={`p-1.5 rounded-lg hover:bg-stone-100 no-toggle transition-colors ${resumeData.meta.visible[visibleKey] ? 'text-brand-600 bg-brand-50/50' : 'text-stone-300'}`}
            title={resumeData.meta.visible[visibleKey] ? "Section Visible" : "Section Hidden"}
          >
            {resumeData.meta.visible[visibleKey] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
       )}
    </div>
  );

  const renderSectionContent = (key: string) => {
    switch(key) {
      case 'experience':
        return (
          <div className="p-5 bg-stone-50/50 space-y-4">
            {resumeData.experience.map((exp, idx) => (
              <div key={exp.id} 
                  draggable
                  onDragStart={(e) => handleItemDragStart(e, 'experience', idx)}
                  onDragOver={(e) => handleItemDragOver(e, 'experience', idx)}
                  onDragEnd={handleItemDragEnd}
                  className={`relative group rounded-xl p-5 border shadow-sm transition-all bg-white ${exp.visible !== false ? 'border-stone-200 hover:border-brand-200' : 'border-stone-100 opacity-75'}`}
              >
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-move opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-stone-400"/>
                  </div>
                  
                  <div className="pl-4">
                    <div className="grid grid-cols-12 gap-3 mb-4">
                      <div className="col-span-6">
                          <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300" 
                            placeholder="Company" value={exp.company} 
                            onChange={(e) => {
                              const n = [...resumeData.experience]; n[idx].company = e.target.value; setResumeData({...resumeData, experience: n});
                            }} />
                      </div>
                      <div className="col-span-6">
                          <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300" 
                            placeholder="Position" value={exp.position} 
                            onChange={(e) => {
                              const n = [...resumeData.experience]; n[idx].position = e.target.value; setResumeData({...resumeData, experience: n});
                            }} />
                      </div>
                      <div className="col-span-5">
                          <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-xs text-stone-600 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300" 
                            placeholder="Date Range" value={`${exp.startDate} - ${exp.endDate}`} 
                            onChange={(e) => {
                                const parts = e.target.value.split('-');
                                const n = [...resumeData.experience]; 
                                n[idx].startDate = parts[0]?.trim() || '';
                                n[idx].endDate = parts[1]?.trim() || '';
                                setResumeData({...resumeData, experience: n});
                            }} />
                      </div>
                      <div className="col-span-5">
                          <input className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-lg px-3 py-2 text-xs text-stone-600 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-stone-300" 
                            placeholder="Location" value={exp.location} 
                            onChange={(e) => {
                              const n = [...resumeData.experience]; n[idx].location = e.target.value; setResumeData({...resumeData, experience: n});
                            }} />
                      </div>
                      
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <button
                          className={`p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-100 transition-colors ${isRewritingSection === exp.id ? 'animate-pulse' : ''}`}
                          title="Auto-Enhance this job experience"
                          onClick={() => handleRewriteSection('experience', idx, exp.highlights, `${exp.position} at ${exp.company}`)}
                          disabled={!!isRewritingSection}
                        >
                           {isRewritingSection === exp.id ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                        </button>

                        <button 
                          className={`p-2 rounded-lg hover:bg-stone-100 transition-colors ${exp.visible !== false ? 'text-stone-400 hover:text-stone-600' : 'text-stone-300'}`}
                          onClick={() => {
                            const n = [...resumeData.experience]; n[idx].visible = exp.visible === false; setResumeData({...resumeData, experience: n});
                          }}
                        >
                          {exp.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pl-3 border-l-2 border-stone-100">
                      {exp.highlights.map((bullet, bIdx) => (
                        <BulletPointEditor
                          key={bIdx}
                          value={bullet}
                          context={`${exp.position} at ${exp.company}`}
                          jobDescription={jobDescription}
                          missingKeywords={analysis?.missingKeywords || []}
                          onChange={(newVal) => {
                            const n = [...resumeData.experience];
                            n[idx].highlights[bIdx] = newVal;
                            setResumeData({ ...resumeData, experience: n });
                          }}
                          onDelete={() => {
                            const n = [...resumeData.experience];
                            n[idx].highlights.splice(bIdx, 1);
                            setResumeData({ ...resumeData, experience: n });
                          }}
                        />
                      ))}
                      <button className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center mt-3 px-2 py-1.5 rounded-lg hover:bg-brand-50 w-fit transition-colors"
                          onClick={() => {
                            const n = [...resumeData.experience]; 
                            n[idx].highlights.push(""); 
                            setResumeData({...resumeData, experience: n});
                          }}>
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Bullet
                      </button>
                    </div>
                    
                    <button className="absolute top-4 right-4 p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => {
                        const n = [...resumeData.experience]; n.splice(idx, 1); setResumeData({...resumeData, experience: n});
                      }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" className="w-full border-dashed border-stone-300 text-stone-500 hover:text-brand-600 hover:border-brand-300 bg-transparent justify-center"
                onClick={() => setResumeData({...resumeData, experience: [...resumeData.experience, {id: crypto.randomUUID(), company: "New Role", position: "", startDate: "", endDate: "", highlights: [""], location: "", visible: true}]})}>
                <Plus className="w-4 h-4 mr-2" /> Add Position
            </Button>
          </div>
        );

      case 'projects':
        return (
          <div className="p-5 bg-stone-50/50 space-y-4">
             {resumeData.projects.map((proj, idx) => (
                <div key={proj.id} 
                  draggable
                  onDragStart={(e) => handleItemDragStart(e, 'projects', idx)}
                  onDragOver={(e) => handleItemDragOver(e, 'projects', idx)}
                  onDragEnd={handleItemDragEnd}
                  className={`bg-white p-5 rounded-xl border shadow-sm relative group pl-6 transition-all ${proj.visible !== false ? 'border-stone-200 hover:border-brand-200' : 'border-stone-100 opacity-70'}`}
                >
                   <div className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-move opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity">
                      <GripVertical className="w-4 h-4 text-stone-400"/>
                   </div>
                   <div className="flex justify-between items-center mb-3">
                      <input className="bg-transparent font-bold text-sm w-full text-stone-800 outline-none focus:border-b focus:border-brand-500 transition-all placeholder-stone-300"
                        value={proj.name} placeholder="Project Name"
                        onChange={(e) => { const n=[...resumeData.projects]; n[idx].name=e.target.value; setResumeData({...resumeData, projects: n}); }} />
                      <div className="flex items-center gap-2">
                         <button 
                             className={`p-1.5 rounded-lg hover:bg-stone-100 transition-colors ${proj.visible !== false ? 'text-stone-400' : 'text-stone-300'}`}
                             onClick={() => {
                               const n = [...resumeData.projects]; n[idx].visible = proj.visible === false; setResumeData({...resumeData, projects: n});
                             }}
                          >
                            {proj.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                      </div>
                   </div>

                   {/* Dedicated Project URL Field */}
                   <div className="flex items-center gap-3 mb-4 p-2.5 bg-stone-50 rounded-lg border border-stone-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
                      <div className="p-1.5 bg-white rounded border border-stone-200 shadow-sm">
                        <LinkIcon className="w-3.5 h-3.5 text-brand-600" />
                      </div>
                      <input className="bg-transparent text-xs text-stone-700 w-full focus:outline-none font-medium placeholder-stone-400"
                        value={proj.link || ''} placeholder="Project Link (e.g. github.com/username/repo)"
                        onChange={(e) => { const n=[...resumeData.projects]; n[idx].link=e.target.value; setResumeData({...resumeData, projects: n}); }} />
                   </div>

                   <div className="mb-4">
                      <BulletPointEditor
                        value={proj.description}
                        context={proj.name}
                        jobDescription={jobDescription}
                        missingKeywords={analysis?.missingKeywords || []}
                        onChange={(newVal) => {
                          const n = [...resumeData.projects];
                          n[idx].description = newVal;
                          setResumeData({ ...resumeData, projects: n });
                        }}
                        onDelete={() => {
                           const n = [...resumeData.projects];
                           n[idx].description = "";
                           setResumeData({ ...resumeData, projects: n });
                        }}
                      />
                   </div>

                   <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Tech:</span>
                     <input className="flex-1 bg-transparent border-b border-stone-100 focus:border-brand-500 text-xs text-stone-600 focus:outline-none py-1 placeholder-stone-300"
                        value={proj.technologies.join(', ')} placeholder="React, Node.js, TypeScript..."
                        onChange={(e) => { const n=[...resumeData.projects]; n[idx].technologies=e.target.value.split(',').map(s=>s.trim()); setResumeData({...resumeData, projects: n}); }} />
                   </div>
                   
                   <button className="absolute top-3 right-8 text-stone-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                     onClick={() => { const n=[...resumeData.projects]; n.splice(idx, 1); setResumeData({...resumeData, projects: n}); }}>
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
             ))}
             <Button variant="secondary" size="sm" className="w-full border-dashed border-stone-300 text-stone-500 hover:text-brand-600 hover:border-brand-300 bg-transparent justify-center"
                onClick={() => setResumeData({...resumeData, projects: [...resumeData.projects, {id: crypto.randomUUID(), name: "New Project", description: "", technologies: [], link: "", visible: true}]})}>
                <Plus className="w-4 h-4 mr-2" /> Add Project
             </Button>
          </div>
        );

      case 'skills':
        return (
          <div className="p-5 bg-stone-50/50 space-y-4">
            {resumeData.skills.map((skill, idx) => (
              <div key={idx} 
                draggable
                onDragStart={(e) => handleItemDragStart(e, 'skills', idx)}
                onDragOver={(e) => handleItemDragOver(e, 'skills', idx)}
                onDragEnd={handleItemDragEnd}
                className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative group pl-6 hover:border-brand-200 transition-colors"
              >
                 <div className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-move opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity">
                      <GripVertical className="w-4 h-4 text-stone-400"/>
                 </div>
                 <input 
                   className="bg-transparent font-bold text-sm w-full mb-3 text-stone-800 outline-none focus:text-brand-700 placeholder-stone-300"
                   value={skill.category}
                   placeholder="Category Name"
                   onChange={(e) => {
                     const newSkills = [...resumeData.skills];
                     newSkills[idx].category = e.target.value;
                     setResumeData({...resumeData, skills: newSkills});
                   }}
                 />
                 <textarea 
                   className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-stone-600 placeholder-stone-300"
                   rows={2}
                   value={skill.keywords.join(', ')}
                   placeholder="Keywords (comma separated)"
                   onChange={(e) => {
                     const newSkills = [...resumeData.skills];
                     newSkills[idx].keywords = e.target.value.split(',').map(s => s.trim());
                     setResumeData({...resumeData, skills: newSkills});
                   }}
                 />
                  <button className="absolute top-4 right-4 text-stone-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => { const n=[...resumeData.skills]; n.splice(idx, 1); setResumeData({...resumeData, skills: n}); }}>
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
            ))}
            <Button variant="secondary" size="sm" className="w-full border-dashed border-stone-300 text-stone-500 hover:text-brand-600 hover:border-brand-300 bg-transparent justify-center"
               onClick={() => setResumeData({...resumeData, skills: [...resumeData.skills, {category: "New Category", keywords: ["Skill 1"]}]})}>
               <Plus className="w-4 h-4 mr-2" /> Add Skill Group
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Modal */}
      <AutoTailorModal 
        isOpen={isAutoTailorOpen} 
        onClose={() => setIsAutoTailorOpen(false)}
        onConfirm={handleAutoTailor}
        missingKeywords={analysis?.missingKeywords || []}
      />

      <InterviewModal 
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
        resumeData={resumeData}
        jobDescription={jobDescription}
      />
      
      <UpgradePrompt 
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature={upgradeFeature}
      />
      
      {/* Tailoring Overlay */}
      {isTailoring && (
         <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
            <div className="p-8 bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-300 to-brand-600"></div>
               <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                 <Wand2 className="w-8 h-8 text-brand-600" />
               </div>
               <h3 className="text-xl font-bold text-stone-900 mb-2 font-display">Tailoring Resume...</h3>
               <p className="text-stone-500 mb-6 font-medium text-sm">{tailorProgress}</p>
               <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-600 animate-progress origin-left rounded-full"></div>
               </div>
            </div>
         </div>
      )}

      {/* Editor Header */}
      <div className="px-6 py-4 border-b border-stone-200 bg-white/95 backdrop-blur sticky top-0 z-10 flex justify-between items-center">
        <h2 className="text-lg font-bold text-stone-800 font-display">Editor</h2>
        <div className="flex items-center gap-3">
           {/* SaaS Feature: Interview Prep */}
           <Button 
             variant="outline" 
             size="sm" 
             onClick={() => setIsInterviewModalOpen(true)} 
             icon={<Briefcase className="w-4 h-4"/>}
             className="hidden md:flex border-stone-200 text-stone-600 hover:text-brand-600 hover:border-brand-200"
           >
             Interview Prep
           </Button>

           {/* Auto Tailor Button */}
           <Button 
             variant="primary" 
             size="sm" 
             onClick={() => setIsAutoTailorOpen(true)} 
             icon={<Sparkles className="w-4 h-4"/>}
             className="hidden sm:flex bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 border-0 text-white shadow-lg shadow-brand-500/20 transition-all hover:scale-105"
           >
             One-Click Tailor
           </Button>

           <Button variant="secondary" size="sm" onClick={handleSave} icon={<Save className="w-4 h-4"/>}>
             {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
           </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6 bg-stone-50/50">
        {/* Score Card */}
        {analysis && (
          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-bl-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
            
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div>
                 <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2 font-display">
                    Match Score
                    {isAnalyzing && <RefreshCcw className="w-3.5 h-3.5 animate-spin text-brand-500" />}
                 </h3>
                 <div className="flex items-center gap-2 mt-1">
                   {isLocked ? (
                     <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100 flex items-center gap-1">
                       <Lock className="w-3 h-3" /> Keywords Locked
                     </span>
                   ) : (
                     <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                       <Unlock className="w-3 h-3" /> Unlocked
                     </span>
                   )}
                 </div>
              </div>
              
              <div className="flex items-center gap-3">
                 {/* Reset Button */}
                 <button 
                    onClick={handleUnlockAndRefresh}
                    disabled={isAnalyzing}
                    className="p-2 rounded-lg text-stone-400 hover:text-brand-600 hover:bg-brand-50 transition-colors border border-transparent hover:border-brand-100"
                    title="Unlock and re-extract keywords from Job Description"
                 >
                   <RefreshCcw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                 </button>

                 <div className={`text-4xl font-bold px-6 py-3 rounded-2xl border flex items-center justify-center shadow-sm font-display min-w-[100px]
                    ${analysis.score >= 80 ? 'text-green-600 border-green-200 bg-green-50' : 
                      analysis.score >= 60 ? 'text-yellow-600 border-yellow-200 bg-yellow-50' : 
                      'text-red-500 border-red-200 bg-red-50'}`}>
                    {analysis.score}%
                 </div>
              </div>
            </div>

            <div className="space-y-5 relative z-10">
              <div>
                <div className="flex justify-between mb-2">
                   <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Keyword Coverage</span>
                   <span className="text-xs font-bold text-stone-900">{analysis.matchedKeywords.length}/{analysis.matchedKeywords.length + analysis.missingKeywords.length} found</span>
                </div>
                <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden mb-2">
                   <div 
                     className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(118,164,101,0.3)]"
                     style={{ width: `${(analysis.matchedKeywords.length / (analysis.matchedKeywords.length + analysis.missingKeywords.length)) * 100}%` }}
                   />
                </div>
                
                {analysis.missingKeywords.length > 0 && (
                   <div className="mt-4 p-4 bg-stone-50 rounded-xl border border-stone-100">
                      <span className="text-xs font-bold text-stone-500 block mb-3 uppercase tracking-wider flex items-center gap-2">
                         <AlertCircle className="w-3.5 h-3.5" />
                         Missing Critical Keywords
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {analysis.missingKeywords.slice(0, 8).map(k => (
                          <span key={k} className="px-2.5 py-1 bg-white text-stone-600 text-xs font-medium rounded-md border border-stone-200 shadow-sm flex items-center">
                            <XCircle className="w-3 h-3 mr-1.5 text-red-400" /> {k}
                          </span>
                        ))}
                        {analysis.missingKeywords.length > 8 && (
                          <span className="px-2 py-1 text-xs text-stone-400 italic">+{analysis.missingKeywords.length - 8} more</span>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-stone-200">
                        <button onClick={() => setIsAutoTailorOpen(true)} className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center hover:underline">
                          Fix with One-Click Tailor <ArrowRight className="w-3 h-3 ml-1"/>
                        </button>
                      </div>
                   </div>
                )}
                {analysis.missingKeywords.length === 0 && (
                  <span className="text-green-600 text-sm font-bold flex items-center mt-4 bg-green-50 w-fit px-4 py-1.5 rounded-full border border-green-200">
                    <CheckCircle2 className="w-4 h-4 mr-2"/> Perfect Keyword Match!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Basics Section (Fixed) */}
        <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <SectionHeader title="Header / Contact / Summary" sectionKey="basics" />
          
          {expandedSections.has('basics') && (
            <div className="p-5 grid grid-cols-1 gap-5">
              {/* Summary Field */}
              <div className="space-y-2">
                  <div className="flex justify-between">
                      <label className="text-xs text-stone-500 font-bold flex items-center gap-2 uppercase tracking-wide">
                        <Sparkles className="w-3.5 h-3.5 text-brand-500"/>
                        Professional Summary
                      </label>
                      <button onClick={() => toggleVisibility('summary')} title="Toggle Summary Visibility" className="text-stone-400 hover:text-brand-600">
                         {resumeData.meta.visible.summary ? <Eye className="w-3.5 h-3.5 text-brand-600"/> : <EyeOff className="w-3.5 h-3.5"/>}
                      </button>
                  </div>
                  <textarea 
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm h-28 focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-stone-700 placeholder-stone-400 leading-relaxed"
                    placeholder="Write a professional summary..."
                    value={resumeData.basics.summary || ""} 
                    onChange={(e) => setResumeData({...resumeData, basics: {...resumeData.basics, summary: e.target.value}})} 
                  />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Full Name</label>
                  <input className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-stone-800 placeholder-stone-300 font-bold" 
                    value={resumeData.basics.name} onChange={(e) => setResumeData({...resumeData, basics: {...resumeData.basics, name: e.target.value}})} />
                </div>
                <div className="space-y-1.5">
                   <div className="flex justify-between">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Location</label>
                      <button onClick={() => toggleVisibility('location')} title="Toggle Location Visibility" className="text-stone-400 hover:text-brand-600">
                         {resumeData.meta.visible.location ? <Eye className="w-3.5 h-3.5 text-brand-600"/> : <EyeOff className="w-3.5 h-3.5"/>}
                      </button>
                   </div>
                  <input className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-stone-800 placeholder-stone-300" 
                    value={resumeData.basics.location} onChange={(e) => setResumeData({...resumeData, basics: {...resumeData.basics, location: e.target.value}})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Email</label>
                    <input className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-stone-800 placeholder-stone-300" 
                      value={resumeData.basics.email} onChange={(e) => setResumeData({...resumeData, basics: {...resumeData.basics, email: e.target.value}})} />
                 </div>
                 <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Phone</label>
                        <button onClick={() => toggleVisibility('phone')} title="Toggle Phone Visibility" className="text-stone-400 hover:text-brand-600">
                          {resumeData.meta.visible.phone ? <Eye className="w-3.5 h-3.5 text-brand-600"/> : <EyeOff className="w-3.5 h-3.5"/>}
                        </button>
                    </div>
                    <input className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-stone-800 placeholder-stone-300" 
                      value={resumeData.basics.phone} onChange={(e) => setResumeData({...resumeData, basics: {...resumeData.basics, phone: e.target.value}})} />
                 </div>
              </div>
              
              <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Links & Profiles</label>
                  {(resumeData.basics.profiles || []).map((profile, idx) => (
                     <div key={idx} className="flex gap-2 items-center group">
                        <input 
                          className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs w-1/3 focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-stone-800 placeholder-stone-300 font-medium" 
                          placeholder="Label (e.g. LinkedIn)"
                          value={profile.network}
                          onChange={(e) => {
                             const n = [...resumeData.basics.profiles];
                             n[idx].network = e.target.value;
                             setResumeData({...resumeData, basics: {...resumeData.basics, profiles: n}});
                          }}
                        />
                        <input 
                          className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs flex-1 focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-stone-800 placeholder-stone-300" 
                          placeholder="URL (https://...)"
                          value={profile.url}
                          onChange={(e) => {
                             const n = [...resumeData.basics.profiles];
                             n[idx].url = e.target.value;
                             setResumeData({...resumeData, basics: {...resumeData.basics, profiles: n}});
                          }}
                        />
                        <button 
                           className={`p-1.5 rounded-lg hover:bg-stone-100 transition-colors ${profile.displayUrl ? 'text-brand-600 bg-brand-50/50' : 'text-stone-400'}`}
                           onClick={() => {
                              const n = [...resumeData.basics.profiles];
                              n[idx].displayUrl = !n[idx].displayUrl;
                              setResumeData({...resumeData, basics: {...resumeData.basics, profiles: n}});
                           }}
                           title={profile.displayUrl ? "Showing URL in preview" : "Showing Label in preview"}
                        >
                           {profile.displayUrl ? <LinkIcon className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                        </button>
                        <button className="text-stone-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                           onClick={() => {
                              const n = [...resumeData.basics.profiles];
                              n.splice(idx, 1);
                              setResumeData({...resumeData, basics: {...resumeData.basics, profiles: n}});
                           }}
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  ))}
                  <Button variant="secondary" size="sm" className="w-full border-dashed border-stone-300 text-stone-500 hover:text-brand-600 hover:border-brand-300 bg-transparent justify-center"
                     onClick={() => setResumeData({
                        ...resumeData, 
                        basics: {
                           ...resumeData.basics, 
                           profiles: [...(resumeData.basics.profiles || []), { network: "", url: "", displayUrl: false }]
                        }
                     })}
                  >
                     <Plus className="w-3.5 h-3.5 mr-2" /> Add Link
                  </Button>
              </div>
            </div>
          )}
        </div>

        {/* Draggable Sections */}
        {resumeData.meta.sectionOrder.map((sectionKey) => (
          <div key={sectionKey} className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <SectionHeader 
              title={sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} 
              sectionKey={sectionKey} 
              visibleKey={sectionKey as keyof ResumeSchema['meta']['visible']} 
              dragHandle={true}
            />
            {expandedSections.has(sectionKey) && renderSectionContent(sectionKey)}
          </div>
        ))}

      </div>
    </div>
  );
};