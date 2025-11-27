// JobMélan Copilot - Content Script
// Creates a floating assistant on job posting pages

(function() {
  'use strict';

  const FLOATER_ID = 'jobmelan-copilot-floater';
  const PANEL_ID = 'jobmelan-copilot-panel';
  const TRIGGER_ID = 'jobmelan-copilot-trigger';

  let baseUrl = 'http://localhost:3000';
  let isInitialized = false;

  // Get base URL from background script
  chrome.runtime.sendMessage({ action: 'getBaseUrl' }, (response) => {
    if (response && response.baseUrl) {
      baseUrl = response.baseUrl;
    }
    initialize();
  });

  function initialize() {
    if (isInitialized) return;
    if (document.getElementById(FLOATER_ID)) return;

    createFloaterUI();
    isInitialized = true;
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
          
          <div class="jobmelan-form-group">
            <label for="jobmelan-resume-select">Select Base Resume</label>
            <select id="jobmelan-resume-select" class="jobmelan-select">
              <option value="">Loading resumes...</option>
            </select>
          </div>
          
          <button id="jobmelan-tailor-btn" class="jobmelan-btn jobmelan-btn-primary">
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
        </div>
      </div>
    `;

    document.body.appendChild(trigger);
    document.body.appendChild(panel);

    // Event listeners
    trigger.addEventListener('click', () => {
      panel.classList.toggle('visible');
      if (panel.classList.contains('visible')) {
        loadResumes();
      }
    });

    document.getElementById('jobmelan-close-btn').addEventListener('click', () => {
      panel.classList.remove('visible');
    });

    document.getElementById('jobmelan-tailor-btn').addEventListener('click', handleTailor);
    document.getElementById('jobmelan-new-job')?.addEventListener('click', resetUI);

    // Initialize job preview
    updateJobPreview();
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

  async function checkAuth() {
    try {
      // Test authentication by making a simple API call through background script
      const response = await chrome.runtime.sendMessage({ 
        action: 'apiRequest',
        endpoint: '/api/extension/resumes',
        method: 'GET'
      });
      
      return response?.ok || false;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }

  async function makeAuthenticatedRequest(endpoint, options = {}) {
    // Make request through background script which has better cookie access
    const response = await chrome.runtime.sendMessage({
      action: 'apiRequest',
      endpoint,
      method: options.method || 'GET',
      body: options.body
    });
    
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
          option.textContent = r.title + (r.isDefault ? ' (Default)' : '');
          if (r.isDefault) option.selected = true;
          selectEl.appendChild(option);
        });
      } else {
        selectEl.innerHTML = '<option value="">No resumes found. Create one in JobMélan first.</option>';
        document.getElementById('jobmelan-tailor-btn').disabled = true;
      }

      loadingEl.style.display = 'none';
      mainEl.style.display = 'block';

    } catch (error) {
      console.error('Failed to load resumes:', error);
      loadingEl.style.display = 'none';
      loginEl.style.display = 'block';
    }
  }

  async function handleTailor() {
    const btn = document.getElementById('jobmelan-tailor-btn');
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
    for (let i = 1; i <= 3; i++) {
      const stepEl = document.getElementById(`jobmelan-step-${i}`);
      if (stepEl) {
        stepEl.classList.remove('active', 'done', 'error');
        stepEl.querySelector('.jobmelan-step-icon').textContent = i;
      }
    }
  }

  function resetUI() {
    document.getElementById('jobmelan-progress').style.display = 'none';
    document.getElementById('jobmelan-success').style.display = 'none';
    document.getElementById('jobmelan-error').style.display = 'none';
    document.getElementById('jobmelan-tailor-btn').style.display = 'block';
    document.getElementById('jobmelan-tailor-btn').disabled = false;
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

