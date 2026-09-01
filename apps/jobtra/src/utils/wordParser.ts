import mammoth from 'mammoth';

export interface ExtractedDocResult {
  text: string;
  html: string;
  messages: string[];
  fileName: string;
}

/**
 * Extracts plain text and HTML from a Word document (.docx) or text file using mammoth
 */
export async function parseWordDocumentFile(file: File): Promise<ExtractedDocResult> {
  const fileName = file.name;
  const isDocx = fileName.toLowerCase().endsWith('.docx');
  const isTxt = fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.md');

  if (isTxt) {
    const text = await file.text();
    return {
      text,
      html: `<pre>${text}</pre>`,
      messages: [],
      fileName,
    };
  }

  if (isDocx) {
    const arrayBuffer = await file.arrayBuffer();
    const [textResult, htmlResult] = await Promise.all([
      mammoth.extractRawText({ arrayBuffer }),
      mammoth.convertToHtml({ arrayBuffer }),
    ]);

    return {
      text: textResult.value,
      html: htmlResult.value,
      messages: textResult.messages.map((m) => m.message),
      fileName,
    };
  }

  // Fallback for older .doc or other formats: try reading as arrayBuffer or text
  try {
    const arrayBuffer = await file.arrayBuffer();
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    if (textResult.value && textResult.value.trim().length > 10) {
      return {
        text: textResult.value,
        html: `<p>${textResult.value.replace(/\n/g, '<br/>')}</p>`,
        messages: textResult.messages.map((m) => m.message),
        fileName,
      };
    }
  } catch {}

  const text = await file.text();
  return {
    text,
    html: `<pre>${text}</pre>`,
    messages: [],
    fileName,
  };
}
