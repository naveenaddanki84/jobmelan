'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PLACEHOLDER_JOB_DESC } from '@/lib/constants';
import { fetchJobDescriptionFromUrl, parseResumeToJSON } from '@/actions/ai-actions';
import { saveResume, getResumes } from '@/actions/resume-actions';
import { extractTextFromFile } from '@/services/fileParser';
import { OptimizeStatus, ResumeSchema } from '@/types';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Search, AlertCircle, Link as LinkIcon, Upload, FileText, ExternalLink, ArrowRight, Sparkles } from 'lucide-react';

const BriefcaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);

export default function HomePage() {
  const router = useRouter();
  
  // Data State
  const [jobDesc, setJobDesc] = useState(PLACEHOLDER_JOB_DESC);
  const [jobUrl, setJobUrl] = useState('');
  const [jobSource, setJobSource] = useState<string | undefined>(undefined);
  const [rawResumeText, setRawResumeText] = useState('');
  const [hasSavedResume, setHasSavedResume] = useState(false);
  
  // UI State
  const [status, setStatus] = useState<OptimizeStatus>(OptimizeStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check for saved resume on mount
  useEffect(() => {
    const checkSavedResumes = async () => {
      try {
        const resumes = await getResumes();
        if (resumes.length > 0) {
          setHasSavedResume(true);
        } else {
          // Fallback to localStorage for backward compatibility
          const saved = localStorage.getItem('savedResume');
          if (saved) setHasSavedResume(true);
        }
      } catch (error) {
        // Fallback to localStorage
        const saved = localStorage.getItem('savedResume');
        if (saved) setHasSavedResume(true);
      }
    };
    checkSavedResumes();
  }, []);

  const handleLoadSaved = async () => {
    try {
      const resumes = await getResumes();
      if (resumes.length > 0) {
        // Navigate to most recent resume
        router.push(`/editor/${resumes[0].id}`);
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('savedResume');
        if (saved) {
          try {
            const resumeData = JSON.parse(saved);
            const resumeId = crypto.randomUUID();
            localStorage.setItem(`resume_${resumeId}`, saved);
            router.push(`/editor/${resumeId}`);
          } catch (e) {
            console.error("Failed to load saved resume");
            setHasSavedResume(false);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load resumes:", error);
    }
  };

  const handleFetchJob = async () => {
    if (!jobUrl) return;
    setStatus(OptimizeStatus.FETCHING_JOB);
    setErrorMsg(null);
    try {
      const { text, source } = await fetchJobDescriptionFromUrl(jobUrl);
      setJobDesc(text);
      setJobSource(source);
      setStatus(OptimizeStatus.IDLE);
    } catch (e) {
      console.error(e);
      setErrorMsg("Could not auto-parse this link. Please paste the job description text directly.");
      setStatus(OptimizeStatus.ERROR);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);

    // If JSON, load directly
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
       const text = await file.text();
       try {
         const resumeData = JSON.parse(text);
         // Save to database
         try {
           const savedResume = await saveResume(resumeData, file.name.replace('.json', ''));
           router.push(`/editor/${savedResume.id}`);
         } catch (error) {
           // Fallback to localStorage
           const resumeId = crypto.randomUUID();
           localStorage.setItem(`resume_${resumeId}`, text);
           router.push(`/editor/${resumeId}`);
         }
         return;
       } catch (e) {
         setErrorMsg("Invalid JSON file");
         return;
       }
    }

    // Otherwise try to extract text
    try {
      setStatus(OptimizeStatus.PARSING_RESUME);
      const text = await extractTextFromFile(file);
      setRawResumeText(text);
      setStatus(OptimizeStatus.IDLE);
    } catch (e) {
      console.error(e);
      setErrorMsg(e instanceof Error ? e.message : "Failed to read file");
      setStatus(OptimizeStatus.ERROR);
    }
  };

  const handleStartEditing = async () => {
    if (!rawResumeText || !jobDesc) {
      setErrorMsg("Both Resume Text and Job Description are required.");
      return;
    }

    setStatus(OptimizeStatus.PARSING_RESUME);
    setErrorMsg(null);

    try {
      const parsedData = await parseResumeToJSON(rawResumeText);
      
      // Save to database
      try {
        const savedResume = await saveResume(parsedData, "My Resume");
        const resumeId = savedResume.id;
        
        // Save job description to localStorage for now (could be stored in DB later)
        localStorage.setItem(`jobDesc_${resumeId}`, jobDesc);
        
        router.push(`/editor/${resumeId}`);
      } catch (error) {
        // Fallback to localStorage for error cases
        console.error("Failed to save to database:", error);
        const resumeId = crypto.randomUUID();
        localStorage.setItem(`resume_${resumeId}`, JSON.stringify(parsedData));
        localStorage.setItem(`jobDesc_${resumeId}`, jobDesc);
        router.push(`/editor/${resumeId}`);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to parse resume. Please try again.");
      setStatus(OptimizeStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans selection:bg-brand-200 selection:text-brand-900 flex flex-col">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Ambient Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-brand-100/40 blur-3xl"></div>
          <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-stone-200/40 blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-12 w-full relative z-10">
          <div className="text-center mb-14 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-stone-200 shadow-sm mb-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Intelligent Career Alignment</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-stone-900 font-display tracking-tight leading-tight">
              Match. Merge. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">Align.</span>
          </h1>
            <p className="text-stone-500 text-xl max-w-2xl mx-auto font-light leading-relaxed">
              JOBMÉLAN bridges the gap between your experience and your dream role. Seamlessly align your resume with market demands in seconds.
          </p>
        </div>

          {/* Saved Resume Alert */}
          {hasSavedResume && (
            <div className="max-w-md mx-auto mb-10 bg-white border border-brand-200 shadow-lg shadow-brand-100/50 p-4 rounded-2xl flex items-center justify-between hover:border-brand-300 transition-colors cursor-pointer" onClick={handleLoadSaved}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-stone-900 font-bold">Draft Found</span>
                  <span className="text-xs text-stone-500">Continue where you left off</span>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-brand-600 hover:bg-brand-50">
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Job Description Column */}
            <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-xl shadow-stone-200/40 hover:shadow-2xl hover:shadow-stone-200/60 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-stone-900 font-display flex items-center gap-3">
                  <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                    <BriefcaseIcon className="w-5 h-5" />
                  </div>
                  Target Job
                </h2>
                {jobSource && (
                  <a href={jobSource} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline flex items-center font-medium">
                    <ExternalLink className="w-3 h-3 mr-1" /> Source
                  </a>
                )}
              </div>

              {/* URL Input */}
              <div className="flex gap-2 mb-5">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-stone-400 group-focus-within:text-brand-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 bg-stone-50 border-stone-200 rounded-xl text-sm text-stone-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder-stone-400 transition-all py-2.5"
                    placeholder="Paste Job Posting URL..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchJob()}
                  />
                </div>
                <Button 
                  variant="secondary" 
                  onClick={handleFetchJob} 
                  disabled={!jobUrl}
                  isLoading={status === OptimizeStatus.FETCHING_JOB}
                  className="rounded-xl"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              <textarea
                className="w-full h-72 bg-stone-50 border-stone-200 rounded-xl p-4 text-sm text-stone-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none font-mono leading-relaxed border"
                placeholder="Or paste job description text here..."
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
              />
            </div>

            {/* Resume Input Column */}
            <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-xl shadow-stone-200/40 hover:shadow-2xl hover:shadow-stone-200/60 transition-all duration-300 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-stone-900 font-display flex items-center gap-3">
                  <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  Your Resume
                </h2>
                <label className="cursor-pointer group">
                  <input type="file" className="hidden" accept=".txt,.json,.pdf,.docx" onChange={handleFileUpload} />
                  <span className="flex items-center text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100 group-hover:bg-brand-100 transition-colors">
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload PDF/DOCX
                  </span>
                </label>
              </div>
              
              <textarea
                className="w-full flex-1 min-h-[280px] bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm text-stone-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none font-mono mb-6 leading-relaxed"
                placeholder="Paste resume text or upload file..."
                value={rawResumeText}
                onChange={(e) => setRawResumeText(e.target.value)}
              />

              {errorMsg && (
                <div className="mb-4 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}
              
              <Button 
                size="lg" 
                className="w-full shadow-xl shadow-brand-500/20 py-4 text-base rounded-xl"
                onClick={handleStartEditing}
                isLoading={status === OptimizeStatus.PARSING_RESUME}
              >
                {status === OptimizeStatus.PARSING_RESUME ? 'Analyzing & Parsing...' : 'Start Tailoring Resume'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
