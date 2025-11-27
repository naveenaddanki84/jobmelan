# JobMélan Copilot - Chrome Extension

## Overview
A modern Chrome extension that provides AI-powered resume tailoring and job tracking directly from job posting pages. The extension appears as a floating assistant button that you can click to instantly tailor your resume and generate cover letters for any job.

## Features

### 🎯 **Smart Job Extraction**
- Automatically detects and extracts job details from major job sites (LinkedIn, Indeed, Greenhouse)
- Falls back to intelligent generic extraction for other sites
- Extracts: job title, company name, location, and full job description

### 🎨 **Modern UI**
- Beautiful floating button that appears on all pages
- Smooth animations and transitions
- Matches JobMélan brand colors (olive/green theme)
- Responsive design that works on all screen sizes

### 📝 **One-Click Resume Tailoring**
- Select your base resume from a dropdown
- Automatically tailors resume to match job description
- Optimizes skills and summary for ATS compatibility
- Creates a new tailored resume version

### 💌 **Cover Letter Generation**
- Generates personalized cover letters based on job description
- Uses your tailored resume for context
- Professional tone and formatting

### 📊 **Job Tracking**
- Automatically saves applications to your JobMélan dashboard
- Links tailored resume and cover letter to the job
- Tracks application status

### 🔐 **Secure Authentication**
- Uses Clerk session cookies for authentication
- Seamless integration with JobMélan SaaS
- Clear login prompts when not authenticated

## Installation

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or go to Chrome menu → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" switch in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `chrome-extension` folder from this repository

4. **Verify Installation**
   - You should see "JobMélan Copilot" in your extensions list
   - The extension icon should appear in your toolbar

## Usage

### Basic Workflow

1. **Navigate to a Job Posting**
   - Visit any job posting page (LinkedIn, Indeed, company career pages, etc.)
   - The floating green button will appear in the bottom-right corner

2. **Open the Copilot**
   - Click the floating button to open the panel
   - The extension will automatically extract job details

3. **Select Your Resume**
   - Choose your base resume from the dropdown
   - Default resume is pre-selected

4. **Tailor & Apply**
   - Click "Tailor Resume & Generate Cover Letter"
   - Watch the progress as it:
     - Extracts job details
     - Tailors your resume
     - Generates a cover letter
     - Saves to your dashboard

5. **View Results**
   - Click "View in Dashboard" to see your tailored resume and cover letter
   - Or click "Tailor Another Job" to start over

### Supported Job Sites

The extension works on:
- ✅ LinkedIn Jobs
- ✅ Indeed
- ✅ Greenhouse
- ✅ Generic job sites (with intelligent fallback extraction)
- ✅ Company career pages

## Configuration

### Base URL

By default, the extension connects to `http://localhost:3000`. To change this:

1. Open Chrome DevTools (F12)
2. Go to the Console tab
3. The extension will use the URL stored in Chrome storage

For production, update the `baseUrl` in `background.js` or use Chrome storage API.

## Files Structure

```
chrome-extension/
├── manifest.json          # Extension configuration and permissions
├── background.js          # Service worker for background tasks
├── content.js             # Main content script (floater UI)
├── content.css            # Styles for the floater interface
├── job-scraper.js         # Job detail extraction logic
├── icon16.png             # Extension icon (16x16)
├── icon48.png             # Extension icon (48x48)
├── icon128.png            # Extension icon (128x128)
└── README.md              # This file
```

## Technical Details

### Permissions

- `activeTab`: Access to current tab for job scraping
- `scripting`: Inject job scraper script
- `storage`: Store user preferences
- `cookies`: Access authentication cookies

### API Endpoints

The extension communicates with these JobMélan API endpoints:

- `GET /api/extension/resumes` - Fetch user's resumes
- `POST /api/extension/tailor` - Tailor resume to job description
- `POST /api/extension/cover-letter` - Generate cover letter
- `POST /api/extension/save-job` - Save job application

### Browser Compatibility

- ✅ Chrome (Manifest V3)
- ✅ Edge (Chromium-based)
- ✅ Brave
- ⚠️ Firefox (requires Manifest V2 conversion)
- ⚠️ Safari (requires separate development)

## Troubleshooting

### Extension Not Appearing
- Ensure the extension is enabled in `chrome://extensions/`
- Refresh the page you're on
- Check browser console for errors (F12)

### "Not Authenticated" Error
- Make sure you're logged into JobMélan in a browser tab
- The extension uses session cookies for authentication
- Try logging out and back in

### Job Details Not Extracting
- The extension works best on structured job sites
- For generic sites, it will extract from page content
- Ensure you're on the actual job posting page, not a listing page

### Connection Errors
- Verify JobMélan is running on the configured base URL
- Check network connectivity
- Ensure CORS is properly configured on the backend

## Development

### Making Changes

1. **Edit Files**: Make changes to any extension files
2. **Reload Extension**: Go to `chrome://extensions/` and click the reload icon
3. **Test**: Refresh the page you're testing on

### Debugging

- Open Chrome DevTools (F12) on any page
- Check Console for extension errors
- Use `chrome.runtime.sendMessage()` for background script debugging
- Inspect the floater panel elements in Elements tab

## Brand Colors

The extension uses JobMélan's brand palette:
- Primary: `#5c824d` (Olive 600)
- Secondary: `#76a465` (Olive 500)
- Success: `#16a34a` (Green 600)
- Error: `#dc2626` (Red 600)
- Text: `#1c1917` (Stone 900)
- Background: `#fafaf9` (Stone 50)

## Requirements

- JobMélan SaaS must be running and accessible
- User must be logged in to JobMélan
- Chrome browser with Manifest V3 support
- At least one resume created in JobMélan

## Version History

### v2.0.0 (Current)
- Complete rewrite with modern architecture
- Improved job scraping for multiple sites
- Better error handling and user feedback
- Enhanced UI/UX with animations
- Proper authentication flow
- Production-ready code structure

### v1.0.0 (Legacy)
- Initial version with basic functionality
- Simple popup interface
- Basic job scraping

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Ensure all requirements are met
4. Contact JobMélan support if issues persist

## License

Part of the JobMélan SaaS platform.
