'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { JobTracker } from '@/components/JobTracker';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans selection:bg-brand-200 selection:text-brand-900 flex flex-col">
      <Navbar />
      <main className="flex-1 flex overflow-hidden relative">
        <div className="w-full h-full relative z-10">
          <JobTracker />
        </div>
      </main>
    </div>
  );
}

