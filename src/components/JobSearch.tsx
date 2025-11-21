'use client';

import React, { useState, useEffect, useRef } from 'react';
import { JobPosting, ResumeSchema } from '@/types';
import { searchJobsMock, generateSingleJob } from '@/services/mockJobService';
import { JobCard } from './JobCard';
import { JobDetailView } from './JobDetailView';
import { Search, MapPin, SlidersHorizontal, Sparkles, Radio, Wifi, DollarSign, Clock, Check } from 'lucide-react';
import { Button } from './Button';

interface JobSearchProps {
  onSaveJob: (job: JobPosting) => void;
  onTailorJob: (job: JobPosting) => void;
  resumeData: ResumeSchema | null;
}

type FilterType = 'remote' | 'highSalary' | 'recent';

export const JobSearch: React.FC<JobSearchProps> = ({ onSaveJob, onTailorJob, resumeData }) => {
  // State
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  
  // Feature 2: Resume Match State
  const [isResumeMatch, setIsResumeMatch] = useState(false);

  // Feature 3: Filter State
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());

  // Refs
  const listRef = useRef<HTMLDivElement>(null);

  // Initial fetch
  useEffect(() => {
    handleSearch();
  }, []);

  // Filter Logic Effect
  useEffect(() => {
    let result = [...jobs];

    // 1. Resume Match Filter (Simple Simulation)
    if (isResumeMatch && resumeData) {
        // In a real app, we would re-query backend with vector embeddings.
        // Here, we just simulate by boosting score or filtering.
        // Let's filter to ensure we see relevant results if possible.
        const topSkills = resumeData.skills.flatMap(s => s.keywords).slice(0, 5).map(s => s.toLowerCase());
        if (topSkills.length > 0) {
            // Just sort by match score for simulation, as our mock data match score is random but "realistic"
            result.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        }
    }

    // 2. Smart Facets
    if (activeFilters.has('remote')) {
        result = result.filter(j => j.location.toLowerCase().includes('remote') || j.tags.includes('Remote'));
    }
    if (activeFilters.has('highSalary')) {
        // Rough parsing of "$120k - $180k"
        result = result.filter(j => {
            const match = j.salary?.match(/(\d+)/); // matches first number
            return match ? parseInt(match[0]) >= 150 : false;
        });
    }
    if (activeFilters.has('recent')) {
        result = result.filter(j => j.postedAt === 'Just now' || j.postedAt.includes('hour') || j.postedAt.includes('min'));
    }

    setFilteredJobs(result);
  }, [jobs, activeFilters, isResumeMatch, resumeData]);

  // Real-time Simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        const newJob = generateSingleJob();
        newJob.postedAt = "Just now";
        setJobs(prev => [newJob, ...prev]); 
      }, 12000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      // If Resume Match is ON, maybe inject skill into query if query is empty
      let effectiveQuery = query;
      if (isResumeMatch && !query && resumeData) {
         const topCategory = resumeData.skills[0]?.category || "Software";
         effectiveQuery = topCategory; // Simulate searching for "Frontend" or "Engineering"
      }

      const results = await searchJobsMock(effectiveQuery);
      setJobs(results);
      if (results.length > 0) setSelectedJobId(results[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFilter = (filter: FilterType) => {
    const next = new Set(activeFilters);
    if (next.has(filter)) next.delete(filter);
    else next.add(filter);
    setActiveFilters(next);
  };

  const toggleResumeMatch = () => {
      if (!resumeData) {
          alert("Please upload or create a resume first!");
          return;
      }
      setIsResumeMatch(!isResumeMatch);
      // Optionally trigger search immediately
      if (!isResumeMatch) { // Turning ON
          // Clear query to show "pure" matches? Or keep query?
          // Let's keep query but re-sort
      }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;

  return (
    <div className="flex flex-col h-full bg-stone-50">
      {/* Header / Filter Bar */}
      <div className="bg-white border-b border-stone-200 px-6 py-4 shrink-0 z-20 shadow-sm transition-all">
        <div className="max-w-[1800px] mx-auto w-full">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-stone-900 font-display">Job Feed</h1>
                
                <div 
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-all ${isLive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-stone-100 border-stone-200 text-stone-500'}`}
                  onClick={() => setIsLive(!isLive)}
                >
                  <span className={`relative flex h-2 w-2`}>
                    {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-green-500' : 'bg-stone-400'}`}></span>
                  </span>
                  {isLive ? 'LIVE UPDATES' : 'PAUSED'}
                </div>
              </div>

              {/* Feature 2: Match My Resume Toggle */}
              <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider hidden sm:block">Rank by:</span>
                  <button 
                    onClick={toggleResumeMatch}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        isResumeMatch 
                        ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' 
                        : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                     <Sparkles className={`w-3.5 h-3.5 ${isResumeMatch ? 'fill-brand-200' : ''}`} />
                     {isResumeMatch ? 'Matching Your Resume' : 'Match My Resume'}
                  </button>
              </div>
           </div>

           {/* Search & Filters */}
           <div className="space-y-3">
                <div className="flex gap-2">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-brand-500" />
                        <input 
                            type="text" 
                            placeholder={isResumeMatch ? "Search within matches..." : "Search jobs..."}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div className="w-48 relative group hidden md:block">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-brand-500" />
                        <input 
                            type="text" 
                            placeholder="Location"
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                    </div>
                    <Button 
                        variant="secondary" 
                        className="px-3 bg-brand-600 text-white border-brand-600 hover:bg-brand-700 hover:text-white" 
                        onClick={handleSearch}
                    >
                        Search
                    </Button>
                </div>

                {/* Feature 3: Smart Filters */}
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => toggleFilter('remote')}
                        className={`px-3 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                            activeFilters.has('remote') 
                            ? 'bg-stone-800 text-white border-stone-800' 
                            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                        }`}
                    >
                        {activeFilters.has('remote') && <Check className="w-3 h-3" />}
                        <Wifi className="w-3 h-3" /> Remote Only
                    </button>
                    <button 
                        onClick={() => toggleFilter('highSalary')}
                        className={`px-3 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                            activeFilters.has('highSalary') 
                            ? 'bg-stone-800 text-white border-stone-800' 
                            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                        }`}
                    >
                        {activeFilters.has('highSalary') && <Check className="w-3 h-3" />}
                        <DollarSign className="w-3 h-3" /> {">"} $150k
                    </button>
                    <button 
                        onClick={() => toggleFilter('recent')}
                        className={`px-3 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                            activeFilters.has('recent') 
                            ? 'bg-stone-800 text-white border-stone-800' 
                            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                        }`}
                    >
                        {activeFilters.has('recent') && <Check className="w-3 h-3" />}
                        <Clock className="w-3 h-3" /> Recently Posted
                    </button>
                </div>
           </div>
        </div>
      </div>

      {/* Split View Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-[1800px] mx-auto w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x divide-stone-200">
          
          {/* Left Panel: Job List */}
          <div ref={listRef} className={`col-span-1 lg:col-span-4 h-full overflow-y-auto custom-scrollbar bg-stone-50/50 p-4 ${selectedJobId ? 'hidden lg:block' : 'block'}`}>
             <div className="mb-3 flex justify-between items-center px-1">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{filteredJobs.length} Jobs Found</span>
                {isResumeMatch && <span className="text-xs text-brand-600 font-bold">Sorted by Match</span>}
             </div>
            <div className="space-y-3">
               {isLoading ? (
                  [1,2,3,4,5].map(i => (
                    <div key={i} className="h-32 bg-white rounded-xl border border-stone-100 animate-pulse"></div>
                  ))
               ) : filteredJobs.length === 0 ? (
                  <div className="text-center py-10 text-stone-400">
                     <p>No jobs found matching filters.</p>
                     <button onClick={() => {setActiveFilters(new Set()); setQuery('');}} className="text-sm text-brand-600 font-bold mt-2 hover:underline">Clear Filters</button>
                  </div>
               ) : (
                  filteredJobs.map(job => (
                     <JobCard 
                        key={job.id} 
                        job={job} 
                        compact={true}
                        isActive={selectedJobId === job.id}
                        onClick={() => setSelectedJobId(job.id)}
                     />
                  ))
               )}
            </div>
          </div>

          {/* Right Panel: Job Details */}
          <div className={`col-span-1 lg:col-span-8 h-full overflow-hidden bg-white p-4 lg:p-6 ${selectedJobId ? 'block' : 'hidden lg:block'}`}>
             {/* Mobile Back Button */}
             {selectedJobId && (
               <button 
                 onClick={() => setSelectedJobId(null)}
                 className="lg:hidden mb-4 text-sm font-bold text-stone-500 flex items-center gap-1 hover:text-brand-600"
               >
                 ← Back to List
               </button>
             )}
             
             <JobDetailView 
                job={selectedJob} 
                onSave={onSaveJob} 
                onTailor={onTailorJob}
             />
          </div>

        </div>
      </div>
    </div>
  );
};
