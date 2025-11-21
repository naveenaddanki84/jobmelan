'use client';
import React, { useState, useEffect } from 'react';
import { JobApplication, JobStatus } from '@/types';
import { Button } from './Button';
import { Plus, MoreHorizontal, Calendar, Building2, DollarSign, ExternalLink, Trash2, Search, GripVertical } from 'lucide-react';
import { getJobApplications, saveJobApplication, updateJobApplication, deleteJobApplication } from '@/actions/job-actions';

const COLUMN_CONFIG: Record<JobStatus, { title: string; color: string }> = {
  wishlist: { title: 'Wishlist', color: 'bg-stone-100 border-stone-200' },
  applied: { title: 'Applied', color: 'bg-blue-50 border-blue-100' },
  interviewing: { title: 'Interviewing', color: 'bg-purple-50 border-purple-100' },
  offer: { title: 'Offer', color: 'bg-green-50 border-green-100' },
  rejected: { title: 'Rejected', color: 'bg-red-50 border-red-100' },
};

export const JobTracker: React.FC = () => {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  
  // Search/Filter state could go here

  // Load from database
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const savedJobs = await getJobApplications();
        if (savedJobs.length > 0) {
          setJobs(savedJobs);
        } else {
          // Fallback to localStorage for backward compatibility
          const localJobs = localStorage.getItem('rolecraft_jobs');
          if (localJobs) {
            setJobs(JSON.parse(localJobs));
          }
        }
      } catch (error) {
        console.error("Failed to load jobs:", error);
        // Fallback to localStorage
        const localJobs = localStorage.getItem('rolecraft_jobs');
        if (localJobs) {
          setJobs(JSON.parse(localJobs));
        }
      }
    };
    loadJobs();
  }, []);

  const handleAddJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const newJob = await saveJobApplication({
        company: formData.get('company') as string,
        position: formData.get('position') as string,
        status: 'wishlist',
        url: formData.get('url') as string || undefined,
        salary: formData.get('salary') as string || undefined,
      });
      setJobs([...jobs, newJob]);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Failed to save job:", error);
      // Fallback to localStorage
      const fallbackJob: JobApplication = {
        id: crypto.randomUUID(),
        company: formData.get('company') as string,
        position: formData.get('position') as string,
        status: 'wishlist',
        dateAdded: new Date().toISOString().split('T')[0],
        url: formData.get('url') as string,
        salary: formData.get('salary') as string,
      };
      setJobs([...jobs, fallbackJob]);
      localStorage.setItem('rolecraft_jobs', JSON.stringify([...jobs, fallbackJob]));
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (confirm('Are you sure you want to delete this job?')) {
      try {
        await deleteJobApplication(id);
        setJobs(jobs.filter(j => j.id !== id));
      } catch (error) {
        console.error("Failed to delete job:", error);
        // Fallback to localStorage
        const updatedJobs = jobs.filter(j => j.id !== id);
        setJobs(updatedJobs);
        localStorage.setItem('rolecraft_jobs', JSON.stringify(updatedJobs));
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedJobId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: JobStatus) => {
    e.preventDefault();
    if (draggedJobId) {
      try {
        await updateJobApplication(draggedJobId, { status });
        const updatedJobs = jobs.map(job => 
          job.id === draggedJobId ? { ...job, status } : job
        );
        setJobs(updatedJobs);
        setDraggedJobId(null);
      } catch (error) {
        console.error("Failed to update job:", error);
        // Fallback to localStorage
        const updatedJobs = jobs.map(job => 
          job.id === draggedJobId ? { ...job, status } : job
        );
        setJobs(updatedJobs);
        localStorage.setItem('rolecraft_jobs', JSON.stringify(updatedJobs));
        setDraggedJobId(null);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-stone-50 overflow-hidden">
      {/* Toolbar */}
      <div className="px-8 py-6 border-b border-stone-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-display">Job Tracker</h1>
          <p className="text-stone-500 text-sm">Manage your applications in one place.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Add Job
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex h-full gap-6 min-w-max">
          {(Object.keys(COLUMN_CONFIG) as JobStatus[]).map((status) => (
            <div 
              key={status} 
              className="w-80 flex flex-col h-full rounded-2xl bg-stone-100/50 border border-stone-200/60"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header */}
              <div className={`p-4 border-b border-stone-200 rounded-t-2xl flex justify-between items-center ${COLUMN_CONFIG[status].color.split(' ')[0]}`}>
                 <span className="font-bold text-stone-700 font-display">{COLUMN_CONFIG[status].title}</span>
                 <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold text-stone-500">
                    {jobs.filter(j => j.status === status).length}
                 </span>
              </div>

              {/* Column Content */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                 {jobs.filter(j => j.status === status).map((job) => (
                   <div 
                      key={job.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing relative"
                   >
                      <div className="flex justify-between items-start mb-2">
                         <h3 className="font-bold text-stone-800 text-sm leading-snug">{job.position}</h3>
                         <button onClick={() => handleDeleteJob(job.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-stone-600 mb-3 font-medium">
                         <Building2 className="w-3 h-3 text-stone-400" />
                         {job.company}
                      </div>

                      <div className="space-y-1.5">
                         {job.salary && (
                           <div className="flex items-center gap-1.5 text-[10px] text-stone-500 bg-stone-50 w-fit px-1.5 py-0.5 rounded">
                              <DollarSign className="w-3 h-3 text-stone-400" />
                              {job.salary}
                           </div>
                         )}
                         <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                            <Calendar className="w-3 h-3" />
                            Added {job.dateAdded}
                         </div>
                      </div>

                      {job.url && (
                        <a href={job.url} target="_blank" rel="noreferrer" className="absolute bottom-3 right-3 text-brand-600 hover:text-brand-700 bg-brand-50 p-1 rounded-md">
                           <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                   </div>
                 ))}
                 
                 {jobs.filter(j => j.status === status).length === 0 && (
                   <div className="h-32 border-2 border-dashed border-stone-200 rounded-xl flex items-center justify-center text-stone-400 text-xs font-medium">
                      No jobs yet
                   </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Job Modal */}
      {isAddModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
               <h2 className="text-lg font-bold mb-4">Add New Application</h2>
               <form onSubmit={handleAddJob} className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-stone-500 uppercase">Company</label>
                     <input name="company" required className="w-full mt-1 p-2 border border-stone-200 rounded-lg text-sm" placeholder="e.g. Google" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-stone-500 uppercase">Position</label>
                     <input name="position" required className="w-full mt-1 p-2 border border-stone-200 rounded-lg text-sm" placeholder="e.g. Frontend Engineer" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-stone-500 uppercase">Salary (Optional)</label>
                        <input name="salary" className="w-full mt-1 p-2 border border-stone-200 rounded-lg text-sm" placeholder="e.g. $120k" />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-stone-500 uppercase">Job URL (Optional)</label>
                     <input name="url" className="w-full mt-1 p-2 border border-stone-200 rounded-lg text-sm" placeholder="https://..." />
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                     <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                     <Button type="submit">Add Job</Button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};