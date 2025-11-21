'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ResumeEditor } from '@/components/ResumeEditor';
import { ResumePreview } from '@/components/ResumePreview';
import { CoverLetterModal } from '@/components/CoverLetterModal';
import { ResumeSchema } from '@/types';
import { PLACEHOLDER_JOB_DESC } from '@/lib/constants';
import { getResumeById } from '@/actions/resume-actions';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const resumeId = params.id as string;
  
  const [resumeData, setResumeData] = useState<ResumeSchema | null>(null);
  const [jobDesc, setJobDesc] = useState(PLACEHOLDER_JOB_DESC);
  const [isCoverLetterOpen, setIsCoverLetterOpen] = useState(false);

  useEffect(() => {
    // Load resume data from database
    const loadResume = async () => {
      try {
        const resume = await getResumeById(resumeId);
        setResumeData(resume.content);
        // Note: Job description would ideally be stored with the resume or passed as query param
        // For now, keeping the placeholder
      } catch (error) {
        console.error("Failed to load resume:", error);
        // Fallback to localStorage for backward compatibility during migration
        const savedResume = localStorage.getItem(`resume_${resumeId}`);
        const savedJobDesc = localStorage.getItem(`jobDesc_${resumeId}`);
        
        if (savedResume) {
          try {
            setResumeData(JSON.parse(savedResume));
            if (savedJobDesc) {
              setJobDesc(savedJobDesc);
            }
          } catch (e) {
            router.push('/');
          }
        } else {
          router.push('/');
        }
      }
    };

    loadResume();
  }, [resumeId, router]);

  const handleSaveResume = (data: ResumeSchema) => {
    setResumeData(data);
    // Resume is saved via ResumeEditor's handleSave function
    // This just updates local state
  };

  if (!resumeData) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans selection:bg-brand-200 selection:text-brand-900 flex flex-col">
      {/* Modals */}
      <CoverLetterModal 
        isOpen={isCoverLetterOpen}
        onClose={() => setIsCoverLetterOpen(false)}
        resumeData={resumeData}
        jobDescription={jobDesc}
      />

      <Navbar />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative z-10">
        {/* Left: Editor (40%) */}
        <div className="w-full lg:w-[45%] border-r border-stone-200 bg-stone-50 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
          <ResumeEditor 
            resumeData={resumeData} 
            setResumeData={handleSaveResume} 
            jobDescription={jobDesc}
            resumeId={resumeId}
          />
        </div>

        {/* Right: Preview (60%) */}
        <div className="hidden lg:flex flex-1 bg-stone-200/50 justify-center overflow-hidden relative">
          <div className="w-full h-full relative z-10">
            <ResumePreview resumeData={resumeData} />
          </div>
        </div>
      </main>
    </div>
  );
}

