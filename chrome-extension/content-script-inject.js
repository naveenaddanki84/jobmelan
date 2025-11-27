// Content script to inject into JobMélan pages to read job description from Chrome storage
// This runs on the JobMélan domain (localhost:3000) to access Chrome storage

(function() {
  'use strict';
  
  // Check if we're on the JobMélan homepage
  if (window.location.pathname === '/' || window.location.pathname === '') {
    const urlParams = new URLSearchParams(window.location.search);
    const jobDescKey = urlParams.get('jobDescKey');
    
    if (jobDescKey) {
      // Request job description from background script
      chrome.runtime.sendMessage({
        action: 'getJobDesc',
        storageKey: jobDescKey
      }, (response) => {
        if (response && response.jobDesc) {
          // Store in localStorage so React can read it
          localStorage.setItem('pendingJobDesc', response.jobDesc);
          
          // Trigger a custom event to notify React component
          window.dispatchEvent(new CustomEvent('jobDescLoaded', { 
            detail: { jobDesc: response.jobDesc } 
          }));
          
          // Also try to set it directly if the textarea exists
          const textarea = document.querySelector('textarea[placeholder*="job description"]');
          if (textarea) {
            textarea.value = response.jobDesc;
            // Trigger input event so React picks it up
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      });
    } else {
      // Check for pendingJobDesc in Chrome storage
      chrome.runtime.sendMessage({
        action: 'getJobDesc'
      }, (response) => {
        if (response && response.jobDesc) {
          localStorage.setItem('pendingJobDesc', response.jobDesc);
          window.dispatchEvent(new CustomEvent('jobDescLoaded', { 
            detail: { jobDesc: response.jobDesc } 
          }));
        }
      });
    }
  }
})();

