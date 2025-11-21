/**
 * Extracts text from a file (PDF, DOCX, or plain text)
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = file.name.split('.').pop()?.toLowerCase();

  if (fileType === 'pdf') {
    return await extractTextFromPDF(file);
  } else if (fileType === 'docx') {
    return await extractTextFromDOCX(file);
  } else if (fileType === 'txt' || fileType === 'md') {
    return await file.text();
  } else if (fileType === 'json') {
    return await file.text();
  } else {
    throw new Error("Unsupported file type. Please upload PDF, DOCX, TXT, or JSON.");
  }
};

const extractTextFromPDF = async (file: File): Promise<string> => {
  // Dynamically import pdfjs-dist for client-side use
  const pdfjsLib = await import('pdfjs-dist');
  
  // Configure worker - use local worker file from public folder
  if (typeof window !== 'undefined') {
    // Use local worker file served from public folder (Next.js serves files in public/)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  let linksFound: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    
    // 1. Get Text Content
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";

    // 2. Get Annotation (Hyperlinks)
    const annotations = await page.getAnnotations();
    annotations.forEach((annotation: any) => {
      if (annotation.url) {
        linksFound.push(annotation.url);
      }
    });
  }

  // Deduplicate links
  linksFound = [...new Set(linksFound)];

  // Append found links to the bottom so the LLM can associate them
  if (linksFound.length > 0) {
    fullText += "\n\n[EXTRACTED HYPERLINKS (Use these to populate profiles)]:\n" + linksFound.join("\n");
  }

  return fullText;
};

const extractTextFromDOCX = async (file: File): Promise<string> => {
  // Dynamically import mammoth for client-side use
  const mammoth = await import('mammoth');
  
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
  return result.value;
};

