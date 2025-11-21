'use client';

import React from 'react';
import { JobPosting } from '@/types';
import { Button } from './Button';
import { MapPin, Clock, Banknote, Sparkles, ExternalLink, ThumbsUp, Ban, BookmarkPlus } from 'lucide-react';

interface JobCardProps {
  job: JobPosting;
  onSave?: (job: JobPosting) => void;
  onClick?: () => void;
  isActive?: boolean;
  compact?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onSave, onClick, isActive, compact = false }) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 border-emerald-200 bg-emerald-50';
    if (score >= 70) return 'text-brand-600 border-brand-200 bg-brand-50';
    return 'text-yellow-600 border-yellow-200 bg-yellow-50';
  };

  return (
    <div 
      onClick={onClick}
      className={`group relative bg-white rounded-xl border transition-all duration-200 overflow-hidden flex flex-col cursor-pointer
        ${isActive 
          ? 'border-brand-500 shadow-md ring-1 ring-brand-500/20 bg-brand-50/10' 
          : 'border-stone-200 hover:border-brand-300 hover:shadow-md'
        }`}
    >
      
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
           <div className="flex gap-3">
             <div className="w-10 h-10 rounded-lg bg-white shrink-0 overflow-hidden border border-stone-200 shadow-sm">
               {job.logo ? (
                 <img src={job.logo} alt={job.company} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold">
                   {job.company.substring(0, 2)}
                 </div>
               )}
             </div>
             <div>
               <h3 className={`font-bold text-stone-900 font-display leading-tight line-clamp-1 ${compact ? 'text-sm' : 'text-base'}`}>
                 {job.title}
               </h3>
               <div className="text-xs text-stone-500 font-medium mt-0.5">
                 {job.company}
               </div>
             </div>
           </div>
           
           {/* Match Score Badge */}
           {job.matchScore && (
             <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${getScoreColor(job.matchScore)}`}>
               <Sparkles className="w-2.5 h-2.5" />
               {job.matchScore}%
             </div>
           )}
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-y-1 gap-x-3 text-[10px] text-stone-500 mb-3">
           <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {job.location}
           </span>
           <span className="flex items-center gap-1">
              <Banknote className="w-3 h-3" /> {job.salary}
           </span>
           <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {job.postedAt}
           </span>
        </div>

        {/* Tags (Only first 2 in compact mode) */}
        <div className="flex flex-wrap gap-1.5">
           {job.tags.slice(0, compact ? 2 : 4).map((tag, i) => (
             <span key={i} className="text-[9px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
               {tag}
             </span>
           ))}
           {compact && job.tags.length > 2 && (
             <span className="text-[9px] text-stone-400 py-0.5">+{job.tags.length - 2}</span>
           )}
        </div>
      </div>
    </div>
  );
};

