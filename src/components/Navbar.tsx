'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, LayoutDashboard, FileText } from 'lucide-react';
import { UserButton, SignInButton, useUser } from '@clerk/nextjs';
import { Button } from './Button';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  const getPageTitle = () => {
    if (pathname?.startsWith('/editor')) return 'Live Editor';
    if (pathname === '/dashboard') return 'Tracker';
    if (pathname === '/search') return 'Job Feed';
    return 'Workspace';
  };

  return (
    <nav className="border-b border-stone-200 glass-panel sticky top-0 z-50 shrink-0 h-16">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 cursor-pointer group">
              <div className="w-9 h-9 bg-stone-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-white font-display font-bold text-lg">J</span>
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-xl font-bold text-stone-900 tracking-tight font-display leading-none">
                  JOBMÉLAN
                </span>
                <span className="text-[10px] font-bold tracking-[0.2em] text-brand-600 uppercase leading-none mt-0.5">
                  Match • Merge • Align
                </span>
              </div>
            </Link>

            {/* SaaS Nav Items - Only show when signed in */}
            {isLoaded && isSignedIn && (
              <div className="hidden md:flex items-center gap-6 ml-6 text-sm font-medium text-stone-500">
                <Link
                  href="/search"
                  className={`hover:text-brand-600 cursor-pointer transition-colors flex items-center gap-2 ${isActive('/search') ? 'text-brand-600 font-bold' : ''}`}
                >
                  <Globe className="w-4 h-4" /> Find Jobs
                </Link>
                <Link
                  href="/dashboard"
                  className={`hover:text-brand-600 cursor-pointer transition-colors flex items-center gap-2 ${isActive('/dashboard') ? 'text-brand-600 font-bold' : ''}`}
                >
                  <LayoutDashboard className="w-4 h-4" /> Tracker
                </Link>
                <Link
                  href="/"
                  className={`hover:text-brand-600 cursor-pointer transition-colors flex items-center gap-2 ${isActive('/') ? 'text-brand-600 font-bold' : ''}`}
                >
                  <FileText className="w-4 h-4" /> Editor
                </Link>
                <Link
                  href="/documents"
                  className={`hover:text-brand-600 cursor-pointer transition-colors flex items-center gap-2 ${isActive('/documents') ? 'text-brand-600 font-bold' : ''}`}
                >
                  <FileText className="w-4 h-4" /> Documents
                </Link>
                <Link
                  href="/profile"
                  className={`hover:text-brand-600 cursor-pointer transition-colors flex items-center gap-2 ${isActive('/profile') ? 'text-brand-600 font-bold' : ''}`}
                >
                  <div className="w-4 h-4 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
                    <UserButton />
                  </div>
                  Profile
                </Link>
                <Link
                  href="/mock-interview"
                  className={`hover:text-brand-600 cursor-pointer transition-colors flex items-center gap-2 ${isActive('/mock-interview') ? 'text-brand-600 font-bold' : ''}`}
                >
                  <FileText className="w-4 h-4" /> Mock Interview
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isLoaded && (
              <>
                {isSignedIn ? (
                  <>
                    <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 hidden sm:block">
                      {getPageTitle()}
                    </div>
                    {pathname?.startsWith('/editor') && (
                      <Link href="/">
                        <Button variant="outline" size="sm">
                          New Resume
                        </Button>
                      </Link>
                    )}
                    <Link href="/pricing">
                      <Button variant="outline" size="sm" className="hidden sm:flex">
                        Upgrade
                      </Button>
                    </Link>
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "w-8 h-8",
                        },
                      }}
                    />
                  </>
                ) : (
                  <SignInButton mode="modal">
                    <Button variant="primary" size="sm">
                      Sign In
                    </Button>
                  </SignInButton>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

