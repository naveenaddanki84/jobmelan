'use client';

import React from 'react';
import { JobPosting } from '@/types';
import { Button } from './Button';
import { BookmarkPlus, Share2, Flag, Building2, MapPin, Globe, Users, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface JobDetailViewProps {
  job: JobPosting | null;
  onSave: (job: JobPosting) => void;
  onTailor: (job: JobPosting) => void;
}

export const JobDetailView: React.FC<JobDetailViewProps> = ({ job, onSave, onTailor }) => {
  if (!job) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50/50">
        <Building2 className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Select a job to view details</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      
      {/* Hero Header */}
      <div className="p-8 border-b border-stone-100 bg-gradient-to-br from-white to-stone-50">
        <div className="flex items-start justify-between gap-4 mb-6">
           <div className="w-16 h-16 rounded-xl bg-white border border-stone-200 shadow-sm overflow-hidden">
             <img src={job.logo} alt={job.company} className="w-full h-full object-cover" />
           </div>
           <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<Share2 className="w-4 h-4"/>}>Share</Button>
              <Button variant="secondary" size="sm" icon={<BookmarkPlus className="w-4 h-4"/>} onClick={() => onSave(job)}>Save</Button>
           </div>
        </div>
        
        <h1 className="text-2xl font-bold text-stone-900 font-display mb-2">{job.title}</h1>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 mb-6">
           <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> 
              <span className="font-semibold text-stone-700">{job.company}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> {job.location}
           </div>
           <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {job.type}
           </div>
        </div>

        <div className="flex gap-3">
           {/* Feature 1: Tailor Button */}
           <Button 
             className="flex-1 shadow-lg shadow-brand-500/20 py-3 text-base" 
             onClick={() => onTailor(job)}
             icon={<Sparkles className="w-4 h-4"/>}
           >
             Tailor Resume for this Job
           </Button>
           <Button 
             variant="secondary" 
             className="flex-1"
             onClick={() => window.open(job.url, '_blank')}
            >
              Apply Directly
            </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
         <div className="p-8 space-y-8">
            
            {/* AI Analysis Card */}
            <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                     AI Match Analysis
                  </h3>
                  <span className="text-2xl font-bold text-brand-600 font-display">{job.matchScore}%</span>
               </div>
               
               <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm text-stone-600">
                     <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                     <p>Your experience is a strong match for the <span className="font-semibold">core technologies</span> required.</p>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-stone-600">
                     <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                     <p>Location preference aligns with <span className="font-semibold">{job.location}</span>.</p>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-stone-600">
                     <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                     <p>Tip: Tailor your resume to emphasize specific <span className="font-semibold">leadership</span> examples mentioned in the JD.</p>
                  </div>
               </div>
            </div>

            {/* Description */}
            <div>
               <h3 className="text-lg font-bold text-stone-900 font-display mb-3">About the Role</h3>
               <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>

            {/* Requirements */}
            {job.requirements && (
               <div>
                  <h3 className="text-lg font-bold text-stone-900 font-display mb-3">Requirements</h3>
                  <ul className="space-y-2">
                     {job.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-3 text-stone-600">
                           <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0"></div>
                           <span className="leading-relaxed">{req}</span>
                        </li>
                     ))}
                  </ul>
               </div>
            )}

            {/* Company Info */}
            <div className="border-t border-stone-100 pt-8">
               <h3 className="text-lg font-bold text-stone-900 font-display mb-4">About {job.company}</h3>
               <div className="flex items-center gap-6 text-sm text-stone-500 mb-4">
                  <span className="flex items-center gap-2">
                     <Globe className="w-4 h-4" /> {job.company.toLowerCase().replace(/\s/g, '')}.com
                  </span>
                  <span className="flex items-center gap-2">
                     <Flag className="w-4 h-4" /> Founded 2015
                  </span>
                  <span className="flex items-center gap-2">
                     <Users className="w-4 h-4" /> 500-1000 Employees
                  </span>
               </div>
               <p className="text-sm text-stone-500 leading-relaxed">
                  {job.company} is a leading technology company focused on building the future of software. 
                  We value innovation, ownership, and work-life balance.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

