'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PLACEHOLDER_JOB_DESC } from '@/lib/constants';
import { fetchJobDescriptionFromUrl } from '@/actions/ai-actions';
import { getResumes } from '@/actions/resume-actions';
import { OptimizeStatus } from '@/types';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Search, AlertCircle, Link as LinkIcon, ExternalLink, ArrowRight, Sparkles, FileText, ChevronDown, Check } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { DocumentCreationModal } from '@/components/profile/DocumentCreationModal';

const BriefcaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

export default function HomePage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  // Data State
  const [jobDesc, setJobDesc] = useState(PLACEHOLDER_JOB_DESC);
  const [jobUrl, setJobUrl] = useState('');
  const [jobSource, setJobSource] = useState<string | undefined>(undefined);
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  // UI State
  const [status, setStatus] = useState<OptimizeStatus>(OptimizeStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showResumeDropdown, setShowResumeDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Check for job description from URL params or storage (from extension)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const jobDescKey = urlParams.get('jobDescKey'); // Storage key from extension
    const jobDescParam = urlParams.get('jobDesc'); // Direct param (backward compatibility)
    
    // Function to check and set job description
    const checkAndSetJobDesc = () => {
      // Priority 1: Check localStorage (populated by content script from Chrome storage)
      const pendingJobDesc = localStorage.getItem('pendingJobDesc');
      if (pendingJobDesc && pendingJobDesc !== PLACEHOLDER_JOB_DESC) {
        setJobDesc(pendingJobDesc);
        return;
      }
      
      // Priority 2: Check for direct URL param
      if (jobDescParam) {
        try {
          let decoded: string;
          try {
            decoded = decodeURIComponent(jobDescParam);
          } catch (e) {
            try {
              decoded = decodeURIComponent(jobDescParam.replace(/\+/g, ' '));
            } catch (e2) {
              decoded = jobDescParam;
            }
          }
          setJobDesc(decoded);
          localStorage.setItem('pendingJobDesc', decoded);
        } catch (e) {
          console.error('Failed to decode job description from URL:', e);
        }
      }
    };
    
    // Check immediately
    checkAndSetJobDesc();
    
    // Also listen for custom event from content script
    const handleJobDescLoaded = (event: CustomEvent) => {
      if (event.detail?.jobDesc) {
        setJobDesc(event.detail.jobDesc);
      }
    };
    
    window.addEventListener('jobDescLoaded', handleJobDescLoaded as EventListener);
    
    // Also check periodically in case content script runs after React mounts
    const interval = setInterval(() => {
      const pendingJobDesc = localStorage.getItem('pendingJobDesc');
      if (pendingJobDesc && pendingJobDesc !== PLACEHOLDER_JOB_DESC && jobDesc === PLACEHOLDER_JOB_DESC) {
        setJobDesc(pendingJobDesc);
        clearInterval(interval);
      }
    }, 100);
    
    // Clean up after 5 seconds
    setTimeout(() => clearInterval(interval), 5000);
    
    return () => {
      window.removeEventListener('jobDescLoaded', handleJobDescLoaded as EventListener);
      clearInterval(interval);
    };
  }, []);

  // Check for saved resumes on mount
  useEffect(() => {
    const checkResumes = async () => {
      if (!isSignedIn || !isLoaded) return;

      try {
        const savedResumes = await getResumes();

        if (savedResumes.length === 0) {
          // Redirect to onboarding if no resumes
          router.push('/onboarding');
          return;
        }

        setResumes(savedResumes);

        // Select default or first
        const defaultResume = savedResumes.find((r: any) => r.isDefault) || savedResumes[0];
        setSelectedResumeId(defaultResume.id);

      } catch (error) {
        console.error("Failed to load resumes:", error);
      }
    };

    if (isLoaded && isSignedIn) {
      checkResumes();
    }
  }, [isLoaded, isSignedIn, router]);

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

  const handleStartTailoring = async () => {
    if (!selectedResumeId || !jobDesc) {
      setErrorMsg("Please select a resume and provide a job description.");
      return;
    }

    // Save job description to localStorage for the editor to pick up
    localStorage.setItem(`jobDesc_${selectedResumeId}`, jobDesc);

    // Navigate to editor
    router.push(`/editor/${selectedResumeId}`);
  };

  const selectedResume = resumes.find(r => r.id === selectedResumeId);

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
              Match. Merge. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">Align.</span>
            </h1>
            <p className="text-stone-500 text-xl max-w-2xl mx-auto font-light leading-relaxed">
              JOBMÉLAN bridges the gap between your experience and your dream role. Seamlessly align your resume with market demands in seconds.
            </p>
          </div>

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

            {/* Resume Selection Column */}
            <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-xl shadow-stone-200/40 hover:shadow-2xl hover:shadow-stone-200/60 transition-all duration-300 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-stone-900 font-display flex items-center gap-3">
                  <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  Your Resume
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-brand-600"
                  onClick={() => router.push('/dashboard')}
                >
                  Manage Resumes
                </Button>
              </div>

              {/* Resume Selector */}
              <div className="flex-1 flex flex-col justify-center">
                {!isSignedIn ? (
                  <div className="text-center space-y-4 p-8 bg-stone-50 rounded-2xl border border-stone-200">
                    <p className="text-stone-500">Sign in to manage your resumes and start tailoring.</p>
                    <Button onClick={() => router.push('/sign-in')} className="w-full">Sign In</Button>
                  </div>
                ) : resumes.length === 0 ? (
                  <div className="text-center space-y-4 p-8 bg-stone-50 rounded-2xl border border-stone-200">
                    <p className="text-stone-500">No resumes found.</p>
                    <Button onClick={() => router.push('/onboarding')} className="w-full">Create Resume</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-stone-700">Select Resume to Tailor</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowResumeDropdown(!showResumeDropdown)}
                        className="w-full flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl hover:border-brand-300 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg border border-stone-200 flex items-center justify-center text-stone-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-stone-900">{selectedResume?.title || "Select Resume"}</div>
                            <div className="text-xs text-stone-500">
                              {selectedResume?.isDefault ? 'Default Resume' : `Last updated: ${new Date(selectedResume?.updatedAt).toLocaleDateString()}`}
                            </div>
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5 text-stone-400" />
                      </button>

                      {/* Dropdown */}
                      {showResumeDropdown && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-stone-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
                          {resumes.map(resume => (
                            <button
                              key={resume.id}
                              onClick={() => {
                                setSelectedResumeId(resume.id);
                                setShowResumeDropdown(false);
                              }}
                              className="w-full flex items-center justify-between p-3 hover:bg-stone-50 transition-colors text-left border-b border-stone-100 last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedResumeId === resume.id ? 'bg-brand-100 text-brand-600' : 'bg-stone-100 text-stone-400'}`}>
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-medium text-stone-900 text-sm">{resume.title}</div>
                                  {resume.isDefault && <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded border border-brand-100">Default</span>}
                                </div>
                              </div>
                              {selectedResumeId === resume.id && <Check className="w-4 h-4 text-brand-600" />}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setShowResumeDropdown(false);
                              setShowCreateModal(true);
                            }}
                            className="w-full p-3 text-center text-sm text-brand-600 font-medium hover:bg-brand-50 transition-colors border-t border-stone-100"
                          >
                            + Create New Resume
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="mt-4 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              <div className="mt-8">
                <Button
                  size="lg"
                  className="w-full shadow-xl shadow-brand-500/20 py-4 text-base rounded-xl"
                  onClick={handleStartTailoring}
                  disabled={!selectedResumeId}
                >
                  Start Tailoring Resume <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Document Creation Modal */}
      <DocumentCreationModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          // Refresh resumes after creating
          const refreshResumes = async () => {
            try {
              const savedResumes = await getResumes();
              setResumes(savedResumes);
              if (savedResumes.length > 0) {
                const defaultResume = savedResumes.find((r: any) => r.isDefault) || savedResumes[0];
                setSelectedResumeId(defaultResume.id);
              }
            } catch (error) {
              console.error("Failed to refresh resumes:", error);
            }
          };
          refreshResumes();
        }}
      />
    </div>
  );
}
