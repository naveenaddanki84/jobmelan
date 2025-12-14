// Job Scraper - Extracts job details from various ATS platforms
// Supports: Lever, Greenhouse, Workday, LinkedIn, Indeed, and generic sites

(function() {
  'use strict';

  function scrapeLever() {
    const jobData = {
      platform: 'Lever',
      title: '',
      company: '',
      location: '',
      description: '',
      url: window.location.href
    };

    // Lever-specific selectors
    try {
      // Job title - usually in h2 or h3
      const titleEl = document.querySelector('h2.posting-headline, h3.posting-headline, [class*="posting-headline"] h2, [class*="posting-headline"] h3');
      if (titleEl) {
        jobData.title = titleEl.textContent.trim();
      }

      // Company name - usually in the URL or page title
      const urlMatch = window.location.href.match(/jobs\.lever\.co\/([^\/]+)/);
      if (urlMatch) {
        jobData.company = urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      // Location
      const locationEl = document.querySelector('[class*="location"], [class*="posting-categories"] [class*="location"]');
      if (locationEl) {
        jobData.location = locationEl.textContent.trim();
      }

      // Description - Lever usually has sections
      const sections = document.querySelectorAll('[class*="section"], [class*="posting"] [class*="content"]');
      const descriptionParts = [];
      
      sections.forEach(section => {
        const text = section.textContent.trim();
        if (text.length > 50) { // Only include substantial sections
          descriptionParts.push(text);
        }
      });

      if (descriptionParts.length > 0) {
        jobData.description = descriptionParts.join('\n\n');
      } else {
        // Fallback: get all text from main content area
        const mainContent = document.querySelector('main, [role="main"], [class*="posting"]');
        if (mainContent) {
          jobData.description = mainContent.textContent.trim();
        }
      }

    } catch (error) {
      console.error('Error scraping Lever:', error);
    }

    return jobData;
  }

  function scrapeGreenhouse() {
    const jobData = {
      platform: 'Greenhouse',
      title: '',
      company: '',
      location: '',
      description: '',
      url: window.location.href
    };

    try {
      // Greenhouse selectors
      const titleEl = document.querySelector('h1.app-title, [class*="app-title"]');
      if (titleEl) {
        jobData.title = titleEl.textContent.trim();
      }

      const companyEl = document.querySelector('[class*="company-name"], [id*="company"]');
      if (companyEl) {
        jobData.company = companyEl.textContent.trim();
      }

      const locationEl = document.querySelector('[class*="location"], [id*="location"]');
      if (locationEl) {
        jobData.location = locationEl.textContent.trim();
      }

      const descriptionEl = document.querySelector('[id*="content"], [class*="content"], [id*="description"]');
      if (descriptionEl) {
        jobData.description = descriptionEl.textContent.trim();
      }

    } catch (error) {
      console.error('Error scraping Greenhouse:', error);
    }

    return jobData;
  }

  function scrapeWorkday() {
    const jobData = {
      platform: 'Workday',
      title: '',
      company: '',
      location: '',
      description: '',
      url: window.location.href
    };

    try {
      // Workday selectors
      const titleEl = document.querySelector('[data-automation-id="jobPostingHeader"], h1, [class*="job-title"]');
      if (titleEl) {
        jobData.title = titleEl.textContent.trim();
      }

      const companyEl = document.querySelector('[data-automation-id="jobPostingCompany"], [class*="company"]');
      if (companyEl) {
        jobData.company = companyEl.textContent.trim();
      }

      const locationEl = document.querySelector('[data-automation-id="jobPostingLocation"], [class*="location"]');
      if (locationEl) {
        jobData.location = locationEl.textContent.trim();
      }

      const descriptionEl = document.querySelector('[data-automation-id="jobPostingDescription"], [class*="description"]');
      if (descriptionEl) {
        jobData.description = descriptionEl.textContent.trim();
      }

    } catch (error) {
      console.error('Error scraping Workday:', error);
    }

    return jobData;
  }

  function scrapeLinkedIn() {
    const jobData = {
      platform: 'LinkedIn',
      title: '',
      company: '',
      location: '',
      description: '',
      url: window.location.href
    };

    try {
      const titleEl = document.querySelector('h1.jobs-details-top-card__job-title, h1[class*="job-title"]');
      if (titleEl) {
        jobData.title = titleEl.textContent.trim();
      }

      const companyEl = document.querySelector('a.jobs-details-top-card__company-url, [class*="company-name"]');
      if (companyEl) {
        jobData.company = companyEl.textContent.trim();
      }

      const locationEl = document.querySelector('[class*="location"], [class*="job-details"] [class*="location"]');
      if (locationEl) {
        jobData.location = locationEl.textContent.trim();
      }

      const descriptionEl = document.querySelector('[id*="job-details"], [class*="description"], [class*="job-details"]');
      if (descriptionEl) {
        jobData.description = descriptionEl.textContent.trim();
      }

    } catch (error) {
      console.error('Error scraping LinkedIn:', error);
    }

    return jobData;
  }

  function scrapeIndeed() {
    const jobData = {
      platform: 'Indeed',
      title: '',
      company: '',
      location: '',
      description: '',
      url: window.location.href
    };

    try {
      const titleEl = document.querySelector('h1[class*="jobsearch-JobInfoHeader-title"], h1.jobsearch-JobInfoHeader-title');
      if (titleEl) {
        jobData.title = titleEl.textContent.trim();
      }

      const companyEl = document.querySelector('[data-testid="job-preview-header-company-name"], [class*="company"]');
      if (companyEl) {
        jobData.company = companyEl.textContent.trim();
      }

      const locationEl = document.querySelector('[data-testid="job-location"], [class*="location"]');
      if (locationEl) {
        jobData.location = locationEl.textContent.trim();
      }

      const descriptionEl = document.querySelector('[id="jobDescriptionText"], [class*="jobsearch-jobDescriptionText"]');
      if (descriptionEl) {
        jobData.description = descriptionEl.textContent.trim();
      }

    } catch (error) {
      console.error('Error scraping Indeed:', error);
    }

    return jobData;
  }

  function scrapeGeneric() {
    const jobData = {
      platform: 'Generic',
      title: '',
      company: '',
      location: '',
      description: '',
      url: window.location.href
    };

    try {
      // Generic fallback extraction
      const titleEl = document.querySelector('h1, h2, [class*="title"], [class*="job-title"]');
      if (titleEl) {
        jobData.title = titleEl.textContent.trim();
      }

      const companyEl = document.querySelector('[class*="company"], [id*="company"]');
      if (companyEl) {
        jobData.company = companyEl.textContent.trim();
      }

      const locationEl = document.querySelector('[class*="location"], [id*="location"]');
      if (locationEl) {
        jobData.location = locationEl.textContent.trim();
      }

      const descriptionEl = document.querySelector('main, article, [role="main"], [class*="description"], [id*="description"]');
      if (descriptionEl) {
        jobData.description = descriptionEl.textContent.trim();
      }

    } catch (error) {
      console.error('Error scraping generic:', error);
    }

    return jobData;
  }

  // Main scraping function
  function scrapeJobDetails() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    // Detect platform
    if (hostname.includes('lever.co') || hostname.includes('jobs.lever.co')) {
      return scrapeLever();
    } else if (hostname.includes('greenhouse.io') || hostname.includes('boards.greenhouse.io')) {
      return scrapeGreenhouse();
    } else if (hostname.includes('myworkdayjobs.com') || hostname.includes('workday.com')) {
      return scrapeWorkday();
    } else if (hostname.includes('linkedin.com')) {
      return scrapeLinkedIn();
    } else if (hostname.includes('indeed.com')) {
      return scrapeIndeed();
    } else {
      return scrapeGeneric();
    }
  }

  // Return result
  return scrapeJobDetails();
})();

