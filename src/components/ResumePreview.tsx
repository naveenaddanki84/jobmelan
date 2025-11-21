'use client';
import React, { useState } from 'react';
import { ResumeSchema } from '@/types';
import { Button } from './Button';
import { Download, Copy, Check, FileJson, Eye, Link as LinkIcon } from 'lucide-react';

interface ResumePreviewProps {
  resumeData: ResumeSchema | null;
}

// Styles for Jake's Resume Format
const JakesResumeRenderer: React.FC<{ data: ResumeSchema }> = ({ data }) => {
  const { basics, education, skills, experience, projects, certifications, meta } = data;
  const visible = meta?.visible || { education: true, experience: true, skills: true, projects: true, certifications: true, phone: true, location: true };
  const sectionOrder = meta?.sectionOrder || ['education', 'skills', 'experience', 'projects', 'certifications'];

  // Helper to render sections based on order
  const renderSection = (key: string) => {
    switch (key) {
      case 'education':
        if (!visible.education || !education || education.length === 0) return null;
        const visibleEdu = education.filter(e => e.visible !== false);
        if (visibleEdu.length === 0) return null;
        return (
          <section key="education" className="mb-3">
            <h2 className="resume-section-header">Education</h2>
            {visibleEdu.map((edu, index) => (
              <div key={edu.id || index} className="mb-1">
                <div className="resume-item-header">
                  <div className="flex-1">
                    <span className="resume-item-title">{edu.institution}</span>
                    {edu.location && <span className="font-normal ml-1 text-xs">, {edu.location}</span>}
                  </div>
                  <div className="resume-item-date">{edu.date}</div>
                </div>
                <div className="flex justify-between text-xs italic mb-0.5">
                  <span>{edu.studyType} in {edu.area}</span>
                  {edu.score && <span>GPA: {edu.score}</span>}
                </div>
                {edu.courses && edu.courses.length > 0 && (
                  <div className="text-xs">
                    <span className="font-semibold">Coursework:</span> {edu.courses.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </section>
        );

      case 'skills':
        if (!visible.skills || !skills || skills.length === 0) return null;
        return (
          <section key="skills" className="mb-3">
            <h2 className="resume-section-header">Skills</h2>
            <div className="text-xs">
              {skills.map((skillGroup, index) => (
                <div key={index} className="mb-0.5">
                  <span className="font-bold">{skillGroup.category}:</span>{' '}
                  <span>{skillGroup.keywords.join(', ')}</span>
                </div>
              ))}
            </div>
          </section>
        );

      case 'experience':
        if (!visible.experience || !experience || experience.length === 0) return null;
        const visibleExp = experience.filter(e => e.visible !== false);
        if (visibleExp.length === 0) return null;
        return (
          <section key="experience" className="mb-3">
            <h2 className="resume-section-header">Experience</h2>
            {visibleExp.map((job, index) => (
              <div key={job.id || index} className="mb-2">
                <div className="resume-item-header">
                  <div className="resume-item-title">{job.company}</div>
                  <div className="resume-item-date">{job.startDate} – {job.endDate}</div>
                </div>
                <div className="resume-item-header mb-0.5">
                  <div className="resume-item-subtitle italic text-xs">{job.position}</div>
                  <div className="text-xs">{job.location}</div>
                </div>
                <ul className="resume-list text-xs">
                  {job.highlights.map((highlight, hIndex) => (
                    <li key={hIndex}>{highlight}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );

      case 'projects':
        if (!visible.projects || !projects || projects.length === 0) return null;
        const visibleProj = projects.filter(p => p.visible !== false);
        if (visibleProj.length === 0) return null;
        return (
          <section key="projects" className="mb-3">
            <h2 className="resume-section-header">Projects</h2>
            {visibleProj.map((project, index) => (
              <div key={project.id || index} className="mb-1">
                <div className="resume-item-header">
                  <div className="flex-1 flex items-baseline">
                    <span className="resume-item-title">{project.name}</span>
                    {project.technologies && project.technologies.length > 0 && (
                       <span className="font-normal text-gray-700 mx-2 text-xs italic">| {project.technologies.join(', ')}</span>
                    )}
                    {/* Display Project Link in header for better visibility */}
                    {project.link && (
                       <a href={project.link} target="_blank" rel="noopener noreferrer" className="ml-1 text-[10px] text-gray-500 hover:text-black hover:underline decoration-dotted inline-flex items-center">
                         <LinkIcon className="w-2.5 h-2.5 mr-0.5 opacity-70" /> 
                         {project.link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] + (project.link.split('/').length > 3 ? '/...' : '')}
                       </a>
                    )}
                  </div>
                  {project.date && <div className="resume-item-date">{project.date}</div>}
                </div>
                <div className="text-xs">
                  <span className="mr-1">{project.description}</span>
                </div>
              </div>
            ))}
          </section>
        );

      case 'certifications':
        if (!visible.certifications || !certifications || certifications.length === 0) return null;
        const visibleCerts = certifications.filter(c => c.visible !== false);
        if (visibleCerts.length === 0) return null;
        return (
          <section key="certifications" className="mb-3">
            <h2 className="resume-section-header">Certifications</h2>
            {visibleCerts.map((cert, index) => (
              <div key={cert.id || index} className="mb-1 flex justify-between items-baseline">
                 <div className="text-xs">
                   <span className="font-bold">{cert.name}</span>
                   <span className="italic mx-1">-</span>
                   <span>{cert.issuer}</span>
                 </div>
                 <div className="resume-item-date text-xs">{cert.date}</div>
              </div>
            ))}
          </section>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-white text-black font-sans text-[10pt] leading-snug p-5 h-full w-full max-w-[21cm] mx-auto shadow-sm" id="resume-content">
      <style>{`
        .resume-section-header {
          font-family: 'Inter', sans-serif;
          text-transform: uppercase;
          font-weight: 700;
          font-size: 1em;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #333;
          margin-top: 6px;
          margin-bottom: 3px;
          padding-bottom: 1px;
        }
        .resume-item-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-family: 'Inter', sans-serif;
          margin-bottom: 0;
        }
        .resume-item-title {
          font-weight: 700;
          font-size: 1em;
        }
        .resume-item-subtitle {
          font-weight: 500;
        }
        .resume-item-date {
          font-weight: 400;
          text-align: right;
          font-size: 0.95em;
        }
        .resume-list {
          list-style-type: disc;
          margin-left: 14px;
          margin-top: 1px;
          margin-bottom: 4px;
          padding-left: 0;
        }
        .resume-list li {
          margin-bottom: 0;
          padding-left: 2px;
          line-height: 1.25;
        }
        a { color: inherit; text-decoration: none; }
      `}</style>

      {/* Header */}
      <header className="text-center mb-2">
        <h1 className="text-2xl font-bold uppercase tracking-wide mb-0.5">{basics.name}</h1>
        <div className="text-xs flex flex-wrap justify-center gap-x-3 gap-y-0 text-gray-900">
          {basics.email && <span>{basics.email}</span>}
          {visible.phone && basics.phone && <span>{basics.phone}</span>}
          {visible.location && basics.location && <span>{basics.location}</span>}
          {basics.profiles && basics.profiles.map((profile, i) => (
            <a key={i} href={profile.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {profile.displayUrl 
                ? profile.url.replace(/^https?:\/\//, '') 
                : (profile.network || profile.url.replace(/^https?:\/\//, ''))}
            </a>
          ))}
        </div>
        {/* Summary (if enabled and present) */}
        {visible.summary && basics.summary && (
           <div className="text-xs text-left mt-2 mb-1 leading-relaxed">
              {basics.summary}
           </div>
        )}
      </header>

      {/* Dynamic Sections */}
      {sectionOrder.map(sectionKey => renderSection(sectionKey))}

    </div>
  );
};

export const ResumePreview: React.FC<ResumePreviewProps> = ({ resumeData }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'json'>('preview');
  const [copied, setCopied] = useState(false);

  if (!resumeData) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-stone-200 rounded-xl p-12 bg-stone-50">
        <Eye className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Start editing to see preview</p>
      </div>
    );
  }

  const handleCopy = () => {
    const content = JSON.stringify(resumeData, null, 2);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('resume-content');
    if (!element) {
      alert('Resume content not found');
      return;
    }

    try {
      // Add a style tag to convert lab() colors to rgb for html2canvas compatibility
      const styleId = 'pdf-color-override';
      let overrideStyle = document.getElementById(styleId);
      
      if (!overrideStyle) {
        overrideStyle = document.createElement('style');
        overrideStyle.id = styleId;
        // Override with rgb/hex colors that html2canvas can parse
        overrideStyle.textContent = `
          #resume-content {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          #resume-content * {
            /* Force rgb/hex colors instead of lab() */
            color: inherit;
            background-color: transparent;
            border-color: inherit;
          }
          #resume-content .text-gray-900 {
            color: #111827 !important;
          }
          #resume-content .text-gray-700 {
            color: #374151 !important;
          }
          #resume-content .text-gray-500 {
            color: #6b7280 !important;
          }
          #resume-content .resume-section-header {
            color: #000000 !important;
            border-bottom-color: #333333 !important;
          }
        `;
        document.head.appendChild(overrideStyle);
      }

      // Dynamically import html2pdf.js
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt: any = {
        margin: 0, 
        filename: `${resumeData.basics.name.replace(/\s+/g, '_')}_Resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      
      // Remove override style after PDF generation
      setTimeout(() => {
        const style = document.getElementById(styleId);
        if (style) {
          style.remove();
        }
      }, 1000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Remove style on error too
      const style = document.getElementById('pdf-color-override');
      if (style) {
        style.remove();
      }
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDownloadJSON = () => {
    const content = JSON.stringify(resumeData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized_resume.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-full bg-stone-200/50 rounded-xl shadow-xl overflow-hidden border border-stone-200 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="flex items-center space-x-4">
          <div className="flex bg-stone-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-bold transition-all ${
                activeTab === 'preview' 
                  ? 'bg-white text-brand-700 shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-bold transition-all ${
                activeTab === 'json' 
                  ? 'bg-white text-brand-700 shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <FileJson className="w-4 h-4 mr-2" />
              JSON
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'json' ? (
            <>
               <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy JSON">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownloadJSON} icon={<Download className="w-4 h-4" />}>
                Download JSON
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={handleDownloadPDF} icon={<Download className="w-4 h-4" />}>
              Download PDF
            </Button>
          )}
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-stone-200/30">
        <div className="h-full w-full overflow-auto p-8 flex justify-center">
           {activeTab === 'preview' ? (
              <div className="bg-white shadow-xl w-[21cm] min-h-[29.7cm] text-slate-900 origin-top scale-90 sm:scale-100 transition-transform ring-1 ring-stone-900/5">
                 <JakesResumeRenderer data={resumeData} />
              </div>
           ) : (
              <div className="w-full max-w-4xl">
                <pre className="text-sm text-stone-700 font-mono bg-white p-6 rounded-xl overflow-auto shadow-sm border border-stone-200">
                  <code>{JSON.stringify(resumeData, null, 2)}</code>
                </pre>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};