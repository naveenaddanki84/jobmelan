'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { JobSearch } from '@/components/JobSearch';
import { JobPosting, ResumeSchema } from '@/types';
import { getResumes } from '@/actions/resume-actions';
import { saveJobApplication, getJobApplications } from '@/actions/job-actions';
import { saveResume } from '@/actions/resume-actions';

export default function SearchPage() {
  const router = useRouter();
  const [resumeData, setResumeData] = useState<ResumeSchema | null>(null);

  useEffect(() => {
    // Try to load saved resume from database
    const loadResume = async () => {
      try {
        const resumes = await getResumes();
        if (resumes.length > 0) {
          // Load the most recent resume's content
          // Note: This would ideally load the full resume content
          // For now, we'll fallback to localStorage
          const saved = localStorage.getItem('savedResume');
          if (saved) {
            try {
              setResumeData(JSON.parse(saved));
            } catch (e) {
              console.error("Failed to load saved resume");
            }
          }
        } else {
          // Fallback to localStorage
          const saved = localStorage.getItem('savedResume');
          if (saved) {
            try {
              setResumeData(JSON.parse(saved));
            } catch (e) {
              console.error("Failed to load saved resume");
            }
          }
        }
      } catch (error) {
        console.error("Failed to load resumes:", error);
        // Fallback to localStorage
        const saved = localStorage.getItem('savedResume');
        if (saved) {
          try {
            setResumeData(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to load saved resume");
          }
        }
      }
    };
    loadResume();
  }, []);

  const handleSaveJobToTracker = async (job: JobPosting) => {
    try {
      // Check for duplicates
      const existingJobs = await getJobApplications();
      if (existingJobs.some(j => j.company === job.company && j.position === job.title)) {
        alert('Job already in tracker!');
        return;
      }

      await saveJobApplication({
        company: job.company,
        position: job.title,
        status: 'wishlist',
        url: job.url,
        salary: job.salary,
      });
      alert('Job saved to Tracker (Wishlist)!');
    } catch (error) {
      console.error("Failed to save job:", error);
      // Fallback to localStorage
      const savedJobs = localStorage.getItem('rolecraft_jobs');
      const currentJobs = savedJobs ? JSON.parse(savedJobs) : [];
      
      if (currentJobs.some((j: any) => j.company === job.company && j.position === job.title)) {
        alert('Job already in tracker!');
        return;
      }

      const newApplication = {
        id: crypto.randomUUID(),
        company: job.company,
        position: job.title,
        status: 'wishlist',
        dateAdded: new Date().toISOString().split('T')[0],
        url: job.url,
        salary: job.salary
      };

      localStorage.setItem('rolecraft_jobs', JSON.stringify([...currentJobs, newApplication]));
      alert('Job saved to Tracker (Wishlist)!');
    }
  };

  const handleTailorJob = async (job: JobPosting) => {
    // Construct a rich text description from the job object
    const fullDesc = `
Role: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary}

Job Description:
${job.description}

Requirements:
${job.requirements?.map(r => `- ${r}`).join('\n') || ''}
    `.trim();

    // Save job description and navigate to editor
    if (resumeData) {
      try {
        // Save resume to database if not already saved
        const savedResume = await saveResume(resumeData, "My Resume");
        const resumeId = savedResume.id;
        localStorage.setItem(`jobDesc_${resumeId}`, fullDesc);
        router.push(`/editor/${resumeId}`);
      } catch (error) {
        console.error("Failed to save resume:", error);
        // Fallback to localStorage
        const resumeId = crypto.randomUUID();
        localStorage.setItem(`resume_${resumeId}`, JSON.stringify(resumeData));
        localStorage.setItem(`jobDesc_${resumeId}`, fullDesc);
        router.push(`/editor/${resumeId}`);
      }
    } else {
      // No resume yet, go to onboarding with pre-filled job description
      localStorage.setItem('pendingJobDesc', fullDesc);
      router.push('/?jobDesc=' + encodeURIComponent(fullDesc));
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans selection:bg-brand-200 selection:text-brand-900 flex flex-col">
      <Navbar />
      <main className="flex-1 flex overflow-hidden relative">
        <div className="w-full h-full relative z-10">
          <JobSearch 
            onSaveJob={handleSaveJobToTracker} 
            resumeData={resumeData}
            onTailorJob={handleTailorJob}
          />
        </div>
      </main>
    </div>
  );
}

