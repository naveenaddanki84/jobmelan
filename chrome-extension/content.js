// JobMélan Copilot - Content Script
// Creates a floating assistant on job posting pages

(function() {
  'use strict';

  const FLOATER_ID = 'jobmelan-copilot-floater';
  const PANEL_ID = 'jobmelan-copilot-panel';
  const TRIGGER_ID = 'jobmelan-copilot-trigger';

  let baseUrl = 'http://localhost:3000';
  let isInitialized = false;

  // Helper function to convert blob to base64
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Generate PDF from resume data using jsPDF
  async function generatePDFFromResumeData(resumeData) {
    return new Promise(async (resolve) => {
      try {
        // Load bundled jsPDF via background script injection (avoids CSP issues)
        if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
          try {
            // Check if extension context is still valid
            if (!isExtensionContextValid()) {
              throw new Error('Extension context invalidated');
            }

            // Use background script to inject the bundled jsPDF file
            await new Promise((scriptResolve, scriptReject) => {
              chrome.runtime.sendMessage({
                action: 'executeScript',
                files: ['vendor/jspdf.umd.min.js']
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('Failed to inject jsPDF:', chrome.runtime.lastError.message);
                  scriptReject(new Error('Failed to inject jsPDF'));
                  return;
                }
                if (response?.error) {
                  console.error('jsPDF injection error:', response.error);
                  scriptReject(new Error(response.error));
                  return;
                }
                console.log('jsPDF injected successfully');
                scriptResolve();
              });
            });
            
            // Wait a bit for jsPDF to initialize
            await new Promise(r => setTimeout(r, 300));
          } catch (error) {
            console.error('Error loading jsPDF:', error);
            resolve(null);
            return;
          }
        }
        
        try {
          // Try to get jsPDF - it might be in window.jspdf or window.jsPDF
          let jsPDF;
          if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
          } else if (typeof window.jsPDF !== 'undefined') {
            jsPDF = window.jsPDF;
          } else {
            throw new Error('jsPDF not available');
          }
          
          const doc = new jsPDF({ unit: 'in', format: 'letter' });
          
          const basics = resumeData.basics || {};
          const experience = resumeData.experience || [];
          const education = resumeData.education || [];
          const skills = resumeData.skills || [];
          
          let yPos = 0.5;
          const margin = 0.5;
          const pageWidth = 8.5;
          const contentWidth = pageWidth - (margin * 2);
          
          // Header
          doc.setFontSize(20);
          doc.setFont('helvetica', 'bold');
          doc.text(basics.name || '', pageWidth / 2, yPos, { align: 'center' });
          yPos += 0.3;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const contactInfo = [
            basics.email,
            basics.phone,
            basics.location
          ].filter(Boolean).join(' | ');
          doc.text(contactInfo, pageWidth / 2, yPos, { align: 'center' });
          yPos += 0.4;
          
          // Summary
          if (basics.summary) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Summary', margin, yPos);
            yPos += 0.2;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const summaryLines = doc.splitTextToSize(basics.summary, contentWidth);
            doc.text(summaryLines, margin, yPos);
            yPos += summaryLines.length * 0.15 + 0.2;
          }
          
          // Experience
          if (experience.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Experience', margin, yPos);
            yPos += 0.2;
            
            experience.forEach(exp => {
              if (yPos > 10) {
                doc.addPage();
                yPos = 0.5;
              }
              
              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              doc.text(exp.position || '', margin, yPos);
              
              doc.setFont('helvetica', 'normal');
              const dateStr = `${exp.startDate || ''} - ${exp.endDate || 'Present'}`;
              doc.text(dateStr, pageWidth - margin, yPos, { align: 'right' });
              yPos += 0.15;
              
              doc.setFontSize(10);
              doc.text(`${exp.company || ''}${exp.location ? `, ${exp.location}` : ''}`, margin, yPos);
              yPos += 0.2;
              
              if (exp.highlights && exp.highlights.length > 0) {
                exp.highlights.forEach(highlight => {
                  if (yPos > 10) {
                    doc.addPage();
                    yPos = 0.5;
                  }
                  const lines = doc.splitTextToSize(`• ${highlight}`, contentWidth - 0.2);
                  doc.text(lines, margin + 0.2, yPos);
                  yPos += lines.length * 0.15;
                });
                yPos += 0.1;
              }
            });
          }
          
          // Education
          if (education.length > 0) {
            if (yPos > 10) {
              doc.addPage();
              yPos = 0.5;
            }
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Education', margin, yPos);
            yPos += 0.2;
            
            education.forEach(edu => {
              if (yPos > 10) {
                doc.addPage();
                yPos = 0.5;
              }
              
              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              doc.text(edu.institution || '', margin, yPos);
              
              doc.setFont('helvetica', 'normal');
              doc.text(edu.date || '', pageWidth - margin, yPos, { align: 'right' });
              yPos += 0.15;
              
              doc.setFontSize(10);
              doc.text(`${edu.studyType || ''}${edu.area ? ` in ${edu.area}` : ''}`, margin, yPos);
              yPos += 0.25;
            });
          }
          
          // Skills
          if (skills.length > 0) {
            if (yPos > 10) {
              doc.addPage();
              yPos = 0.5;
            }
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Skills', margin, yPos);
            yPos += 0.2;
            
            skills.forEach(skill => {
              if (yPos > 10) {
                doc.addPage();
                yPos = 0.5;
              }
              
              doc.setFontSize(10);
              doc.setFont('helvetica', 'bold');
              doc.text(`${skill.category || ''}:`, margin, yPos);
              
              doc.setFont('helvetica', 'normal');
              const skillText = (skill.keywords || []).join(', ');
              const skillLines = doc.splitTextToSize(skillText, contentWidth - 1);
              doc.text(skillLines, margin + 1, yPos);
              yPos += skillLines.length * 0.15 + 0.1;
            });
          }
          
          // Generate blob
          const pdfBlob = doc.output('blob');
          console.log('PDF generated successfully, size:', pdfBlob.size);
          resolve(pdfBlob);
        } catch (error) {
          console.error('Error generating PDF with jsPDF:', error);
          resolve(null);
        }
      } catch (error) {
        console.error('Error loading or generating PDF:', error);
        resolve(null);
      }
    });
  }

  // Get base URL from background script
  try {
    if (chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage({ action: 'getBaseUrl' }, (response) => {
        if (chrome.runtime.lastError) {
          // Extension context might be invalidated
          console.warn('Could not get base URL:', chrome.runtime.lastError.message);
          // Use default and continue
          initialize();
          return;
        }
        
        if (response && response.baseUrl) {
          baseUrl = response.baseUrl;
        }
        initialize();
      });
    } else {
      // Extension context not available, use default
      initialize();
    }
  } catch (error) {
    console.warn('Extension context error during initialization:', error);
    // Use default and continue
    initialize();
  }

  function initialize() {
    if (isInitialized) return;
    if (document.getElementById(FLOATER_ID)) return;

    createFloaterUI();
    isInitialized = true;
  }

  // Listen for extension disconnect (when extension is reloaded)
  try {
    if (chrome.runtime && chrome.runtime.onConnect) {
      chrome.runtime.onConnect.addListener((port) => {
        port.onDisconnect.addListener(() => {
          // Extension was disconnected/reloaded
          if (chrome.runtime.lastError) {
            handleExtensionContextError(new Error('Extension context invalidated'));
          }
        });
      });
    }
  } catch (error) {
    // Ignore if runtime is not available
  }

  function createFloaterUI() {
    // Create trigger button
    const trigger = document.createElement('button');
    trigger.id = TRIGGER_ID;
    trigger.className = 'jobmelan-trigger';
    trigger.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.9"/>
        <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;
    trigger.title = 'JobMélan Copilot';
    trigger.setAttribute('aria-label', 'Open JobMélan Copilot');

    // Create panel
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'jobmelan-panel';
    panel.innerHTML = `
      <div class="jobmelan-panel-header">
        <div class="jobmelan-panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
            <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>JobMélan Copilot</span>
        </div>
        <button class="jobmelan-close-btn" id="jobmelan-close-btn" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6L18 18"/>
          </svg>
        </button>
      </div>
      
      <div class="jobmelan-panel-content" id="jobmelan-content">
        <div class="jobmelan-loading" id="jobmelan-loading">
          <div class="jobmelan-spinner"></div>
          <p>Loading...</p>
        </div>
        
        <div class="jobmelan-login-required" id="jobmelan-login" style="display: none;">
          <div class="jobmelan-icon">🔐</div>
          <h3>Sign In Required</h3>
          <p>Please sign in to JobMélan to use the copilot.</p>
          <a href="${baseUrl}/sign-in" target="_blank" class="jobmelan-btn jobmelan-btn-primary">
            Sign In to JobMélan
          </a>
        </div>
        
        <div class="jobmelan-main" id="jobmelan-main" style="display: none;">
          <div class="jobmelan-job-preview" id="jobmelan-job-preview">
            <div class="jobmelan-job-title" id="jobmelan-job-title">Job Posting</div>
            <div class="jobmelan-job-company" id="jobmelan-job-company">Company</div>
            <div class="jobmelan-job-location" id="jobmelan-job-location"></div>
          </div>
          
          <!-- Autofill Section -->
          <div id="jobmelan-autofill-section" style="display: none; margin-bottom: 16px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 16px; color: white; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                <strong style="font-size: 16px;">Autofill this job application!</strong>
              </div>
              <div style="font-size: 13px; opacity: 0.9; margin-bottom: 12px;">
                Fill out the application form automatically with your resume data
              </div>
              <div class="jobmelan-form-group" style="margin-bottom: 12px; background: rgba(255,255,255,0.2); padding: 8px; border-radius: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: white; font-size: 12px;">
                  <input type="checkbox" id="jobmelan-auto-submit" style="cursor: pointer;" />
                  <span>Auto-submit after filling (uncheck to review first)</span>
                </label>
              </div>
              <button id="jobmelan-autofill-btn" class="jobmelan-btn" style="width: 100%; background: white; color: #667eea; border: none; font-weight: 600; padding: 12px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; vertical-align: middle;">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                Autofill this page
              </button>
            </div>
          </div>
          
          <!-- Resume Selection Section -->
          <div class="jobmelan-form-group" style="margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <label for="jobmelan-resume-select" style="display: flex; align-items: center; gap: 4px;">
                Resume
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6; cursor: help;" title="Select which resume to use for autofill">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
                </svg>
              </label>
            </div>
            <div style="position: relative;">
              <select id="jobmelan-resume-select" class="jobmelan-select" style="width: 100%; padding-right: 60px;">
                <option value="">Loading resumes...</option>
              </select>
              <button id="jobmelan-preview-resume" style="position: absolute; right: 40px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; opacity: 0.6;" title="Preview resume">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button id="jobmelan-upload-resume-pdf" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; opacity: 0.6;" title="Upload/Update Resume PDF for autofill">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </button>
            </div>
            <input type="file" id="jobmelan-resume-pdf-input" accept=".pdf" style="display: none;" />
            <div id="jobmelan-resume-pdf-status" style="font-size: 11px; color: #666; margin-top: 4px;"></div>
          </div>
          
          <!-- Tailor Resume Section -->
          <div style="background: #f8f9fa; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #e9ecef;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div>
                <div style="font-weight: 600; margin-bottom: 4px;">Keyword Match</div>
                <div style="font-size: 13px; color: #6c757d;">Optimize your resume for this job</div>
              </div>
              <span style="background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500;">Needs Work</span>
            </div>
            <button id="jobmelan-tailor-resume-btn" class="jobmelan-btn jobmelan-btn-primary" style="width: 100%;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
              Tailor Resume
            </button>
          </div>
          
          <!-- Original Tailor Button (for backward compatibility) -->
          <button id="jobmelan-tailor-btn" class="jobmelan-btn jobmelan-btn-secondary" style="width: 100%; display: none;">
            <span class="jobmelan-btn-text">Open Editor with Job Description</span>
            <svg class="jobmelan-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          
          <div class="jobmelan-error" id="jobmelan-error" style="display: none;"></div>
          
          <div class="jobmelan-progress" id="jobmelan-progress" style="display: none;">
            <div class="jobmelan-step" id="jobmelan-step-1">
              <div class="jobmelan-step-icon">1</div>
              <div class="jobmelan-step-content">
                <div class="jobmelan-step-title">Extracting Job Details</div>
                <div class="jobmelan-step-desc">Analyzing job posting...</div>
              </div>
            </div>
            <div class="jobmelan-step" id="jobmelan-step-2">
              <div class="jobmelan-step-icon">2</div>
              <div class="jobmelan-step-content">
                <div class="jobmelan-step-title">Saving to Tracker</div>
                <div class="jobmelan-step-desc">Adding job to your dashboard...</div>
              </div>
            </div>
            <div class="jobmelan-step" id="jobmelan-step-3">
              <div class="jobmelan-step-icon">3</div>
              <div class="jobmelan-step-content">
                <div class="jobmelan-step-title">Opening Homepage</div>
                <div class="jobmelan-step-desc">Preparing resume selection...</div>
              </div>
            </div>
            <div class="jobmelan-step" id="jobmelan-step-4" style="display: none;">
              <div class="jobmelan-step-icon">4</div>
              <div class="jobmelan-step-content">
                <div class="jobmelan-step-title">Filling Application Form</div>
                <div class="jobmelan-step-desc">Auto-filling form fields...</div>
              </div>
            </div>
          </div>
          
          <div class="jobmelan-success" id="jobmelan-success" style="display: none;">
            <div class="jobmelan-success-icon">✓</div>
            <h3>Application Ready!</h3>
            <p>Your tailored resume and cover letter have been saved.</p>
            <div class="jobmelan-success-actions">
              <a href="${baseUrl}/dashboard" target="_blank" class="jobmelan-btn jobmelan-btn-secondary">
                View in Dashboard
              </a>
              <button class="jobmelan-btn jobmelan-btn-ghost" id="jobmelan-new-job">
                Tailor Another Job
              </button>
            </div>
          </div>
          
          <!-- Autofill Results Section -->
          <div class="jobmelan-autofill-results" id="jobmelan-autofill-results" style="display: none;">
            <div style="background: #f0f9ff; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #bae6fd;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div>
                  <div style="font-size: 18px; font-weight: 700; color: #0369a1;">
                    <span id="jobmelan-filled-count">0</span> out of <span id="jobmelan-total-count">0</span> required fields filled
                  </div>
                  <div style="font-size: 14px; color: #0284c7; margin-top: 4px;">
                    <span id="jobmelan-completion-percent">0%</span> complete
                  </div>
                </div>
                <button id="jobmelan-autofill-again-btn" class="jobmelan-btn jobmelan-btn-primary" style="padding: 8px 16px; font-size: 13px; display: none;">
                  Autofill Again
                </button>
              </div>
              
              <div style="margin-top: 16px;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #0369a1;">Required</div>
                <div id="jobmelan-required-fields" style="max-height: 300px; overflow-y: auto; space-y: 4px;">
                  <!-- Required fields will be listed here -->
                </div>
              </div>
              
              <div style="margin-top: 16px;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #64748b;">Optional</div>
                <div id="jobmelan-optional-fields" style="max-height: 200px; overflow-y: auto; space-y: 4px;">
                  <!-- Optional fields will be listed here -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(trigger);
    document.body.appendChild(panel);

    // Event listeners
    trigger.addEventListener('click', () => {
      // Check if extension context is still valid before opening
      if (!isExtensionContextValid()) {
        handleExtensionContextError(new Error('Extension context invalidated'));
        return;
      }
      
      panel.classList.toggle('visible');
      if (panel.classList.contains('visible')) {
        loadResumes();
      }
    });

    document.getElementById('jobmelan-close-btn').addEventListener('click', () => {
      panel.classList.remove('visible');
    });

    document.getElementById('jobmelan-tailor-btn').addEventListener('click', handleTailor);
    document.getElementById('jobmelan-tailor-resume-btn')?.addEventListener('click', handleTailor);
    document.getElementById('jobmelan-autofill-btn')?.addEventListener('click', handleAutoApply);
    document.getElementById('jobmelan-autofill-again-btn')?.addEventListener('click', handleAutoApply);
    document.getElementById('jobmelan-preview-resume')?.addEventListener('click', handlePreviewResume);
    document.getElementById('jobmelan-upload-resume-pdf')?.addEventListener('click', () => {
      document.getElementById('jobmelan-resume-pdf-input').click();
    });
    document.getElementById('jobmelan-resume-pdf-input')?.addEventListener('change', handleResumePDFUpload);
    document.getElementById('jobmelan-resume-select')?.addEventListener('change', checkResumePDFStatus);
    document.getElementById('jobmelan-new-job')?.addEventListener('click', resetUI);

    // Initialize job preview and check for auto-apply support
    updateJobPreview();
    checkAutoApplySupport();
  }

  async function updateJobPreview() {
    try {
      const jobData = await scrapeJobDetails();
      document.getElementById('jobmelan-job-title').textContent = jobData.title || 'Job Posting';
      document.getElementById('jobmelan-job-company').textContent = jobData.company || 'Company';
      if (jobData.location) {
        document.getElementById('jobmelan-job-location').textContent = jobData.location;
      }
    } catch (error) {
      console.error('Failed to extract job details:', error);
    }
  }

  function checkAutoApplySupport() {
    const hostname = window.location.hostname;
    const isLever = hostname.includes('lever.co') || hostname.includes('jobs.lever.co');
    const isGreenhouse = hostname.includes('greenhouse.io') || hostname.includes('boards.greenhouse.io');
    const isWorkday = hostname.includes('myworkdayjobs.com') || hostname.includes('workday.com');
    
    if (isLever || isGreenhouse || isWorkday) {
      const autofillSection = document.getElementById('jobmelan-autofill-section');
      if (autofillSection) {
        autofillSection.style.display = 'block';
      }
    }
  }

  async function handlePreviewResume() {
    const selectEl = document.getElementById('jobmelan-resume-select');
    const resumeId = selectEl.value;
    
    if (!resumeId) {
      showError('Please select a resume first');
      return;
    }

    // Open resume editor/preview in new tab
    const editorUrl = `${baseUrl}/editor/${resumeId}`;
    window.open(editorUrl, '_blank');
  }

  async function handleResumePDFUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const selectEl = document.getElementById('jobmelan-resume-select');
    const resumeId = selectEl.value;
    
    if (!resumeId) {
      showError('Please select a resume first');
      return;
    }

    if (file.type !== 'application/pdf') {
      showError('Please upload a PDF file');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Check if extension context is still valid
        if (!isExtensionContextValid()) {
          showError('Extension context invalidated. Please refresh the page.');
          return;
        }

        const base64Data = e.target.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
        
        // Store in Chrome storage
        const response = await new Promise((resolve, reject) => {
          try {
            if (!isExtensionContextValid()) {
              reject(new Error('Extension context invalidated'));
              return;
            }
            
            chrome.runtime.sendMessage({
              action: 'storeResumeFile',
              resumeId: resumeId,
              fileData: base64Data,
              fileName: file.name,
              fileType: file.type
            }, (response) => {
              if (chrome.runtime.lastError) {
                if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                  reject(new Error('Extension context invalidated'));
                } else {
                  reject(new Error(chrome.runtime.lastError.message));
                }
                return;
              }
              resolve(response);
            });
          } catch (error) {
            reject(error);
          }
        });

        if (response.success) {
          const statusEl = document.getElementById('jobmelan-resume-pdf-status');
          if (statusEl) {
            statusEl.textContent = `✓ PDF saved for autofill`;
            statusEl.style.color = '#10b981';
          }
        } else {
          showError('Failed to save PDF: ' + (response.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error uploading PDF:', error);
        showError('Failed to upload PDF');
      }
    };
    
    reader.onerror = () => {
      showError('Error reading file');
    };
    
    reader.readAsDataURL(file);
  }

  async function checkResumePDFStatus() {
    const selectEl = document.getElementById('jobmelan-resume-select');
    const resumeId = selectEl.value;
    const statusEl = document.getElementById('jobmelan-resume-pdf-status');
    
    if (!resumeId || !statusEl) return;

    try {
      // Check if extension context is still valid
      if (!isExtensionContextValid()) {
        statusEl.textContent = '';
        return;
      }

      const response = await new Promise((resolve, reject) => {
        try {
          if (!isExtensionContextValid()) {
            reject(new Error('Extension context invalidated'));
            return;
          }
          
          chrome.runtime.sendMessage({
            action: 'getResumeFile',
            resumeId: resumeId
          }, (response) => {
            if (chrome.runtime.lastError) {
              if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                reject(new Error('Extension context invalidated'));
              } else {
                reject(new Error(chrome.runtime.lastError.message));
              }
              return;
            }
            resolve(response);
          });
        } catch (error) {
          reject(error);
        }
      });

      if (response && response.success && response.fileData) {
        statusEl.textContent = `✓ PDF ready for autofill`;
        statusEl.style.color = '#10b981';
      } else {
        statusEl.textContent = 'PDF will be auto-generated on autofill';
        statusEl.style.color = '#666';
      }
    } catch (error) {
      // Silently handle context errors - user will see message elsewhere if needed
      if (!error.message.includes('Extension context invalidated')) {
        statusEl.textContent = '';
      }
    }
  }

  async function handleAutoApply() {
    const btn = document.getElementById('jobmelan-autofill-btn') || document.getElementById('jobmelan-autofill-again-btn');
    const progressEl = document.getElementById('jobmelan-progress');
    const successEl = document.getElementById('jobmelan-success');
    const errorEl = document.getElementById('jobmelan-error');
    const resultsEl = document.getElementById('jobmelan-autofill-results');
    const selectEl = document.getElementById('jobmelan-resume-select');
    const autoSubmitCheckbox = document.getElementById('jobmelan-auto-submit');

    const resumeId = selectEl.value;
    if (!resumeId) {
      showError('Please select a resume');
      return;
    }

    const autoSubmit = autoSubmitCheckbox?.checked || false;

    // Reset UI
    if (btn) btn.disabled = true;
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'none';
    progressEl.style.display = 'block';
    resetSteps();

    try {
      // Step 1: Extract job details
      setStep(1, 'active');
      const jobData = await scrapeJobDetails();
      
      if (!jobData.description || jobData.description.length < 100) {
        throw new Error('Could not extract job description. Please ensure you are on a job posting page.');
      }
      setStep(1, 'done');

      // Step 2: Call auto-apply API and get resume file
      setStep(2, 'active');
      const autoApplyResponse = await makeAuthenticatedRequest('/api/extension/auto-apply', {
        method: 'POST',
        body: {
          jobUrl: window.location.href,
          jobDescription: jobData.description,
          resumeId: resumeId,
          platform: jobData.platform || 'Lever',
          autoSubmit: autoSubmit
        }
      });

      const autoApplyData = await autoApplyResponse.json();
      
      if (!autoApplyData.success) {
        throw new Error(autoApplyData.error || 'Auto-apply failed');
      }
      
      // Step 2.5: Fetch resume PDF file from Chrome storage
      let resumeFileBlob = null;
      let resumeFileName = 'resume.pdf';
      let resumeFileType = 'application/pdf';
      
      try {
        // Check if extension context is still valid
        if (!isExtensionContextValid()) {
          throw new Error('Extension context invalidated');
        }

        // Get resume file from Chrome storage
        const storageResponse = await new Promise((resolve, reject) => {
          try {
            if (!isExtensionContextValid()) {
              reject(new Error('Extension context invalidated'));
              return;
            }
            
            chrome.runtime.sendMessage({
              action: 'getResumeFile',
              resumeId: resumeId
            }, (response) => {
              if (chrome.runtime.lastError) {
                if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                  reject(new Error('Extension context invalidated'));
                } else {
                  reject(new Error(chrome.runtime.lastError.message));
                }
                return;
              }
              resolve(response);
            });
          } catch (error) {
            reject(error);
          }
        });
        
        console.log('Storage response:', storageResponse);
        
        if (storageResponse && storageResponse.success && storageResponse.fileData) {
          // Convert base64 to blob
          const base64Data = storageResponse.fileData.data;
          console.log('Converting base64 to blob, data length:', base64Data.length);
          
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          resumeFileBlob = new Blob([byteArray], { type: storageResponse.fileData.fileType || 'application/pdf' });
          resumeFileName = storageResponse.fileData.fileName || 'resume.pdf';
          resumeFileType = storageResponse.fileData.fileType || 'application/pdf';
          
          // Ensure file name has .pdf extension if missing
          if (!resumeFileName.toLowerCase().endsWith('.pdf')) {
            resumeFileName = resumeFileName.replace(/\.[^/.]+$/, '') + '.pdf';
          }
          
          console.log('Resume file loaded from storage:', {
            fileName: resumeFileName,
            fileType: resumeFileType,
            blobSize: resumeFileBlob.size,
            blobType: resumeFileBlob.type
          });
        } else {
          console.warn('Resume file not found in storage. Attempting to generate PDF from resume data...');
          
          // Try to generate PDF from resume data
          try {
            console.log('PDF not in storage, fetching resume data to generate PDF...');
            
            // Fetch resume data from API
            const resumeDataResponse = await makeAuthenticatedRequest(`/api/extension/resume-pdf?resumeId=${resumeId}`, {
              method: 'GET'
            });
            
            const resumeDataResult = await resumeDataResponse.json();
            
            if (resumeDataResult.success && resumeDataResult.resumeData) {
              console.log('Resume data fetched, generating PDF...');
              
              // Show progress message
              const step2Desc = document.querySelector('#jobmelan-step-2 .jobmelan-step-desc');
              if (step2Desc) {
                step2Desc.textContent = 'Generating PDF from resume data...';
              }
              
              // Update status in UI
              const statusEl = document.getElementById('jobmelan-resume-pdf-status');
              if (statusEl) {
                statusEl.textContent = 'Generating PDF...';
                statusEl.style.color = '#5c824d';
              }
              
              // Generate PDF from resume data
              const pdfBlob = await generatePDFFromResumeData(resumeDataResult.resumeData);
              
              if (pdfBlob && pdfBlob.size > 0) {
                resumeFileBlob = pdfBlob;
                resumeFileName = `${(resumeDataResult.resumeData.basics?.name || resumeDataResult.title || 'resume').replace(/\s+/g, '_')}.pdf`;
                resumeFileType = 'application/pdf';
                
                console.log('PDF generated successfully:', {
                  fileName: resumeFileName,
                  blobSize: resumeFileBlob.size
                });
                
                // Store the generated PDF in Chrome storage for future use
                try {
                  const base64Data = await blobToBase64(pdfBlob);
                  await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                      action: 'storeResumeFile',
                      resumeId: resumeId,
                      fileData: base64Data,
                      fileName: resumeFileName,
                      fileType: resumeFileType
                    }, (response) => {
                      console.log('Generated PDF stored in Chrome storage:', response);
                      // Update status
                      if (statusEl) {
                        statusEl.textContent = '✓ PDF ready for autofill';
                        statusEl.style.color = '#10b981';
                      }
                      resolve(response);
                    });
                  });
                } catch (storageError) {
                  console.warn('Could not store generated PDF in Chrome storage:', storageError);
                  // Continue anyway - we have the blob
                  if (statusEl) {
                    statusEl.textContent = '✓ PDF ready (not cached)';
                    statusEl.style.color = '#10b981';
                  }
                }
              } else {
                console.warn('Failed to generate PDF from resume data - blob is empty or null');
                if (statusEl) {
                  statusEl.textContent = 'PDF generation failed - manual upload needed';
                  statusEl.style.color = '#dc2626';
                }
              }
            } else {
              console.warn('Could not fetch resume data from API');
            }
          } catch (error) {
            console.error('Error generating PDF from resume data:', error);
            // Continue without file - user can upload manually
          }
        }
      } catch (error) {
        console.error('Could not load resume file:', error);
        // Continue without file - user can upload manually
      }
      
      setStep(2, 'done');

      // Step 3: Inject auto-apply script and fill form
      const step3El = document.getElementById('jobmelan-step-3');
      const step4El = document.getElementById('jobmelan-step-4');
      if (step3El) step3El.style.display = 'none';
      if (step4El) step4El.style.display = 'flex';
      setStep(4, 'active');
      
      // Inject the auto-apply script using chrome.scripting API via background script
      try {
        // Check if extension context is still valid
        if (!isExtensionContextValid()) {
          throw new Error('Extension context invalidated. Please refresh the page.');
        }

        // Use background script to inject the script file
        const injectResponse = await new Promise((resolve, reject) => {
          try {
            if (!isExtensionContextValid()) {
              reject(new Error('Extension context invalidated'));
              return;
            }
            
            chrome.runtime.sendMessage({
              action: 'executeScript',
              files: ['lever-auto-apply.js']
            }, (response) => {
              if (chrome.runtime.lastError) {
                if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                  reject(new Error('Extension context invalidated. Please refresh the page.'));
                } else {
                  reject(new Error(chrome.runtime.lastError.message));
                }
                return;
              }
              resolve(response);
            });
          } catch (error) {
            reject(error);
          }
        });
        
        if (injectResponse?.error) {
          throw new Error(injectResponse.error);
        }

        // Wait a bit for script to initialize
        await new Promise(r => setTimeout(r, 1000));

        // Set resume data in window for the script to use
        // IMPORTANT: Pass the blob directly, not as a property that might get lost
        const resumeData = {
          ...autoApplyData.formData,
          coverLetter: autoApplyData.coverLetter || ''
        };
        
        // Debug: Log location data
        console.log('Resume data location check:', {
          basicsLocation: resumeData.basics?.location,
          formDataBasics: autoApplyData.formData?.basics?.location,
          fullBasics: resumeData.basics
        });
        
        // Store blob separately in window so it persists
        // Also ensure the blob has the correct type
        if (resumeFileBlob) {
          // Ensure blob type is correct
          if (resumeFileBlob.type !== resumeFileType) {
            resumeFileBlob = new Blob([resumeFileBlob], { type: resumeFileType });
          }
          
          window.jobmelanResumeFileBlob = resumeFileBlob;
          window.jobmelanResumeFileName = resumeFileName;
          window.jobmelanResumeFileType = resumeFileType;
          
          resumeData.resumeFileBlob = resumeFileBlob;
          resumeData.resumeFileName = resumeFileName;
          resumeData.resumeFileType = resumeFileType;
          
          console.log('Resume data prepared with file:', {
            fileName: resumeFileName,
            fileType: resumeFileType,
            blobSize: resumeFileBlob.size,
            blobType: resumeFileBlob.type
          });
        } else {
          console.warn('No resume file blob available - file upload will be skipped');
        }
        
        console.log('Resume data prepared for autofill:', {
          basics: resumeData.basics?.name,
          location: resumeData.basics?.location,
          email: resumeData.basics?.email,
          phone: resumeData.basics?.phone,
          hasResumeFileBlob: !!resumeFileBlob,
          resumeFileName: resumeFileName,
          resumeFileType: resumeFileType,
          resumeFileBlobSize: resumeFileBlob ? resumeFileBlob.size : 0,
          resumeFileBlobType: resumeFileBlob ? resumeFileBlob.type : null,
          windowBlob: !!window.jobmelanResumeFileBlob
        });

        // Execute auto-apply function
        if (typeof window.leverAutoApply !== 'undefined' && window.leverAutoApply.autoApply) {
          const results = await window.leverAutoApply.autoApply(resumeData);
          
          console.log('Auto-apply results:', results);
          
          // Consider it successful if at least some fields were filled
          const filledFields = results.steps?.filter(s => s.success).length || 0;
          const hasWarnings = results.warnings && results.warnings.length > 0;
          
          if (filledFields > 0 || results.success) {
            setStep(4, 'done');
            
            // Show warnings if any
            if (hasWarnings) {
              console.warn('Autofill warnings:', results.warnings);
            }
            
            // If auto-submit is enabled, try to submit the form
            if (autoSubmit) {
              // Wait a bit for form to be fully filled
              await new Promise(r => setTimeout(r, 1000));
              
              // Look for submit button with various selectors
              const submitSelectors = [
                'button[type="submit"]',
                'button[class*="submit"]',
                'button[class*="apply"]',
                'button[class*="Submit"]',
                'input[type="submit"]',
                '[role="button"][class*="submit"]'
              ];
              
              let submitButton = null;
              for (const selector of submitSelectors) {
                submitButton = document.querySelector(selector);
                if (submitButton && submitButton.offsetParent !== null) {
                  break;
                }
              }
              
              if (submitButton) {
                submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(r => setTimeout(r, 500));
                submitButton.click();
                await new Promise(r => setTimeout(r, 2000));
              }
            }

            // Show detailed field status
            progressEl.style.display = 'none';
            const resultsEl = document.getElementById('jobmelan-autofill-results');
            successEl.style.display = 'none';
            
            if (resultsEl && results.fieldStatus) {
              // Update counts
              const filledCount = results.filledCount || results.fieldStatus.required.filter(f => f.filled).length;
              const totalCount = results.totalCount || results.fieldStatus.required.length;
              const completionPercent = results.completionPercent || (totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0);
              
              document.getElementById('jobmelan-filled-count').textContent = filledCount;
              document.getElementById('jobmelan-total-count').textContent = totalCount;
              document.getElementById('jobmelan-completion-percent').textContent = completionPercent + '%';
              
              // Render required fields
              const requiredFieldsEl = document.getElementById('jobmelan-required-fields');
              if (requiredFieldsEl && results.fieldStatus.required.length > 0) {
                requiredFieldsEl.innerHTML = results.fieldStatus.required.map(field => {
                  const checkmark = field.filled ? '✓' : '✗';
                  const color = field.filled ? '#10b981' : '#ef4444';
                  return `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px;">
                      <span style="color: ${color}; font-weight: 600; min-width: 20px;">${checkmark}</span>
                      <span style="color: ${field.filled ? '#1f2937' : '#6b7280'}">${field.name}</span>
                    </div>
                  `;
                }).join('');
              } else if (requiredFieldsEl) {
                requiredFieldsEl.innerHTML = '<div style="font-size: 12px; color: #9ca3af; padding: 8px;">No required fields detected</div>';
              }
              
              // Render optional fields
              const optionalFieldsEl = document.getElementById('jobmelan-optional-fields');
              if (optionalFieldsEl && results.fieldStatus.optional.length > 0) {
                optionalFieldsEl.innerHTML = results.fieldStatus.optional.map(field => {
                  const checkmark = field.filled ? '✓' : '○';
                  const color = field.filled ? '#10b981' : '#9ca3af';
                  return `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px;">
                      <span style="color: ${color}; min-width: 20px;">${checkmark}</span>
                      <span style="color: ${field.filled ? '#1f2937' : '#6b7280'}">${field.name}</span>
                    </div>
                  `;
                }).join('');
              } else if (optionalFieldsEl) {
                optionalFieldsEl.innerHTML = '<div style="font-size: 12px; color: #9ca3af; padding: 8px;">No optional fields detected</div>';
              }
              
              resultsEl.style.display = 'block';
              
              // Show "Autofill again" button
              const autofillAgainBtn = document.getElementById('jobmelan-autofill-again-btn');
              if (autofillAgainBtn) {
                autofillAgainBtn.style.display = 'block';
              }
              
              // Show warnings if any
              if (hasWarnings) {
                // Remove existing warning if any
                const existingWarning = resultsEl.querySelector('[style*="background: #fef3c7"]');
                if (existingWarning) existingWarning.remove();
                
                const warningDiv = document.createElement('div');
                warningDiv.style.cssText = 'margin-top: 12px; padding: 8px; background: #fef3c7; border-radius: 6px; font-size: 12px; color: #92400e;';
                warningDiv.innerHTML = '<strong>Note:</strong> ' + results.warnings.join('. ');
                resultsEl.appendChild(warningDiv);
              }
            } else {
              // Fallback to simple success message
              successEl.style.display = 'block';
              const message = autoSubmit 
                ? 'Your application has been submitted successfully!' 
                : 'Form fields have been filled. Please review and submit manually.';
              
              successEl.innerHTML = `
                <div class="jobmelan-success-icon">✓</div>
                <h3>Application Form Filled!</h3>
                <p style="text-align: left; font-size: 13px;">${message}</p>
                <div class="jobmelan-success-actions">
                  <button class="jobmelan-btn jobmelan-btn-ghost" id="jobmelan-new-job">
                    Apply to Another Job
                  </button>
                </div>
              `;
              document.getElementById('jobmelan-new-job')?.addEventListener('click', resetUI);
            }
            
            // Hide autofill button, but keep "Autofill again" visible
            const autofillBtn = document.getElementById('jobmelan-autofill-btn');
            if (autofillBtn) autofillBtn.style.display = 'none';
            
            // Show "Autofill again" button in results section
            const autofillAgainBtn = document.getElementById('jobmelan-autofill-again-btn');
            if (autofillAgainBtn) {
              autofillAgainBtn.style.display = 'block';
            }
          } else {
            const errorMsg = results?.errors?.join(', ') || results?.error || 'No fields could be filled. Please check the form structure.';
            const warningMsg = results?.warnings?.join('. ') || '';
            throw new Error(errorMsg + (warningMsg ? ' ' + warningMsg : ''));
          }
        } else {
          throw new Error('Auto-apply script not loaded. Please refresh the page and try again.');
        }
    } catch (error) {
      console.error('Auto-apply execution error:', error);
      
      // Check if it's a context invalidated error
      if (handleExtensionContextError(error)) {
        return; // Error already handled
      }
      
      throw error;
    }

    } catch (error) {
      console.error('Auto-apply error:', error);
      
      // Check if it's a context invalidated error
      if (handleExtensionContextError(error)) {
        return; // Error already handled
      }
      
      showError(error.message || 'An error occurred during auto-apply. Please try again.');
      progressEl.style.display = 'none';
      btn.disabled = false;
    }
  }

  async function scrapeJobDetails() {
    try {
      // Use background script to execute the scraper script
      const response = await chrome.runtime.sendMessage({
        action: 'executeScript',
        files: ['job-scraper.js']
      });
      
      if (response?.result?.result) {
        return response.result.result;
      }
      
      // Fallback: extract directly from current page
      return extractJobDetailsFallback();
    } catch (error) {
      console.error('Scraping error:', error);
      // Fallback: extract directly from current page
      return extractJobDetailsFallback();
    }
  }

  function extractJobDetailsFallback() {
    // Simple fallback extraction from current page
    const title = document.querySelector('h1')?.innerText?.trim() || 
                  document.title.replace(/ - .*$/, '').trim() || 
                  'Job Posting';
    
    const company = document.querySelector('[class*="company" i], [id*="company" i]')?.innerText?.trim() || 
                    'Company';
    
    const location = document.querySelector('[class*="location" i], [id*="location" i]')?.innerText?.trim() || '';
    
    const description = document.querySelector('main, article, [role="main"]')?.innerText?.trim() || 
                        document.body.innerText.trim();
    
    return {
      title,
      company,
      location,
      description: description.slice(0, 15000),
      url: window.location.href,
      hostname: window.location.hostname
    };
  }

  // Helper function to check if extension context is valid
  function isExtensionContextValid() {
    try {
      // Try to access chrome.runtime.id - if context is invalidated, this will throw
      return !!chrome.runtime?.id;
    } catch (error) {
      return false;
    }
  }

  // Helper function to handle extension context invalidated errors
  function handleExtensionContextError(error) {
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('Extension context invalidated') || 
        errorMessage.includes('message port closed') ||
        !isExtensionContextValid()) {
      // Show user-friendly error message
      const errorEl = document.getElementById('jobmelan-error');
      const loadingEl = document.getElementById('jobmelan-loading');
      const mainEl = document.getElementById('jobmelan-main');
      
      if (errorEl) {
        errorEl.innerHTML = `
          <div style="padding: 16px; background: #fef3c7; border-radius: 8px; border: 1px solid #fbbf24;">
            <div style="font-weight: 600; margin-bottom: 8px; color: #92400e;">Extension Reloaded</div>
            <div style="font-size: 13px; color: #78350f; margin-bottom: 12px;">
              The extension was reloaded. Please refresh this page to continue using JobMélan Copilot.
            </div>
            <button onclick="window.location.reload()" class="jobmelan-btn jobmelan-btn-primary" style="width: 100%;">
              Refresh Page
            </button>
          </div>
        `;
        errorEl.style.display = 'block';
      }
      
      if (loadingEl) loadingEl.style.display = 'none';
      if (mainEl) mainEl.style.display = 'none';
      
      return true; // Indicates this was a context error
    }
    return false; // Not a context error
  }

  async function checkAuth() {
    try {
      // Check if extension context is still valid
      if (!isExtensionContextValid()) {
        handleExtensionContextError(new Error('Extension context invalidated'));
        return false;
      }

      // Test authentication by making a simple API call through background script
      const response = await chrome.runtime.sendMessage({ 
        action: 'apiRequest',
        endpoint: '/api/extension/resumes',
        method: 'GET'
      });
      
      return response?.ok || false;
    } catch (error) {
      console.error('Auth check error:', error);
      
      // Check if it's a context invalidated error
      if (handleExtensionContextError(error)) {
        return false;
      }
      
      return false;
    }
  }

  async function makeAuthenticatedRequest(endpoint, options = {}) {
    try {
      // Check if extension context is still valid
      if (!isExtensionContextValid()) {
        const error = new Error('Extension context invalidated');
        handleExtensionContextError(error);
        throw error;
      }

      // Make request through background script which has better cookie access
      const response = await chrome.runtime.sendMessage({
        action: 'apiRequest',
        endpoint,
        method: options.method || 'GET',
        body: options.body
      });
      
      // Check if response indicates context error
      if (!response && !isExtensionContextValid()) {
        const error = new Error('Extension context invalidated');
        handleExtensionContextError(error);
        throw error;
      }
      
      if (!response.ok) {
        const error = new Error(response.error || 'Request failed');
        error.status = response.status;
        throw error;
      }
      
      // Return a Response-like object for compatibility
      return {
        ok: true,
        status: response.status,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data)
      };
    } catch (error) {
      // Handle extension context errors
      if (handleExtensionContextError(error)) {
        throw error;
      }
      // Re-throw other errors
      throw error;
    }
  }

  async function loadResumes() {
    const loadingEl = document.getElementById('jobmelan-loading');
    const loginEl = document.getElementById('jobmelan-login');
    const mainEl = document.getElementById('jobmelan-main');
    const selectEl = document.getElementById('jobmelan-resume-select');

    loadingEl.style.display = 'block';
    loginEl.style.display = 'none';
    mainEl.style.display = 'none';

    try {
      const authenticated = await checkAuth();
      
      if (!authenticated) {
        loadingEl.style.display = 'none';
        loginEl.style.display = 'block';
        return;
      }

      // Use authenticated request helper that includes cookies
      const res = await makeAuthenticatedRequest('/api/extension/resumes', {
        method: 'GET'
      });

      const data = await res.json();

      if (data.resumes && data.resumes.length > 0) {
        selectEl.innerHTML = '';
        data.resumes.forEach(r => {
          const option = document.createElement('option');
          option.value = r.id;
          option.textContent = r.title + (r.isDefault ? ' (default)' : '');
          if (r.isDefault) option.selected = true;
          selectEl.appendChild(option);
        });
        
        // Check PDF status for selected resume
        checkResumePDFStatus();
      } else {
        selectEl.innerHTML = '<option value="">No resumes found. Create one in JobMélan first.</option>';
        document.getElementById('jobmelan-tailor-btn').disabled = true;
        document.getElementById('jobmelan-tailor-resume-btn').disabled = true;
        document.getElementById('jobmelan-autofill-btn').disabled = true;
      }

      loadingEl.style.display = 'none';
      mainEl.style.display = 'block';

    } catch (error) {
      console.error('Failed to load resumes:', error);
      
      // Check if it's a context invalidated error
      if (handleExtensionContextError(error)) {
        return; // Error already handled
      }
      
      loadingEl.style.display = 'none';
      loginEl.style.display = 'block';
    }
  }

  async function handleTailor() {
    // Support both buttons
    const btn = document.getElementById('jobmelan-tailor-btn') || document.getElementById('jobmelan-tailor-resume-btn');
    const progressEl = document.getElementById('jobmelan-progress');
    const successEl = document.getElementById('jobmelan-success');
    const errorEl = document.getElementById('jobmelan-error');
    const selectEl = document.getElementById('jobmelan-resume-select');

    const resumeId = selectEl.value;
    if (!resumeId) {
      showError('Please select a resume');
      return;
    }

    btn.disabled = true;
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    progressEl.style.display = 'block';
    resetSteps();

    try {
      // Step 1: Extract job details
      setStep(1, 'active');
      const jobData = await scrapeJobDetails();
      
      if (!jobData.description || jobData.description.length < 100) {
        throw new Error('Could not extract job description. Please ensure you are on a job posting page.');
      }
      
      // Format job description for the editor
      const formattedJobDesc = `
Role: ${jobData.title || 'Position'}
Company: ${jobData.company || 'Company'}
Location: ${jobData.location || ''}

Job Description:
${jobData.description}
      `.trim();
      
      setStep(1, 'done');

      // Step 2: Save Job to Tracker (optional - for tracking purposes)
      setStep(2, 'active');
      try {
        await makeAuthenticatedRequest('/api/extension/save-job', {
          method: 'POST',
          body: {
            company: jobData.company || 'Company',
            position: jobData.title || 'Position',
            jobDescription: jobData.description,
            url: jobData.url,
            source: 'Extension',
            status: 'wishlist' // Save as wishlist since we haven't tailored yet
          }
        });
      } catch (e) {
        console.warn('Failed to save job to tracker:', e);
        // Continue even if save fails
      }
      setStep(2, 'done');

      // Step 3: Open Homepage with Job Description
      setStep(3, 'active');
      
      // Pass job description to background script which will store it in Chrome storage
      // and include storage key in URL
      const homepageUrl = `${baseUrl}/`;
      
      // Open homepage in new tab via background script (it will handle storage)
      await chrome.runtime.sendMessage({
        action: 'createTab',
        url: homepageUrl,
        jobDesc: formattedJobDesc
      });
      
      setStep(3, 'done');

      // Success
      progressEl.style.display = 'none';
      successEl.style.display = 'block';
      const successHtml = `
        <div class="jobmelan-success-icon">✓</div>
        <h3>Opening Homepage...</h3>
        <p>The homepage is opening in a new tab with the job description pre-filled. Select your resume and start tailoring!</p>
        <div class="jobmelan-success-actions">
          <a href="${homepageUrl}" target="_blank" class="jobmelan-btn jobmelan-btn-secondary">
            Open Homepage
          </a>
          <button class="jobmelan-btn jobmelan-btn-ghost" id="jobmelan-new-job">
            Tailor Another Job
          </button>
        </div>
      `;
      successEl.innerHTML = successHtml;
      btn.style.display = 'none';
      
      // Re-attach event listener for the new job button
      document.getElementById('jobmelan-new-job')?.addEventListener('click', resetUI);

    } catch (error) {
      console.error('Tailor error:', error);
      showError(error.message || 'An error occurred. Please try again.');
      progressEl.style.display = 'none';
      btn.disabled = false;
    }
  }

  function setStep(num, status) {
    const stepEl = document.getElementById(`jobmelan-step-${num}`);
    if (!stepEl) return;

    const iconEl = stepEl.querySelector('.jobmelan-step-icon');
    
    stepEl.classList.remove('active', 'done', 'error');
    
    if (status === 'active') {
      stepEl.classList.add('active');
      iconEl.textContent = num;
    } else if (status === 'done') {
      stepEl.classList.add('done');
      iconEl.textContent = '✓';
    } else if (status === 'error') {
      stepEl.classList.add('error');
      iconEl.textContent = '✕';
    }
  }

  function resetSteps() {
    for (let i = 1; i <= 4; i++) {
      const stepEl = document.getElementById(`jobmelan-step-${i}`);
      if (stepEl) {
        stepEl.style.display = i <= 3 ? 'flex' : 'none';
        stepEl.classList.remove('active', 'done', 'error');
        const iconEl = stepEl.querySelector('.jobmelan-step-icon');
        if (iconEl) iconEl.textContent = i;
      }
    }
  }

  function resetUI() {
    document.getElementById('jobmelan-progress').style.display = 'none';
    document.getElementById('jobmelan-success').style.display = 'none';
    document.getElementById('jobmelan-autofill-results').style.display = 'none';
    document.getElementById('jobmelan-error').style.display = 'none';
    
    const autofillBtn = document.getElementById('jobmelan-autofill-btn');
    if (autofillBtn) {
      autofillBtn.style.display = 'block';
      autofillBtn.disabled = false;
    }
    
    const autofillAgainBtn = document.getElementById('jobmelan-autofill-again-btn');
    if (autofillAgainBtn) {
      autofillAgainBtn.style.display = 'none';
    }
    
    updateJobPreview();
  }

  function showError(message) {
    const errorEl = document.getElementById('jobmelan-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();

