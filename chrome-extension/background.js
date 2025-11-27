// JobMélan Copilot - Background Service Worker

console.log("JobMélan Copilot background service worker initialized");

// Get base URL from storage or use default
async function getBaseUrl() {
  const result = await chrome.storage.sync.get(['baseUrl']);
  return result.baseUrl || 'http://localhost:3000';
}

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("JobMélan Copilot installed", details.reason);
  
  // Set default base URL
  chrome.storage.sync.set({ baseUrl: 'http://localhost:3000' });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBaseUrl') {
    getBaseUrl().then(url => sendResponse({ baseUrl: url }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'checkAuth') {
    getBaseUrl().then(async (baseUrl) => {
      try {
        // Clerk uses various cookie names - check for common ones
        const cookieNames = ['__clerk_db_jwt', '__session', '__clerk_js_version'];
        let authenticated = false;
        let cookies = {};
        
        // Get all cookies for the domain
        const allCookies = await chrome.cookies.getAll({ url: baseUrl });
        
        // Check if we have Clerk cookies
        for (const cookie of allCookies) {
          if (cookie.name.includes('clerk') || cookie.name === '__session') {
            authenticated = true;
            cookies[cookie.name] = cookie.value;
          }
        }
        
        // Also check for any session-like cookies
        if (!authenticated) {
          const sessionCookie = allCookies.find(c => 
            c.name.includes('session') || c.name.includes('auth') || c.name.includes('jwt')
          );
          if (sessionCookie) {
            authenticated = true;
            cookies[sessionCookie.name] = sessionCookie.value;
          }
        }
        
        sendResponse({ authenticated, cookies });
      } catch (error) {
        console.error('Auth check error:', error);
        sendResponse({ authenticated: false, error: error.message });
      }
    });
    return true;
  }
  
  if (request.action === 'getCookies') {
    getBaseUrl().then(async (baseUrl) => {
      try {
        const allCookies = await chrome.cookies.getAll({ url: baseUrl });
        const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
        sendResponse({ cookies: cookieString, cookieCount: allCookies.length });
      } catch (error) {
        sendResponse({ cookies: '', error: error.message });
      }
    });
    return true;
  }
  
  if (request.action === 'apiRequest') {
    getBaseUrl().then(async (baseUrl) => {
      try {
        const { endpoint, method = 'GET', body } = request;
        const url = `${baseUrl}${endpoint}`;
        
        // Get all cookies for the domain
        const allCookies = await chrome.cookies.getAll({ url: baseUrl });
        const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        // Make the request with cookies
        const fetchOptions = {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        };
        
        if (cookieString) {
          fetchOptions.headers['Cookie'] = cookieString;
        }
        
        if (body) {
          fetchOptions.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, fetchOptions);
        const data = await response.json();
        
        sendResponse({ 
          ok: response.ok, 
          status: response.status, 
          data,
          error: response.ok ? null : (data.error || 'Request failed')
        });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
    });
    return true;
  }
  
  if (request.action === 'executeScript') {
    // Execute script in the sender's tab
    (async () => {
      try {
        // Use the sender's tab ID (the tab where the content script is running)
        const tabId = sender?.tab?.id;
        if (!tabId) {
          sendResponse({ error: 'No tab ID found' });
          return;
        }
        
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: request.files || []
        });
        sendResponse({ result: results[0]?.result });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'createTab') {
    // Create a new tab and store job description in Chrome storage
    (async () => {
      try {
        // If job description is provided, store it in Chrome storage
        if (request.jobDesc) {
          const storageKey = `jobDesc_${Date.now()}`;
          await chrome.storage.local.set({ [storageKey]: request.jobDesc });
          // Also store with a consistent key for easy retrieval
          await chrome.storage.local.set({ 'pendingJobDesc': request.jobDesc });
          
          // Update URL to include storage key
          const url = new URL(request.url);
          url.searchParams.set('jobDescKey', storageKey);
          request.url = url.toString();
        }
        
        chrome.tabs.create({ url: request.url }, (tab) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true, tabId: tab.id });
          }
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getJobDesc') {
    // Get job description from Chrome storage
    (async () => {
      try {
        const storageKey = request.storageKey;
        if (storageKey) {
          const result = await chrome.storage.local.get([storageKey, 'pendingJobDesc']);
          sendResponse({ jobDesc: result[storageKey] || result.pendingJobDesc || null });
        } else {
          const result = await chrome.storage.local.get(['pendingJobDesc']);
          sendResponse({ jobDesc: result.pendingJobDesc || null });
        }
      } catch (error) {
        sendResponse({ jobDesc: null, error: error.message });
      }
    })();
    return true;
  }
});

