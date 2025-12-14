// Lever Auto-Apply Script
// This script runs in the context of a Lever job application page
// It fills out the application form automatically using resume data

(function() {
  'use strict';

  // Wait for element with multiple strategies
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        let element = null;
        
        // Try selector first
        if (selector) {
          element = document.querySelector(selector);
        }
        
        // If not found and selector looks like a description, try finding by label
        if (!element && selector && !selector.includes('[') && !selector.includes('.')) {
          element = findInputByLabel(selector);
        }
        
        if (element) {
          clearInterval(checkInterval);
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Element not found: ${selector}`));
        }
      }, 100);
    });
  }

  // Find input by label text (for Lever forms)
  function findInputByLabel(labelText) {
    const labels = Array.from(document.querySelectorAll('label'));
    for (const label of labels) {
      const text = label.textContent?.toLowerCase() || '';
      if (text.includes(labelText.toLowerCase())) {
        // Try to find input associated with label
        const inputId = label.getAttribute('for');
        if (inputId) {
          const input = document.getElementById(inputId);
          if (input && (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA' || input.tagName === 'SELECT')) {
            return input;
          }
        }
        // Try to find input within label
        const input = label.querySelector('input, textarea, select');
        if (input) return input;
        // Try to find input next to label
        let nextSibling = label.nextElementSibling;
        let attempts = 0;
        while (nextSibling && attempts < 5) {
          if (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT') {
            return nextSibling;
          }
          nextSibling = nextSibling.nextElementSibling;
          attempts++;
        }
        // Try parent container
        const parent = label.parentElement;
        if (parent) {
          const input = parent.querySelector('input, textarea, select');
          if (input) return input;
        }
      }
    }
    
    // Also try finding by placeholder or aria-label
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of inputs) {
      const placeholder = input.getAttribute('placeholder')?.toLowerCase() || '';
      const ariaLabel = input.getAttribute('aria-label')?.toLowerCase() || '';
      const name = input.getAttribute('name')?.toLowerCase() || '';
      const id = input.getAttribute('id')?.toLowerCase() || '';
      
      if (placeholder.includes(labelText.toLowerCase()) || 
          ariaLabel.includes(labelText.toLowerCase()) ||
          name.includes(labelText.toLowerCase()) ||
          id.includes(labelText.toLowerCase())) {
        return input;
      }
    }
    
    return null;
  }

  // Fill input field with better React support
  function fillInput(selector, value, options = {}) {
    return new Promise(async (resolve) => {
      try {
        let element = options.element;
        
        if (!element && selector) {
          try {
            element = await waitForElement(selector, options.timeout || 5000);
          } catch (e) {
            // Try finding by label if selector fails
            if (selector && !selector.includes('[') && !selector.includes('.')) {
              element = findInputByLabel(selector);
            }
          }
        }
        
        if (!element) {
          resolve({ success: false, selector, error: 'Element not found' });
          return;
        }
        
        // Focus and clear
        element.focus();
        element.click(); // Sometimes needed for React
        
        // Clear existing value
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.value = '';
          
          // For React, trigger native value setter
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype || window.HTMLTextAreaElement.prototype, 
            'value'
          )?.set;
          
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(element, '');
          }
          
          // Trigger input event
          element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        }
        
        // Set new value
        element.value = value;
        
        // For React components
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype || window.HTMLTextAreaElement.prototype, 
          'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(element, value);
        }
        
        // Trigger all events React might listen to
        ['input', 'change', 'blur', 'keyup', 'keydown', 'paste'].forEach(eventType => {
          const event = new Event(eventType, { bubbles: true, cancelable: true });
          element.dispatchEvent(event);
        });
        
        // Also try React's synthetic events
        if (element._valueTracker) {
          element._valueTracker.setValue('');
          element._valueTracker.setValue(value);
        }
        
        // Small delay to ensure React processes it
        await new Promise(r => setTimeout(r, 100));
        
        resolve({ success: true, selector, value });
      } catch (error) {
        resolve({ success: false, selector, error: error.message });
      }
    });
  }

  // Fill textarea
  function fillTextarea(selector, value, options = {}) {
    return fillInput(selector, value, { ...options });
  }

  // Select dropdown option with better Lever support
  function selectDropdown(selector, value, options = {}) {
    return new Promise(async (resolve) => {
      try {
        let element = options.element;
        
        if (!element && selector) {
          try {
            element = await waitForElement(selector, options.timeout || 5000);
          } catch (e) {
            // Try finding by label if selector fails
            if (selector && !selector.includes('[') && !selector.includes('.')) {
              element = findInputByLabel(selector);
            }
          }
        }
        
        if (!element) {
          resolve({ success: false, selector, error: 'Element not found' });
          return;
        }
        
        // For native select
        if (element.tagName === 'SELECT') {
          // Try exact match first
          const exactOption = Array.from(element.options).find(opt => 
            opt.value.toLowerCase() === value.toLowerCase() || 
            opt.text.toLowerCase() === value.toLowerCase()
          );
          
          if (exactOption) {
            element.value = exactOption.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('input', { bubbles: true }));
            resolve({ success: true, selector, value });
            return;
          }
          
          // Try partial match
          const partialOption = Array.from(element.options).find(opt => 
            opt.text.toLowerCase().includes(value.toLowerCase()) ||
            opt.value.toLowerCase().includes(value.toLowerCase())
          );
          
          if (partialOption) {
            element.value = partialOption.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('input', { bubbles: true }));
            resolve({ success: true, selector, value });
            return;
          }
          
          resolve({ success: false, selector, error: 'Option not found in select' });
          return;
        }
        
        // For custom React select components (like Lever uses)
        // Scroll element into view first
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 200));
        
        // Focus and click
        element.focus();
        element.click();
        
        // Wait for dropdown to open - Lever dropdowns can take time
        await new Promise(r => setTimeout(r, 600));
        
        // Look for dropdown options - try multiple selectors
        // Wait a bit more for dropdown to fully render
        await new Promise(r => setTimeout(r, 200));
        
        const optionSelectors = [
          '[role="option"]',
          '[role="listbox"] [role="option"]',
          '[class*="option"]',
          '[class*="Option"]',
          '[class*="menu-item"]',
          '[class*="MenuItem"]',
          '[class*="dropdown"] [role="option"]',
          'li[role="option"]',
          'div[role="option"]',
          'span[role="option"]'
        ];
        
        let allOptions = [];
        for (const optSelector of optionSelectors) {
          allOptions = Array.from(document.querySelectorAll(optSelector));
          // Filter to only visible options
          allOptions = allOptions.filter(opt => {
            const style = window.getComputedStyle(opt);
            return style.display !== 'none' && style.visibility !== 'hidden' && opt.offsetParent !== null;
          });
          if (allOptions.length > 0) {
            console.log(`Found ${allOptions.length} visible dropdown options using selector: ${optSelector}`);
            break;
          }
        }
        
        console.log(`Total ${allOptions.length} dropdown options found for value: ${value}`);
        
        // Try to find option by text content
        // First try exact match
        let option = allOptions.find(el => {
          const text = (el.textContent || el.innerText || '').trim().toLowerCase();
          const searchValue = value.toLowerCase().trim();
          return text === searchValue;
        });
        
        // Then try starts with
        if (!option) {
          option = allOptions.find(el => {
            const text = (el.textContent || el.innerText || '').trim().toLowerCase();
            const searchValue = value.toLowerCase().trim();
            return text.startsWith(searchValue) || searchValue.startsWith(text);
          });
        }
        
        // Then try contains
        if (!option) {
          option = allOptions.find(el => {
            const text = (el.textContent || el.innerText || '').trim().toLowerCase();
            const searchValue = value.toLowerCase().trim();
            return text.includes(searchValue) || searchValue.includes(text);
          });
        }
        
        // Try word-by-word matching for multi-word values
        if (!option && value.includes(' ')) {
          const searchWords = value.toLowerCase().trim().split(/\s+/);
          option = allOptions.find(el => {
            const text = (el.textContent || el.innerText || '').trim().toLowerCase();
            return searchWords.every(word => text.includes(word));
          });
        }
        
        if (option) {
          // Scroll option into view
          option.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          await new Promise(r => setTimeout(r, 100));
          
          option.click();
          await new Promise(r => setTimeout(r, 300));
          
          // Verify selection
          const selectedText = element.textContent || element.value || '';
          if (selectedText.toLowerCase().includes(value.toLowerCase())) {
            resolve({ success: true, selector, value });
          } else {
            resolve({ success: false, selector, error: 'Option clicked but not selected' });
          }
        } else {
          console.warn(`Option "${value}" not found in dropdown. Available options:`, 
            allOptions.slice(0, 5).map(o => o.textContent?.trim()).filter(Boolean)
          );
          resolve({ success: false, selector, error: `Option "${value}" not found` });
        }
      } catch (error) {
        console.error('Dropdown selection error:', error);
        resolve({ success: false, selector, error: error.message });
      }
    });
  }

  // Handle checkbox/radio buttons with better matching
  function checkRadioOrCheckbox(labelText, value) {
    return new Promise(async (resolve) => {
      try {
        // First, try to find the question label
        const questionLabels = Array.from(document.querySelectorAll('label, div[class*="label"], span[class*="label"]'));
        let questionLabel = null;
        
        for (const label of questionLabels) {
          const text = (label.textContent || label.innerText || '').toLowerCase();
          if (text.includes(labelText.toLowerCase()) && text.length < 200) {
            questionLabel = label;
            break;
          }
        }
        
        // If we found the question, look for options near it
        if (questionLabel) {
          // Find the container (parent or next sibling)
          let container = questionLabel.parentElement;
          if (!container) {
            container = questionLabel.nextElementSibling;
          }
          
          // Look for radio/checkbox inputs in the container
          const inputs = container ? 
            Array.from(container.querySelectorAll('input[type="radio"], input[type="checkbox"]')) :
            Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
          
          for (const input of inputs) {
            // Find the label for this input
            const inputId = input.id || input.getAttribute('id');
            let inputLabel = null;
            
            if (inputId) {
              inputLabel = document.querySelector(`label[for="${inputId}"]`);
            }
            
            if (!inputLabel) {
              // Try to find label as parent or sibling
              inputLabel = input.closest('label') || 
                         input.parentElement?.querySelector('label') ||
                         input.nextElementSibling;
            }
            
            const inputLabelText = (inputLabel?.textContent || inputLabel?.innerText || input.value || '').toLowerCase();
            const searchValue = value.toLowerCase();
            
            // Check if this option matches
            if (inputLabelText.includes(searchValue) || 
                searchValue.includes(inputLabelText) ||
                (searchValue === 'yes' && (inputLabelText.includes('yes') || inputLabelText.includes('i am'))) ||
                (searchValue === 'no' && inputLabelText.includes('no'))) {
              
              // Scroll into view
              input.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await new Promise(r => setTimeout(r, 100));
              
              input.click();
              input.checked = true;
              
              // Trigger events
              input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
              input.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
              input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
              
              await new Promise(r => setTimeout(r, 200));
              
              // Verify it's checked
              if (input.checked) {
                resolve({ success: true, labelText, value });
                return;
              }
            }
          }
        }
        
        // Fallback: search all radio/checkbox inputs
        const allInputs = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
        for (const input of allInputs) {
          const inputLabel = document.querySelector(`label[for="${input.id}"]`) || 
                           input.closest('label') ||
                           input.parentElement?.querySelector('label');
          const inputText = (inputLabel?.textContent || inputLabel?.innerText || input.value || '').toLowerCase();
          const searchValue = value.toLowerCase();
          
          if (inputText.includes(searchValue) || searchValue.includes(inputText)) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(r => setTimeout(r, 100));
            input.click();
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(r => setTimeout(r, 200));
            if (input.checked) {
              resolve({ success: true, labelText, value });
              return;
            }
          }
        }
        
        resolve({ success: false, labelText, error: 'Option not found' });
      } catch (error) {
        resolve({ success: false, labelText, error: error.message });
      }
    });
  }

  // Upload file using DataTransfer API (like Simplify/JobRight do)
  function uploadFile(fileInput, fileBlob, fileName, fileType) {
    return new Promise(async (resolve) => {
      try {
        if (!fileInput) {
          resolve({ success: false, error: 'File input not found' });
          return;
        }
        
        if (!fileBlob) {
          resolve({ success: false, error: 'File data not provided' });
          return;
        }
        
        console.log('Creating File object from blob...', {
          fileName,
          fileType,
          blobSize: fileBlob.size,
          blobType: fileBlob.type
        });
        
        // Ensure we have a proper Blob
        if (!(fileBlob instanceof Blob)) {
          console.warn('fileBlob is not a Blob, converting...', typeof fileBlob);
          fileBlob = new Blob([fileBlob], { type: fileType || 'application/pdf' });
        }
        
        // Create a File object from the blob
        const file = new File([fileBlob], fileName || 'resume.pdf', { 
          type: fileType || 'application/pdf',
          lastModified: Date.now()
        });
        
        console.log('File object created:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        // Create a DataTransfer object
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        console.log('DataTransfer created, assigning files to input...');
        
        // Assign the files to the input
        fileInput.files = dataTransfer.files;
        
        // Verify the file was set BEFORE triggering events
        if (!fileInput.files || fileInput.files.length === 0) {
          console.error('Files were not assigned to input');
          resolve({ success: false, error: 'File was not set on input' });
          return;
        }
        
        console.log('File assigned successfully:', {
          fileName: fileInput.files[0].name,
          fileSize: fileInput.files[0].size,
          fileType: fileInput.files[0].type
        });
        
        // Trigger events to notify React/form handlers
        // Focus the input first
        fileInput.focus();
        
        // Trigger change event (most important for form handlers)
        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
        fileInput.dispatchEvent(changeEvent);
        
        // Trigger input event
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        fileInput.dispatchEvent(inputEvent);
        
        // Trigger focus/blur to simulate user interaction
        fileInput.dispatchEvent(new Event('focus', { bubbles: true }));
        fileInput.dispatchEvent(new Event('blur', { bubbles: true }));
        
        // Also try React's synthetic events
        if (fileInput._valueTracker) {
          fileInput._valueTracker.setValue('');
        }
        
        // Wait a bit for React to process
        await new Promise(r => setTimeout(r, 200));
        
        // Final verification
        if (fileInput.files && fileInput.files.length > 0) {
          console.log('File uploaded successfully:', fileInput.files[0].name);
          resolve({ 
            success: true, 
            fileName: fileInput.files[0].name,
            fileSize: fileInput.files[0].size
          });
        } else {
          resolve({ success: false, error: 'File was not set on input after events' });
        }
      } catch (error) {
        console.error('File upload error:', error);
        resolve({ success: false, error: error.message });
      }
    });
  }
  
  // Convert base64 to blob
  function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Extract label/question text for an input element
  function extractFieldLabel(input) {
    let labelText = '';
    const inputId = input.id || input.name;
    
    // Strategy 1: Find label by 'for' attribute
    if (inputId) {
      const label = document.querySelector(`label[for="${inputId}"]`);
      if (label) {
        labelText = (label.textContent || label.innerText || '').trim();
      }
    }
    
    // Strategy 2: Check if input is inside a label
    if (!labelText) {
      const parentLabel = input.closest('label');
      if (parentLabel) {
        labelText = (parentLabel.textContent || parentLabel.innerText || '').trim();
      }
    }
    
    // Strategy 3: Check parent container for labels
    if (!labelText) {
      const container = input.closest('div, fieldset, section, form, li');
      if (container) {
        // Look for label/text before the input (common in Lever forms)
        let prevSibling = input.previousElementSibling;
        let attempts = 0;
        while (prevSibling && attempts < 5) {
          const tagName = prevSibling.tagName.toLowerCase();
          const classList = prevSibling.classList.toString().toLowerCase();
          
          if (tagName === 'label' || 
              classList.includes('label') ||
              (tagName === 'div' && (prevSibling.textContent || '').trim().length > 0 && (prevSibling.textContent || '').trim().length < 200)) {
            const text = (prevSibling.textContent || prevSibling.innerText || '').trim();
            if (text && !text.includes('http') && text.length > 0) {
              labelText = text;
              break;
            }
          }
          prevSibling = prevSibling.previousElementSibling;
          attempts++;
        }
        
        // If not found, look in container (check all text nodes)
        if (!labelText) {
          // Look for label elements
          const labels = container.querySelectorAll('label, div[class*="label"], span[class*="label"], p[class*="label"], div[class*="question"], span[class*="question"]');
          for (const label of Array.from(labels)) {
            const text = (label.textContent || label.innerText || '').trim();
            if (text && text.length > 0 && text.length < 200 && !text.includes('http')) {
              labelText = text;
              break;
            }
          }
        }
        
        // Also check parent's previous sibling (Lever often has question in previous div)
        if (!labelText && container.previousElementSibling) {
          const prevContainer = container.previousElementSibling;
          const text = (prevContainer.textContent || prevContainer.innerText || '').trim();
          if (text && text.length > 0 && text.length < 200 && !text.includes('http')) {
            labelText = text;
          }
        }
        
        // For Lever custom fields (cards[...][fieldX]), try to find question text in container
        if (!labelText && input.name && input.name.match(/^cards\[/)) {
          // Look for any text node or element with question-like text in the container
          const containerText = (container.textContent || '').trim();
          const lines = containerText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.length < 200);
          if (lines.length > 0) {
            // Take first substantial line that doesn't look like an option
            for (const line of lines) {
              if (!line.match(/^(yes|no|other|select|choose)/i) && line.length > 10) {
                labelText = line;
                break;
              }
            }
          }
        }
      }
    }
    
    // Strategy 4: Check aria-label
    if (!labelText) {
      const ariaLabel = input.getAttribute('aria-label');
      if (ariaLabel) {
        labelText = ariaLabel.trim();
      }
    }
    
    // Strategy 5: Check placeholder
    if (!labelText && input.placeholder) {
      labelText = input.placeholder.trim();
    }
    
    return labelText;
  }

  // Detect all form fields and categorize them (grouped by question)
  function detectFormFields() {
    const fields = {
      required: [],
      optional: []
    };
    
    // Map to track grouped fields (for radio/checkbox groups)
    const fieldGroups = new Map(); // key: groupKey, value: { name, elements, isRequired, type }
    
    // Find all form inputs, selects, textareas
    const allInputs = Array.from(document.querySelectorAll('input, select, textarea'));
    
    for (const input of allInputs) {
      // Skip hidden inputs and file inputs (handled separately)
      if (input.type === 'hidden') continue;
      
      const style = window.getComputedStyle(input);
      if (style.display === 'none' || style.visibility !== 'hidden' && input.offsetParent === null) continue;
      
      // Skip if it's a submit button
      if (input.type === 'submit' || input.type === 'button') continue;
      
      // Extract label
      let labelText = extractFieldLabel(input);
      
      // Check if required (has asterisk or required attribute)
      const isRequired = input.hasAttribute('required') ||
                        input.getAttribute('aria-required') === 'true' ||
                        labelText.includes('✱') ||
                        labelText.includes('*') ||
                        (input.closest('div')?.querySelector('[class*="required"], [class*="Required"]'));
      
      // Clean label text
      const cleanLabel = labelText.replace(/✱/g, '').replace(/\*/g, '').trim();
      
      // For radio/checkbox: group by question
      if (input.type === 'radio' || input.type === 'checkbox') {
        // Create group key: use name attribute if available, otherwise use container + label
        const groupKey = input.name || 
                        (input.closest('fieldset, div[class*="question"], div[class*="field"]')?.id || '') + 
                        (cleanLabel || '');
        
        if (!fieldGroups.has(groupKey)) {
          // Get question label (remove option-specific text)
          let questionLabel = cleanLabel;
          
          // If label contains option text (like "Yes", "No", "English"), try to find parent question
          if (!questionLabel || questionLabel.length < 10 || 
              /^(yes|no|other|select|choose|english|french|chinese|python|r)$/i.test(questionLabel)) {
            const container = input.closest('fieldset, div[class*="question"], div[class*="field"], li');
            if (container) {
              // Look for question text in container (before the options)
              const containerText = (container.textContent || '').trim();
              const lines = containerText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
              
              // Find first line that looks like a question (not an option)
              for (const line of lines) {
                if (line.length > 10 && 
                    !line.match(/^(yes|no|other|select|choose|english|french|chinese|python|r|authorized|visa|sponsorship)/i) &&
                    (line.includes('?') || line.length > 20)) {
                  questionLabel = line.substring(0, 100); // Limit length
                  break;
                }
              }
              
              // Fallback: use container's first text node
              if (!questionLabel || questionLabel.length < 10) {
                const firstText = container.querySelector('label, div[class*="label"], span[class*="label"], p[class*="label"]');
                if (firstText) {
                  questionLabel = (firstText.textContent || '').trim().substring(0, 100);
                }
              }
            }
          }
          
          // Final fallback for question label
          if (!questionLabel || questionLabel.length < 5) {
            questionLabel = input.name?.replace(/cards\[[^\]]+\]\[field\d+\]/i, 'Custom question') || 
                           'Question';
          }
          
          fieldGroups.set(groupKey, {
            name: questionLabel,
            elements: [],
            isRequired: isRequired,
            type: input.type === 'radio' ? 'radio' : 'checkbox'
          });
        }
        
        // Add this input to the group
        fieldGroups.get(groupKey).elements.push(input);
      } else {
        // For non-radio/checkbox: add as individual field
        const fieldName = cleanLabel || 
                         (input.name?.replace(/cards\[[^\]]+\]\[field\d+\]/i, 'Custom question') || '') ||
                         input.id || 
                         input.placeholder ||
                         'Unknown field';
        
        const fieldInfo = {
          name: fieldName,
          element: input,
          elements: [input], // Single element array for consistency
          type: input.tagName.toLowerCase(),
          filled: false
        };
        
        if (isRequired) {
          fields.required.push(fieldInfo);
        } else {
          fields.optional.push(fieldInfo);
        }
      }
    }
    
    // Add grouped fields
    for (const [groupKey, group] of fieldGroups) {
      const fieldInfo = {
        name: group.name,
        element: group.elements[0], // Primary element for reference
        elements: group.elements, // All elements in group
        type: group.type,
        filled: false
      };
      
      if (group.isRequired) {
        fields.required.push(fieldInfo);
      } else {
        fields.optional.push(fieldInfo);
      }
    }
    
    return fields;
  }
  
  // Check if a field is filled (handles both single elements and groups)
  function isFieldFilled(fieldInfo) {
    // If fieldInfo has elements array (grouped field), check if any is filled
    if (fieldInfo.elements && Array.isArray(fieldInfo.elements)) {
      if (fieldInfo.type === 'radio') {
        // For radio: at least one must be checked
        return fieldInfo.elements.some(el => el.checked);
      } else if (fieldInfo.type === 'checkbox') {
        // For checkbox: at least one must be checked
        return fieldInfo.elements.some(el => el.checked);
      } else {
        // For other grouped fields: check first element
        return isFieldFilled(fieldInfo.elements[0]);
      }
    }
    
    // Single element check
    const element = fieldInfo.element || fieldInfo;
    if (!element) return false;
    
    if (element.tagName === 'INPUT') {
      if (element.type === 'checkbox' || element.type === 'radio') {
        return element.checked;
      } else if (element.type === 'file') {
        return element.files && element.files.length > 0;
      } else {
        return element.value && element.value.trim() !== '';
      }
    } else if (element.tagName === 'SELECT') {
      return element.value && element.value !== '' && element.value !== 'Select...';
    } else if (element.tagName === 'TEXTAREA') {
      return element.value && element.value.trim() !== '';
    }
    
    return false;
  }

  // Main auto-apply function
  async function autoApply(resumeData) {
    const results = {
      success: false,
      steps: [],
      errors: [],
      warnings: [],
      fieldStatus: {
        required: [],
        optional: []
      }
    };
    
      // Detect all form fields first - wait a bit for page to fully load
      await new Promise(r => setTimeout(r, 500));
      let detectedFields = detectFormFields();
      console.log('Detected form fields:', {
        required: detectedFields.required.length,
        optional: detectedFields.optional.length,
        requiredNames: detectedFields.required.map(f => f.name)
      });
      
      // Store field info for status display (grouped fields)
      results.fieldStatus.required = detectedFields.required.map(f => ({
        name: f.name,
        filled: false,
        fieldInfo: f // Store reference to field info for later updates
      }));
      results.fieldStatus.optional = detectedFields.optional.map(f => ({
        name: f.name,
        filled: false,
        fieldInfo: f // Store reference to field info for later updates
      }));

    try {
      console.log('Starting auto-apply with resume data:', resumeData);
      console.log('Location data:', resumeData.basics?.location);
      
      // Wait a bit for page to be ready
      await new Promise(r => setTimeout(r, 500));
      
      // Step 1: Handle Resume Upload FIRST (before other fields)
      // Try to get blob from window if not in resumeData (fallback)
      let fileBlob = resumeData.resumeFileBlob || window.jobmelanResumeFileBlob;
      let fileName = resumeData.resumeFileName || window.jobmelanResumeFileName || 'resume.pdf';
      let fileType = resumeData.resumeFileType || window.jobmelanResumeFileType || 'application/pdf';
      
      console.log('Step 1: Checking for resume file upload...', {
        hasResumeFileBlob: !!resumeData.resumeFileBlob,
        hasWindowBlob: !!window.jobmelanResumeFileBlob,
        resumeFileName: fileName,
        resumeFileType: fileType,
        blobSize: fileBlob ? fileBlob.size : 0
      });
      
      // Try multiple selectors for file input (Lever might use different ones)
      const fileInputSelectors = [
        'input[type="file"][name*="resume"]',
        'input[type="file"][name*="cv"]',
        'input[type="file"][name*="file"]',
        'input[type="file"]',
        'input[accept*="pdf"]',
        'input[accept*="application/pdf"]'
      ];
      
      let fileInput = null;
      for (const selector of fileInputSelectors) {
        fileInput = document.querySelector(selector);
        if (fileInput) {
          console.log('File input found with selector:', selector, fileInput);
          break;
        }
      }
      
      if (fileInput) {
        console.log('File input found:', {
          name: fileInput.name,
          id: fileInput.id,
          accept: fileInput.accept,
          type: fileInput.type,
          visible: fileInput.offsetParent !== null
        });
        
        if (fileBlob) {
          try {
            console.log('Attempting to upload resume file...');
            
            // Ensure we have a Blob object
            let blobToUpload = fileBlob;
            if (typeof blobToUpload === 'string') {
              // It's base64 string, convert to blob
              console.log('Converting base64 string to blob');
              blobToUpload = base64ToBlob(blobToUpload, fileType || 'application/pdf');
            } else if (!(blobToUpload instanceof Blob)) {
              // Try to convert array/object to blob
              console.log('Converting to blob from:', typeof blobToUpload);
              blobToUpload = new Blob([blobToUpload], { type: fileType || 'application/pdf' });
            }
            
            console.log('Uploading file:', {
              fileName: fileName,
              fileType: fileType,
              blobSize: blobToUpload.size,
              blobType: blobToUpload.type
            });
            
            const uploadResult = await uploadFile(
              fileInput, 
              blobToUpload, 
              fileName,
              fileType
            );
            
            console.log('Upload result:', uploadResult);
            results.steps.push({ step: 'resume_upload', ...uploadResult });
            
            // Update field status
            const resumeField = detectedFields.required.find(f => 
              f.name.toLowerCase().includes('resume') || 
              f.name.toLowerCase().includes('cv') || 
              (f.element === fileInput) ||
              (f.elements && f.elements.includes(fileInput))
            );
            if (resumeField) {
              resumeField.filled = uploadResult.success;
              const statusField = results.fieldStatus.required.find(sf => 
                sf.name === resumeField.name || (sf.fieldInfo && sf.fieldInfo === resumeField)
              );
              if (statusField) statusField.filled = uploadResult.success;
            }
            
            if (!uploadResult.success) {
              results.warnings.push('Resume file upload failed: ' + (uploadResult.error || 'Unknown error'));
            }
          } catch (error) {
            console.error('Resume file upload error:', error);
            results.warnings.push('Resume file upload error: ' + error.message);
            results.steps.push({ 
              step: 'resume_upload', 
              success: false, 
              error: error.message
            });
          }
        } else {
          console.warn('Resume file blob not provided');
          console.log('Available data:', {
            resumeDataKeys: Object.keys(resumeData),
            windowKeys: Object.keys(window).filter(k => k.includes('resume') || k.includes('jobmelan'))
          });
          results.warnings.push('Resume file not provided. Please upload your resume PDF manually using the upload button next to the resume selector.');
          results.steps.push({ 
            step: 'resume_upload', 
            success: false, 
            requiresManualUpload: true,
            message: 'Resume file data not available. Please click the upload icon (↑) next to the resume selector to upload your PDF first.'
          });
        }
      } else {
        console.warn('File input not found on page');
        results.warnings.push('Resume file input not found on this page.');
      }
      
      // Step 2: Fill Full Name - Proper case (not all caps)
      if (resumeData.basics?.name) {
        // Convert to proper case (Title Case)
        const properCaseName = resumeData.basics.name
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        const nameElement = findInputByLabel('full name') || 
                           findInputByLabel('name') ||
                           document.querySelector('input[name*="name"], input[id*="name"]');
        
        if (nameElement) {
          const nameResult = await fillInput('', properCaseName, { element: nameElement });
          results.steps.push({ step: 'full_name', ...nameResult });
          
          // Update field status
          const field = detectedFields.required.find(f => 
            f.name.toLowerCase().includes('name') || 
            (f.element === nameElement) ||
            (f.elements && f.elements.includes(nameElement))
          );
          if (field) {
            field.filled = nameResult.success;
            // Update status field
            const statusField = results.fieldStatus.required.find(sf => 
              sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
            );
            if (statusField) statusField.filled = nameResult.success;
          }
        } else {
          results.warnings.push('Name field not found');
        }
      }

      // Step 3: Fill Email
      if (resumeData.basics?.email) {
        const emailElement = findInputByLabel('email') ||
                            document.querySelector('input[type="email"], input[name*="email"], input[id*="email"]');
        
        if (emailElement) {
          const emailResult = await fillInput('', resumeData.basics.email, { element: emailElement });
          results.steps.push({ step: 'email', ...emailResult });
          
          // Update field status
          const field = detectedFields.required.find(f => 
            f.name.toLowerCase().includes('email') || 
            (f.element === emailElement) ||
            (f.elements && f.elements.includes(emailElement))
          );
          if (field) {
            field.filled = emailResult.success;
            const statusField = results.fieldStatus.required.find(sf => 
              sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
            );
            if (statusField) statusField.filled = emailResult.success;
          }
        } else {
          results.warnings.push('Email field not found');
        }
      }

      // Step 4: Fill Phone
      if (resumeData.basics?.phone) {
        const phoneElement = findInputByLabel('phone') ||
                            document.querySelector('input[type="tel"], input[name*="phone"], input[id*="phone"]');
        
        if (phoneElement) {
          const phoneResult = await fillInput('', resumeData.basics.phone, { element: phoneElement });
          results.steps.push({ step: 'phone', ...phoneResult });
          
          // Update field status
          const field = detectedFields.required.find(f => 
            f.name.toLowerCase().includes('phone') || 
            (f.element === phoneElement) ||
            (f.elements && f.elements.includes(phoneElement))
          );
          if (field) {
            field.filled = phoneResult.success;
            const statusField = results.fieldStatus.required.find(sf => 
              sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
            );
            if (statusField) statusField.filled = phoneResult.success;
          }
        } else {
          results.warnings.push('Phone field not found');
        }
      }

      // Step 5: Fill Current Location - Handle autocomplete/dropdown that loads slowly
      const locationValue = resumeData.basics?.location || '';
      console.log('Step 5: Attempting to fill location with value:', locationValue);
      
      if (locationValue && locationValue.trim() !== '') {
        let locationElement = null;
        let attempts = 0;
        const maxAttempts = 20; // Try for up to 10 seconds (Lever location autocomplete loads slowly)
        
        // Keep trying to find location field as it may load slowly
        while (!locationElement && attempts < maxAttempts) {
          // Try multiple strategies to find location field
          locationElement = findInputByLabel('current location') || 
                           findInputByLabel('location') ||
                           findInputByLabel('city') ||
                           document.querySelector('input[name*="location" i]') ||
                           document.querySelector('input[id*="location" i]') ||
                           document.querySelector('input[placeholder*="location" i]') ||
                           document.querySelector('input[placeholder*="city" i]') ||
                           document.querySelector('input[aria-label*="location" i]') ||
                           document.querySelector('input[aria-label*="city" i]');
          
          // Also try to find by nearby text
          if (!locationElement) {
            const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
            for (const input of allInputs) {
              // Check parent containers for location-related text
              const container = input.closest('div, fieldset, section, form');
              if (container) {
                const containerText = (container.textContent || '').toLowerCase();
                if (containerText.includes('location') || containerText.includes('city') || containerText.includes('where are you')) {
                  // Make sure it's not already used for something else
                  const name = input.name?.toLowerCase() || '';
                  const id = input.id?.toLowerCase() || '';
                  if (!name.includes('email') && !name.includes('phone') && !name.includes('name') && 
                      !id.includes('email') && !id.includes('phone') && !id.includes('name')) {
                    locationElement = input;
                    console.log('Found location by container text:', containerText.substring(0, 50));
                    break;
                  }
                }
              }
            }
          }
          
          if (!locationElement) {
            await new Promise(r => setTimeout(r, 500)); // Wait 500ms between attempts
            attempts++;
          }
        }
        
        if (locationElement) {
          console.log('Found location element after', attempts, 'attempts:', locationElement, {
            name: locationElement.name,
            id: locationElement.id,
            placeholder: locationElement.placeholder,
            value: locationElement.value,
            className: locationElement.className
          });
          
          // Scroll into view to ensure it's visible
          locationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(r => setTimeout(r, 300));
          
          // Clear any existing value first
          locationElement.value = '';
          locationElement.dispatchEvent(new Event('input', { bubbles: true }));
          locationElement.dispatchEvent(new Event('change', { bubbles: true }));
          await new Promise(r => setTimeout(r, 300));
          
          // Focus and click to trigger autocomplete dropdown (Lever uses autocomplete)
          locationElement.focus();
          locationElement.click();
          
          // Wait for autocomplete to initialize (Lever location takes time to load)
          console.log('Waiting for location autocomplete to initialize...');
          await new Promise(r => setTimeout(r, 2000)); // Give it more time to initialize
          
          // Type the location value character by character to trigger autocomplete
          const locationText = locationValue.trim();
          console.log('Typing location:', locationText);
          
          // Use native value setter for React compatibility
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 
            'value'
          )?.set;
          
          for (let i = 0; i < locationText.length; i++) {
            const partialValue = locationText.substring(0, i + 1);
            
            // Set value using native setter
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(locationElement, partialValue);
            } else {
              locationElement.value = partialValue;
            }
            
            // Trigger events to simulate typing
            locationElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            locationElement.dispatchEvent(new KeyboardEvent('keydown', { key: locationText[i], bubbles: true }));
            locationElement.dispatchEvent(new KeyboardEvent('keypress', { key: locationText[i], bubbles: true }));
            locationElement.dispatchEvent(new KeyboardEvent('keyup', { key: locationText[i], bubbles: true }));
            
            await new Promise(r => setTimeout(r, 150)); // Delay between characters to let autocomplete process
          }
          
          // Wait for autocomplete suggestions to appear and load
          console.log('Waiting for location autocomplete suggestions to load...');
          await new Promise(r => setTimeout(r, 2000)); // Give it time to load suggestions
          
          // Try multiple times to find and click matching autocomplete option
          let optionClicked = false;
          for (let attempt = 0; attempt < 8 && !optionClicked; attempt++) {
            // Try various selectors for autocomplete options - be more aggressive
            const dropdownSelectors = [
              '[role="option"]',
              '[role="listbox"] [role="option"]',
              '[role="combobox"] + * [role="option"]',
              '[class*="option"]',
              '[class*="Option"]',
              '[class*="suggestion"]',
              '[class*="Suggestion"]',
              '[class*="autocomplete"] [role="option"]',
              '[class*="Autocomplete"] [role="option"]',
              '[class*="dropdown"] [role="option"]',
              '[class*="Dropdown"] [role="option"]',
              'li[class*="option"]',
              'div[class*="option"]',
              'ul[class*="menu"] li',
              'ul[class*="Menu"] li',
              '[class*="menu-item"]',
              '[class*="MenuItem"]'
            ];
            
            let dropdownOptions = [];
            for (const selector of dropdownSelectors) {
              try {
                dropdownOptions = Array.from(document.querySelectorAll(selector));
                // Filter to only visible options
                dropdownOptions = dropdownOptions.filter(opt => {
                  const style = window.getComputedStyle(opt);
                  const isVisible = style.display !== 'none' && 
                                   style.visibility !== 'hidden' && 
                                   opt.offsetParent !== null &&
                                   opt.offsetWidth > 0 &&
                                   opt.offsetHeight > 0;
                  return isVisible;
                });
                if (dropdownOptions.length > 0) {
                  console.log(`Found ${dropdownOptions.length} visible location options using selector: ${selector}`);
                  break;
                }
              } catch (e) {
                // Continue to next selector if this one fails
                continue;
              }
            }
            
            // Also try to find options near the location input
            if (dropdownOptions.length === 0) {
              const locationContainer = locationElement.closest('div, form, section');
              if (locationContainer) {
                const nearbyOptions = Array.from(locationContainer.querySelectorAll('li, div[class*="option"], div[role="option"]'));
                dropdownOptions = nearbyOptions.filter(opt => {
                  const style = window.getComputedStyle(opt);
                  return style.display !== 'none' && style.visibility !== 'hidden' && opt.offsetParent !== null;
                });
                if (dropdownOptions.length > 0) {
                  console.log(`Found ${dropdownOptions.length} nearby location options`);
                }
              }
            }
            
            if (dropdownOptions.length > 0) {
              console.log(`Attempt ${attempt + 1}: Checking ${dropdownOptions.length} options for match with "${locationText}"`);
              
              // Log all available options for debugging
              const availableOptions = dropdownOptions.slice(0, 5).map(opt => (opt.textContent || opt.innerText || '').trim());
              console.log('Available options (first 5):', availableOptions);
              
              // Try to find best match - prioritize exact or close matches
              let bestMatch = null;
              let bestScore = 0;
              
              for (const option of dropdownOptions) {
                const optionText = (option.textContent || option.innerText || '').trim();
                const optionTextLower = optionText.toLowerCase();
                const searchValue = locationText.toLowerCase();
                
                // Calculate match score
                let score = 0;
                
                // Exact match gets highest score
                if (optionTextLower === searchValue) {
                  score = 100;
                }
                // Starts with search value
                else if (optionTextLower.startsWith(searchValue)) {
                  score = 80;
                }
                // Contains search value
                else if (optionTextLower.includes(searchValue)) {
                  score = 60;
                }
                // First part (before comma) matches
                else if (optionTextLower.split(',')[0].trim() === searchValue) {
                  score = 70;
                }
                // First part contains search value
                else if (optionTextLower.split(',')[0].trim().includes(searchValue)) {
                  score = 50;
                }
                // Search value contains first part
                else if (searchValue.includes(optionTextLower.split(',')[0].trim())) {
                  score = 40;
                }
                
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = option;
                  console.log(`New best match (score: ${score}): "${optionText}"`);
                }
              }
              
              if (bestMatch && bestScore >= 40) {
                const matchText = (bestMatch.textContent || bestMatch.innerText || '').trim();
                console.log(`Selecting best match (score: ${bestScore}): "${matchText}"`);
                
                // Scroll into view
                bestMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                await new Promise(r => setTimeout(r, 400));
                
                // Try multiple click methods
                try {
                  // Method 1: Direct click
                  bestMatch.click();
                  await new Promise(r => setTimeout(r, 300));
                  
                  // Method 2: Mouse events
                  const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
                  const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
                  const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
                  bestMatch.dispatchEvent(mouseDown);
                  bestMatch.dispatchEvent(mouseUp);
                  bestMatch.dispatchEvent(clickEvent);
                  await new Promise(r => setTimeout(r, 300));
                  
                  // Method 3: If it's a child element, try clicking parent
                  const clickableParent = bestMatch.closest('li, div[role="option"], div[class*="option"]');
                  if (clickableParent && clickableParent !== bestMatch) {
                    clickableParent.click();
                    await new Promise(r => setTimeout(r, 300));
                  }
                  
                  // Wait for selection to register
                  await new Promise(r => setTimeout(r, 800));
                  
                  // Verify selection
                  const currentValue = locationElement.value || locationElement.textContent || '';
                  if (currentValue.toLowerCase().includes(locationText.toLowerCase()) || 
                      matchText.toLowerCase().includes(locationText.toLowerCase())) {
                    console.log('Option selection verified! Current value:', currentValue);
                    optionClicked = true;
                    break;
                  } else {
                    console.log('Selection not verified. Current value:', currentValue, 'Expected:', locationText);
                  }
                } catch (clickError) {
                  console.error('Error clicking option:', clickError);
                }
              } else {
                console.log(`No good match found (best score: ${bestScore})`);
              }
            } else {
              console.log(`No dropdown options found on attempt ${attempt + 1}`);
            }
            
            if (!optionClicked && attempt < 7) {
              console.log(`Waiting before retry ${attempt + 2}...`);
              await new Promise(r => setTimeout(r, 600));
            }
          }
          
          // If no option clicked, try keyboard navigation as fallback
          if (!optionClicked) {
            console.log('No option clicked, trying keyboard navigation fallback...');
            
            // Try Arrow Down + Enter to select first option
            locationElement.focus();
            await new Promise(r => setTimeout(r, 300));
            
            // Press Arrow Down to highlight first option
            locationElement.dispatchEvent(new KeyboardEvent('keydown', { 
              key: 'ArrowDown', 
              code: 'ArrowDown', 
              keyCode: 40, 
              bubbles: true 
            }));
            await new Promise(r => setTimeout(r, 400));
            
            // Press Enter to select
            locationElement.dispatchEvent(new KeyboardEvent('keydown', { 
              key: 'Enter', 
              code: 'Enter', 
              keyCode: 13, 
              bubbles: true 
            }));
            locationElement.dispatchEvent(new KeyboardEvent('keyup', { 
              key: 'Enter', 
              code: 'Enter', 
              keyCode: 13, 
              bubbles: true 
            }));
            await new Promise(r => setTimeout(r, 500));
            
            // Also try Tab as alternative
            locationElement.dispatchEvent(new KeyboardEvent('keydown', { 
              key: 'Tab', 
              code: 'Tab', 
              keyCode: 9, 
              bubbles: true 
            }));
            await new Promise(r => setTimeout(r, 300));
            
            // Also trigger blur to finalize
            locationElement.dispatchEvent(new Event('blur', { bubbles: true }));
            locationElement.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(r => setTimeout(r, 400));
            
            // Check if value was set
            const finalValueAfterKeyboard = locationElement.value || locationElement.textContent || '';
            if (finalValueAfterKeyboard.toLowerCase().includes(locationText.toLowerCase())) {
              console.log('Keyboard navigation succeeded! Value:', finalValueAfterKeyboard);
              optionClicked = true;
            } else {
              console.log('Keyboard navigation did not set value. Current:', finalValueAfterKeyboard);
            }
          }
          
          // Final fallback: if still not selected, accept typed value
          if (!optionClicked) {
            console.log('Final fallback: accepting typed value as-is');
            // The value should already be typed in, just ensure it's finalized
            locationElement.dispatchEvent(new Event('blur', { bubbles: true }));
            locationElement.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(r => setTimeout(r, 300));
          }
          
          // Verify the value was set
          const finalValue = locationElement.value || locationElement.textContent || '';
          const success = finalValue.toLowerCase().includes(locationText.toLowerCase()) || locationText.toLowerCase().includes(finalValue.toLowerCase());
          
          console.log('Location fill result:', {
            success,
            expected: locationText,
            actual: finalValue,
            optionClicked
          });
          
          results.steps.push({ 
            step: 'location', 
            success: success,
            value: finalValue,
            expected: locationText
          });
          
          // Update field status
          const field = detectedFields.required.find(f => 
            f.name.toLowerCase().includes('location') || 
            (f.element === locationElement) ||
            (f.elements && f.elements.includes(locationElement))
          );
          if (field) {
            field.filled = success;
            const statusField = results.fieldStatus.required.find(sf => 
              sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
            );
            if (statusField) statusField.filled = success;
          } else {
            // Also check optional fields
            const optionalField = detectedFields.optional.find(f => 
              f.name.toLowerCase().includes('location') || 
              (f.element === locationElement) ||
              (f.elements && f.elements.includes(locationElement))
            );
            if (optionalField) {
              optionalField.filled = success;
              const statusField = results.fieldStatus.optional.find(sf => 
                sf.name === optionalField.name || (sf.fieldInfo && sf.fieldInfo === optionalField)
              );
              if (statusField) statusField.filled = success;
            }
          }
          
          if (!success) {
            results.warnings.push(`Location field filled but value mismatch. Expected: "${locationText}", Got: "${finalValue}"`);
          } else {
            console.log('Location successfully filled with:', finalValue);
          }
        } else {
          console.warn('Location field not found after', maxAttempts, 'attempts');
          results.warnings.push('Location field not found after multiple attempts. Available inputs:', 
            Array.from(document.querySelectorAll('input')).slice(0, 5).map(i => i.name || i.id || i.placeholder).join(', '));
          results.steps.push({ step: 'location', success: false, error: 'Field not found' });
        }
      } else {
        console.warn('No location value provided in resumeData.basics.location');
        results.warnings.push('Location value not available in resume data');
        results.steps.push({ step: 'location', success: false, error: 'No location value provided' });
      }

      // Step 6: Fill Current Company (use provided currentCompany or most recent if still active)
      let currentCompany = resumeData.currentCompany || '';
      if (!currentCompany && resumeData.experience && resumeData.experience.length > 0) {
        const mostRecentExp = resumeData.experience[0];
        // Check if it's current (no endDate or endDate indicates present)
        const isCurrent = !mostRecentExp.endDate || 
                         mostRecentExp.endDate.toLowerCase().includes('present') ||
                         mostRecentExp.endDate.toLowerCase().includes('current') ||
                         mostRecentExp.endDate === '';
        if (isCurrent) {
          currentCompany = mostRecentExp.company || '';
        }
      }
      
      if (currentCompany) {
        const companySelectors = [
          'input[name*="company"]',
          'input[id*="company"]',
          'input[placeholder*="company" i]'
        ];
        
        let companyElement = findInputByLabel('current company') || 
                            findInputByLabel('company');
        
        if (!companyElement) {
          for (const selector of companySelectors) {
            companyElement = document.querySelector(selector);
            if (companyElement) break;
          }
        }
        
        if (companyElement) {
          const companyResult = await fillInput('', currentCompany, { element: companyElement });
          results.steps.push({ step: 'company', ...companyResult });
          
          // Update field status (usually optional)
          const field = detectedFields.optional.find(f => 
            f.name.toLowerCase().includes('company') || 
            (f.element === companyElement) ||
            (f.elements && f.elements.includes(companyElement))
          );
          if (field) {
            field.filled = companyResult.success;
            const statusField = results.fieldStatus.optional.find(sf => 
              sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
            );
            if (statusField) statusField.filled = companyResult.success;
          }
          
          if (!companyResult.success) {
            results.warnings.push('Company field found but could not be filled: ' + companyResult.error);
          }
        } else {
          results.warnings.push('Current company field not found');
        }
      }

      // Step 7: Fill LinkedIn URL
      if (resumeData.basics?.profiles) {
        const linkedInProfile = resumeData.basics.profiles.find(p => 
          p.network?.toLowerCase().includes('linkedin')
        );
        if (linkedInProfile?.url) {
          const linkedInElement = findInputByLabel('linkedin') ||
                                 document.querySelector('input[name*="linkedin"], input[id*="linkedin"]');
          
          if (linkedInElement) {
            const linkedInResult = await fillInput('', linkedInProfile.url, { element: linkedInElement });
            results.steps.push({ step: 'linkedin', ...linkedInResult });
          }
        }
      }

      // Step 8: Fill Notice Period dropdown
      const noticePeriod = resumeData.preferences?.noticePeriod || '1 month';
      const noticeElement = findInputByLabel('notice period') || findSelectByLabel('notice period');
      if (noticeElement) {
        // Try multiple variations
        const noticeOptions = [noticePeriod, '1 month', 'One month', '30 days'];
        let noticeSuccess = false;
        for (const option of noticeOptions) {
          const result = await selectDropdown('', option, { element: noticeElement });
          if (result.success) {
            noticeSuccess = true;
            break;
          }
          await new Promise(r => setTimeout(r, 200));
        }
        results.steps.push({ step: 'notice_period', success: noticeSuccess });
        
        // Update field status
        const field = detectedFields.required.find(f => 
          f.name.toLowerCase().includes('notice') || 
          (f.element === noticeElement) ||
          (f.elements && f.elements.includes(noticeElement))
        );
        if (field) {
          field.filled = noticeSuccess;
          const statusField = results.fieldStatus.required.find(sf => 
            sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
          );
          if (statusField) statusField.filled = noticeSuccess;
        }
      }

      // Step 9: Fill Start Date dropdown
      const startDateElement = findInputByLabel('ideal start date') || findSelectByLabel('start date') || findInputByLabel('start date');
      if (startDateElement) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        // Try different date formats
        const dateOptions = [
          nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), // "January 2025"
          nextMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), // "Jan 2025"
          nextMonth.toLocaleDateString('en-US', { month: 'long' }), // "January"
          `January ${nextMonth.getFullYear()}`,
          'January'
        ];
        
        let startDateSuccess = false;
        for (const dateStr of dateOptions) {
          const result = await selectDropdown('', dateStr, { element: startDateElement });
          if (result.success) {
            startDateSuccess = true;
            break;
          }
          await new Promise(r => setTimeout(r, 200));
        }
        results.steps.push({ step: 'start_date', success: startDateSuccess });
        
        // Update field status
        const field = detectedFields.required.find(f => 
          f.name.toLowerCase().includes('start date') || 
          f.name.toLowerCase().includes('ideal start') || 
          (f.element === startDateElement) ||
          (f.elements && f.elements.includes(startDateElement))
        );
        if (field) {
          field.filled = startDateSuccess;
          const statusField = results.fieldStatus.required.find(sf => 
            sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
          );
          if (statusField) statusField.filled = startDateSuccess;
        }
      }

      // Step 10: Fill Salary Range
      const salaryRange = resumeData.preferences?.salaryRange || 'Negotiable based on experience and industry standards';
      const salaryElement = findInputByLabel('expected salary') || 
                           findInputByLabel('salary range') || 
                           findInputByLabel('salary') ||
                           document.querySelector('input[name*="salary"], input[id*="salary"]');
      if (salaryElement) {
        const salaryResult = await fillInput('', salaryRange, { element: salaryElement });
        results.steps.push({ step: 'salary_range', ...salaryResult });
        
        // Update field status
        const field = detectedFields.required.find(f => 
          f.name.toLowerCase().includes('salary') || 
          (f.element === salaryElement) ||
          (f.elements && f.elements.includes(salaryElement))
        );
        if (field) {
          field.filled = salaryResult.success;
          const statusField = results.fieldStatus.required.find(sf => 
            sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
          );
          if (statusField) statusField.filled = salaryResult.success;
        }
        
        if (!salaryResult.success) {
          results.warnings.push('Salary range field found but could not be filled');
        }
      }
      
      // Step 11: Fill Languages (checkboxes) - English is usually default
      const languagesResult = await checkRadioOrCheckbox('languages', 'English');
      results.steps.push({ step: 'languages', ...languagesResult });
      
      // Update field status (grouped field)
      const languagesField = detectedFields.required.find(f => 
        f.name.toLowerCase().includes('language')
      );
      if (languagesField) {
        languagesField.filled = languagesResult.success;
        const statusField = results.fieldStatus.required.find(sf => 
          sf.name === languagesField.name || (sf.fieldInfo && sf.fieldInfo === languagesField)
        );
        if (statusField) statusField.filled = languagesResult.success;
      }

      // Step 12: Fill "How did you hear about" dropdown
      const howDidYouHear = resumeData.preferences?.howDidYouHear || resumeData.diversity?.whereDidYouHear || 'Job board';
      const hearElement = findInputByLabel('how did you hear') || findSelectByLabel('how did you hear') || findInputByLabel('hear about');
      if (hearElement) {
        const hearOptions = [howDidYouHear, 'Job board', 'LinkedIn', 'Company website', 'Referral'];
        let hearSuccess = false;
        for (const option of hearOptions) {
          const result = await selectDropdown('', option, { element: hearElement });
          if (result.success) {
            hearSuccess = true;
            break;
          }
          await new Promise(r => setTimeout(r, 200));
        }
        results.steps.push({ step: 'how_did_you_hear', success: hearSuccess });
        
        // Update field status
        const field = detectedFields.required.find(f => 
          f.name.toLowerCase().includes('hear') || 
          (f.element === hearElement) ||
          (f.elements && f.elements.includes(hearElement))
        );
        if (field) {
          field.filled = hearSuccess;
          const statusField = results.fieldStatus.required.find(sf => 
            sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
          );
          if (statusField) statusField.filled = hearSuccess;
        }
      }

      // Step 13: Fill Work Authorization / Visa questions (single consistent answer)
      // Default: "Authorized to work, no sponsorship needed"
      let visaSuccess = false;
      const workAuthAnswers = [
        'Not for now, I am currently authorized to work in the US',
        'Not for now',
        'I am currently authorized to work',
        'Authorized to work',
        'No, I am an American Citizen or Permanent Resident',
        'Yes, I am authorized to work'
      ];
      
      // Try to find work authorization question and select ONE consistent answer
      const workAuthQuestions = detectedFields.required.filter(f => 
        f.name.toLowerCase().includes('visa') || 
        f.name.toLowerCase().includes('authorized') ||
        f.name.toLowerCase().includes('work authorization') ||
        f.name.toLowerCase().includes('sponsorship')
      );
      
      if (workAuthQuestions.length > 0) {
        // Find the main work authorization question (usually the first one)
        const mainQuestion = workAuthQuestions[0];
        console.log('Found work authorization question:', mainQuestion.name);
        
        // Try each answer option until one succeeds
        for (const answer of workAuthAnswers) {
          const result = await checkRadioOrCheckbox(mainQuestion.name, answer);
          if (result.success) {
            console.log('Work authorization filled with:', answer);
            visaSuccess = true;
            mainQuestion.filled = true;
            
            // Update status for this grouped field
            const statusField = results.fieldStatus.required.find(sf => 
              sf.name === mainQuestion.name || 
              (sf.fieldInfo && sf.fieldInfo === mainQuestion)
            );
            if (statusField) {
              statusField.filled = true;
            }
            
            break; // Stop after first success
          }
        }
        
        // If main question succeeded, handle follow-up questions
        if (visaSuccess) {
          // Look for follow-up visa questions (like "what visa are you on")
          const followUpQuestions = workAuthQuestions.slice(1).filter(f => 
            f.name.toLowerCase().includes('visa are you on') || 
            f.name.toLowerCase().includes('what visa') ||
            f.name.toLowerCase().includes('which visa')
          );
          
          for (const followUp of followUpQuestions) {
            // Try to fill with "Not applicable" or "No visa required"
            const followUpElement = followUp.element || (followUp.elements && followUp.elements[0]);
            if (followUpElement && followUpElement.tagName !== 'INPUT' || followUpElement.type !== 'radio' && followUpElement.type !== 'checkbox') {
              // It's a text input
              const followUpResult = await fillInput('', 'Not applicable', { element: followUpElement }).catch(() => ({ success: false }));
              followUp.filled = followUpResult.success;
            } else {
              // It's a radio/checkbox - try to select "Not applicable" or similar
              const followUpResult = await checkRadioOrCheckbox(followUp.name, 'Not applicable');
              if (!followUpResult.success) {
                const followUpResult2 = await checkRadioOrCheckbox(followUp.name, 'No visa required');
                followUp.filled = followUpResult2.success;
              } else {
                followUp.filled = followUpResult.success;
              }
            }
            
            // Update status
            const statusField = results.fieldStatus.required.find(sf => 
              sf.name === followUp.name || 
              (sf.fieldInfo && sf.fieldInfo === followUp)
            );
            if (statusField) {
              statusField.filled = followUp.filled;
            }
          }
        }
      }
      
      results.steps.push({ step: 'work_authorization', success: visaSuccess });

      // Step 14: Fill US Location question
      const usLocationResult = await checkRadioOrCheckbox('new york office', 'Yes');
      results.steps.push({ step: 'us_location', ...usLocationResult });
      
      // Update field status (grouped field)
      const usLocationField = detectedFields.required.find(f => 
        f.name.toLowerCase().includes('new york') || f.name.toLowerCase().includes('office')
      );
      if (usLocationField) {
        usLocationField.filled = usLocationResult.success;
        const statusField = results.fieldStatus.required.find(sf => 
          sf.name === usLocationField.name || (sf.fieldInfo && sf.fieldInfo === usLocationField)
        );
        if (statusField) statusField.filled = usLocationResult.success;
      }

      // Step 15: Fill Coding Language
      if (resumeData.skills) {
        const hasPython = resumeData.skills.some(s => 
          s.keywords?.some(k => k.toLowerCase().includes('python'))
        );
        const hasR = resumeData.skills.some(s => 
          s.keywords?.some(k => k.toLowerCase().includes(' r ') || k.toLowerCase() === 'r')
        );
        
        let codingLangResult = { success: false };
        if (hasPython) {
          codingLangResult = await checkRadioOrCheckbox('coding language', 'Python');
        } else if (hasR) {
          codingLangResult = await checkRadioOrCheckbox('coding language', 'R');
        } else {
          codingLangResult = await checkRadioOrCheckbox('coding language', 'Other or none but I am willing to learn');
        }
        results.steps.push({ step: 'coding_language', ...codingLangResult });
        
        // Update field status (grouped field)
        const codingField = detectedFields.required.find(f => 
          f.name.toLowerCase().includes('coding') || f.name.toLowerCase().includes('python') || f.name.toLowerCase().includes('language')
        );
        if (codingField) {
          codingField.filled = codingLangResult.success;
          const statusField = results.fieldStatus.required.find(sf => 
            sf.name === codingField.name || (sf.fieldInfo && sf.fieldInfo === codingField)
          );
          if (statusField) statusField.filled = codingLangResult.success;
        }
      }

      // Step 16: Fill Diversity Fields
      if (resumeData.diversity) {
        // Gender (radio buttons) - update status handled below
        if (resumeData.diversity.gender) {
          const genderResult = await checkRadioOrCheckbox('gender', resumeData.diversity.gender);
          if (genderResult.success) {
            results.steps.push({ step: 'gender', success: true });
            
            // Update field status (optional diversity field - grouped)
            const genderField = detectedFields.optional.find(f => 
              f.name.toLowerCase().includes('gender')
            );
            if (genderField) {
              genderField.filled = true;
              const statusField = results.fieldStatus.optional.find(sf => 
                sf.name === genderField.name || (sf.fieldInfo && sf.fieldInfo === genderField)
              );
              if (statusField) statusField.filled = true;
            }
          }
        }
        
        // Ethnicity dropdown
        const ethnicity = resumeData.diversity.ethnicity || 'Prefer not to say';
        const ethnicityElement = findInputByLabel('ethnicity') || 
                                 findSelectByLabel('ethnicity') ||
                                 document.querySelector('select[name*="ethnicity"], select[id*="ethnicity"]');
        if (ethnicityElement) {
          const ethnicityOptions = [ethnicity, 'Prefer not to say', 'Prefer not to answer', 'Prefer not to disclose'];
          let ethnicitySuccess = false;
          for (const option of ethnicityOptions) {
            const result = await selectDropdown('', option, { element: ethnicityElement });
            if (result.success) {
              ethnicitySuccess = true;
              break;
            }
            await new Promise(r => setTimeout(r, 200));
          }
          results.steps.push({ step: 'ethnicity', success: ethnicitySuccess });
          
          // Update field status (optional diversity field)
          const field = detectedFields.optional.find(f => 
            f.name.toLowerCase().includes('ethnicity') || 
            (f.element === ethnicityElement) ||
            (f.elements && f.elements.includes(ethnicityElement))
          );
          if (field) {
            field.filled = ethnicitySuccess;
            const statusField = results.fieldStatus.optional.find(sf => 
              sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
            );
            if (statusField) statusField.filled = ethnicitySuccess;
          }
        }
        
        // Age Bracket dropdown
        const ageBracket = resumeData.diversity.ageBracket;
        if (ageBracket) {
          const ageElement = findInputByLabel('age bracket') || 
                           findSelectByLabel('age bracket') || 
                           findInputByLabel('age') ||
                           document.querySelector('select[name*="age"], select[id*="age"]');
          if (ageElement) {
            const ageOptions = [ageBracket, '25-29', '30-34', 'Prefer not to say'];
            let ageSuccess = false;
            for (const option of ageOptions) {
              const result = await selectDropdown('', option, { element: ageElement });
              if (result.success) {
                ageSuccess = true;
                break;
              }
              await new Promise(r => setTimeout(r, 200));
            }
            results.steps.push({ step: 'age_bracket', success: ageSuccess });
            
            // Update field status (optional diversity field)
            const ageField = detectedFields.optional.find(f => 
              f.name.toLowerCase().includes('age') || 
              (f.element === ageElement) ||
              (f.elements && f.elements.includes(ageElement))
            );
            if (ageField) {
              ageField.filled = ageSuccess;
              const statusField = results.fieldStatus.optional.find(sf => 
                sf.name === ageField.name || (sf.fieldInfo && sf.fieldInfo === ageField)
              );
              if (statusField) statusField.filled = ageSuccess;
            }
          }
        }
        
        // Where did you hear (diversity section) - separate from application form "how did you hear"
        const whereDidYouHear = resumeData.diversity.whereDidYouHear || 'LinkedIn';
        const whereHearElement = findInputByLabel('where did you hear about') || 
                                findSelectByLabel('where did you hear about') ||
                                document.querySelector('select[name*="hear"], select[id*="hear"]');
        if (whereHearElement) {
          const whereOptions = [whereDidYouHear, 'LinkedIn', 'Job board', 'Company website'];
          let whereSuccess = false;
          for (const option of whereOptions) {
            const result = await selectDropdown('', option, { element: whereHearElement });
            if (result.success) {
              whereSuccess = true;
              break;
            }
            await new Promise(r => setTimeout(r, 200));
          }
          results.steps.push({ step: 'where_did_you_hear_diversity', success: whereSuccess });
          
          // Update field status (optional diversity field)
          const whereField = detectedFields.optional.find(f => 
            (f.name.toLowerCase().includes('where did you hear') || f.name.toLowerCase().includes('hear about')) && 
            !f.name.toLowerCase().includes('how did you hear') // Don't match the required field
          );
          if (whereField) {
            whereField.filled = whereSuccess;
            const statusField = results.fieldStatus.optional.find(sf => 
              sf.name === whereField.name || (sf.fieldInfo && sf.fieldInfo === whereField)
            );
            if (statusField) statusField.filled = whereSuccess;
          }
        }
        
      }

      // Step 17: Fill Cover Letter / Additional Information
      if (resumeData.coverLetter) {
        const coverLetterElement = findInputByLabel('cover letter') ||
                                  findInputByLabel('additional information') ||
                                  findInputByLabel('anything else') ||
                                  document.querySelector('textarea[name*="cover"], textarea[id*="cover"], textarea[name*="additional"], textarea[placeholder*="cover" i], textarea[placeholder*="additional" i]');
        
        if (coverLetterElement) {
          const coverResult = await fillTextarea('', resumeData.coverLetter, { element: coverLetterElement });
          results.steps.push({ step: 'cover_letter', ...coverResult });
          
          // Update field status (usually optional)
          const field = detectedFields.optional.find(f => 
            f.name.toLowerCase().includes('cover') || 
            f.name.toLowerCase().includes('additional') || 
            (f.element === coverLetterElement) ||
            (f.elements && f.elements.includes(coverLetterElement))
          );
          if (field) {
            field.filled = coverResult.success;
            const statusField = results.fieldStatus.optional.find(sf => 
              sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
            );
            if (statusField) statusField.filled = coverResult.success;
          }
        } else {
          results.warnings.push('Cover letter field not found');
        }
      }

      // Step 18: Fill Consent checkbox - Check all checkboxes and find consent one
      let consentChecked = false;
      
      // Get all checkboxes on the page
      const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      console.log(`Found ${allCheckboxes.length} checkboxes on page`);
      
      for (const checkbox of allCheckboxes) {
        // Skip if already checked
        if (checkbox.checked) continue;
        
        // Find associated label
        const checkboxId = checkbox.id || checkbox.name;
        let label = null;
        
        if (checkboxId) {
          label = document.querySelector(`label[for="${checkboxId}"]`);
        }
        
        // Also check parent and siblings
        if (!label) {
          label = checkbox.closest('label') || 
                 checkbox.parentElement?.querySelector('label') ||
                 checkbox.nextElementSibling;
        }
        
        const labelText = (label?.textContent || label?.innerText || '').toLowerCase();
        const checkboxValue = (checkbox.value || '').toLowerCase();
        
        // Check if this is a consent checkbox
        const isConsent = labelText.includes('consent') || 
                         labelText.includes('retaining my data') ||
                         labelText.includes('2 years') ||
                         labelText.includes('ekimetrics retaining') ||
                         checkboxValue.includes('consent');
        
        if (isConsent) {
          console.log('Found consent checkbox:', labelText);
          
          // Scroll into view
          checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(r => setTimeout(r, 200));
          
          // Click and check
          checkbox.click();
          checkbox.checked = true;
          
          // Trigger events
          checkbox.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          checkbox.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
          checkbox.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          
          await new Promise(r => setTimeout(r, 200));
          
          // Verify
          if (checkbox.checked) {
            consentChecked = true;
            console.log('Consent checkbox checked successfully');
            break;
          }
        }
      }
      
      // Fallback: try label-based approach
      if (!consentChecked) {
        const consentResult = await checkRadioOrCheckbox('consent', 'Yes');
        if (consentResult.success) {
          consentChecked = true;
        }
      }
      
      results.steps.push({ step: 'consent', success: consentChecked });
      
      // Update field status (usually required - grouped field)
      const consentFields = detectedFields.required.filter(f => 
        f.name.toLowerCase().includes('consent') ||
        f.name.toLowerCase().includes('retaining my data')
      );
      consentFields.forEach(field => {
        field.filled = consentChecked;
        const statusField = results.fieldStatus.required.find(sf => 
          sf.name === field.name || (sf.fieldInfo && sf.fieldInfo === field)
        );
        if (statusField) statusField.filled = consentChecked;
      });
      
      if (!consentChecked) {
        results.warnings.push('Consent checkbox not found or could not be checked');
      }


      // Final check: Verify which fields are actually filled
      await new Promise(r => setTimeout(r, 1500)); // Wait for all fields to settle (longer for slow-loading fields)
      
      // Re-detect fields to catch any that loaded late
      const finalFields = detectFormFields();
      
      // Merge with detected fields and update status (using grouped field structure)
      finalFields.required.forEach(field => {
        field.filled = isFieldFilled(field);
        
        // Try to match with existing field by name (since elements might be different instances)
        let existingField = detectedFields.required.find(f => 
          f.name.toLowerCase() === field.name.toLowerCase()
        );
        
        if (existingField) {
          existingField.filled = field.filled;
        } else {
          // New field detected, add it
          detectedFields.required.push(field);
        }
        
        const statusField = results.fieldStatus.required.find(sf => sf.name === field.name);
        if (statusField) {
          statusField.filled = field.filled;
          if (statusField.fieldInfo) {
            statusField.fieldInfo.filled = field.filled;
          }
        } else {
          // Add new field to status
          results.fieldStatus.required.push({
            name: field.name,
            filled: field.filled,
            fieldInfo: field
          });
        }
      });
      
      finalFields.optional.forEach(field => {
        field.filled = isFieldFilled(field);
        
        let existingField = detectedFields.optional.find(f => 
          f.name.toLowerCase() === field.name.toLowerCase()
        );
        
        if (existingField) {
          existingField.filled = field.filled;
        } else {
          detectedFields.optional.push(field);
        }
        
        const statusField = results.fieldStatus.optional.find(sf => sf.name === field.name);
        if (statusField) {
          statusField.filled = field.filled;
          if (statusField.fieldInfo) {
            statusField.fieldInfo.filled = field.filled;
          }
        } else {
          results.fieldStatus.optional.push({
            name: field.name,
            filled: field.filled,
            fieldInfo: field
          });
        }
      });
      
      const filledCount = results.fieldStatus.required.filter(f => f.filled).length;
      const totalCount = results.fieldStatus.required.length;
      
      results.success = filledCount > 0;
      results.filledCount = filledCount;
      results.totalCount = totalCount;
      results.completionPercent = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;
      
      console.log('Autofill complete:', {
        filled: filledCount,
        total: totalCount,
        percent: results.completionPercent + '%'
      });
      
      return results;

    } catch (error) {
      results.errors.push(error.message);
      results.success = false;
      return results;
    }
  }

  // Helper to find select by label
  function findSelectByLabel(labelText) {
    // First try the general findInputByLabel (works for selects too)
    let element = findInputByLabel(labelText);
    
    // If not found, look specifically for select elements
    if (!element) {
      const labels = Array.from(document.querySelectorAll('label, div[class*="label"], span[class*="label"]'));
      for (const label of labels) {
        const text = (label.textContent || label.innerText || '').toLowerCase();
        if (text.includes(labelText.toLowerCase())) {
          // Look for select in the same container
          const container = label.parentElement || label.closest('div, form, section');
          if (container) {
            const select = container.querySelector('select, [role="combobox"], [class*="select"], [class*="Select"]');
            if (select) return select;
          }
          
          // Try next sibling
          let nextSibling = label.nextElementSibling;
          let attempts = 0;
          while (nextSibling && attempts < 5) {
            if (nextSibling.tagName === 'SELECT' || 
                nextSibling.getAttribute('role') === 'combobox' ||
                nextSibling.classList.toString().toLowerCase().includes('select')) {
              return nextSibling;
            }
            nextSibling = nextSibling.nextElementSibling;
            attempts++;
          }
        }
      }
    }
    
    return element;
  }

  // Expose function to window for communication
  window.leverAutoApply = {
    autoApply,
    fillInput,
    fillTextarea,
    selectDropdown,
    uploadFile,
    checkRadioOrCheckbox,
    findInputByLabel,
    base64ToBlob
  };

  // If resumeData is provided via message, auto-apply immediately
  if (window.leverResumeData) {
    autoApply(window.leverResumeData).then(results => {
      window.leverAutoApplyResults = results;
      // Send results back to extension
      window.postMessage({ type: 'LEVER_AUTO_APPLY_RESULTS', results }, '*');
    });
  }

})();
