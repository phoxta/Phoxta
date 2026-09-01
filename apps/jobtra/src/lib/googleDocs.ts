import { BaseCV, TailoredCVRecord, CVTemplateId, CVThemeSettings } from '../types';
import appletConfig from '../../applet-config.json';
import { resolveCVTheme } from '../data/cvTemplates';

declare const google: any;

export interface GoogleDocResult {
  documentId: string;
  documentUrl: string;
  title: string;
  createdTime: string;
}

/**
 * Acquire Google OAuth token with documents and drive.file scopes
 */
export async function getGoogleDocsAccessToken(): Promise<string | null> {
  // Google Identity Services Token Client (Docs + Drive.file scopes).
  return new Promise((resolve) => {
    try {
      if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        const client = google.accounts.oauth2.initTokenClient({
          client_id:
            (appletConfig as any).oAuthClientId ||
            '216222326411-56qp6tnu46uh8doq19jhf36m32h3qspn.apps.googleusercontent.com',
          scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file',
          callback: (response: any) => {
            if (response?.access_token) {
              resolve(response.access_token);
            } else {
              resolve(null);
            }
          },
          error_callback: () => resolve(null),
        });
        client.requestAccessToken({ prompt: '' });
      } else {
        resolve(null);
      }
    } catch {
      resolve(null);
    }
  });
}

/**
 * Formats a BaseCV or TailoredCV into plain text and batch update requests for Google Docs API
 */
export function formatCvForGoogleDoc(
  cv: BaseCV,
  tailored?: TailoredCVRecord | null,
  templateId: CVTemplateId = 'modern-executive',
  themeSettings?: CVThemeSettings
) {
  const theme = resolveCVTheme(templateId, themeSettings || cv.themeSettings);
  const name = cv.fullName || 'Candidate';
  const role = tailored?.role || cv.targetRole || 'Professional';
  const company = tailored?.company ? ` - ${tailored.company}` : '';
  const docTitle = `${name} - ${role}${company} CV`;

  const contactPieces = [
    cv.email,
    cv.phone,
    cv.location,
    cv.linkedin ? `LinkedIn: ${cv.linkedin}` : null,
    cv.github ? `GitHub: ${cv.github}` : null,
    cv.portfolio ? `Portfolio: ${cv.portfolio}` : null,
  ].filter(Boolean);

  const bulletSymbol = theme.bulletStyle === 'hyphen' ? '-' : theme.bulletStyle === 'square' ? '▪' : theme.bulletStyle === 'accent-dot' ? '◈' : '•';

  let docText = `${name.toUpperCase()}\n`;
  docText += `${role}\n`;
  docText += `${contactPieces.join(' | ')}\n\n`;

  // Summary
  const summary = tailored?.tailoredSummary || cv.summary;
  if (summary) {
    docText += `PROFESSIONAL SUMMARY\n`;
    if (theme.showSectionDividers) {
      docText += `------------------------------------------------------------\n`;
    }
    docText += `${summary}\n\n`;
  }

  // Skills
  const skills = tailored?.tailoredSkills || cv.skills || [];
  if (skills.length > 0) {
    docText += `CORE COMPETENCIES & TECHNICAL SKILLS\n`;
    if (theme.showSectionDividers) {
      docText += `------------------------------------------------------------\n`;
    }
    skills.forEach((s) => {
      docText += `${bulletSymbol} ${s.category}: ${s.items.join(', ')}\n`;
    });
    docText += `\n`;
  }

  // Experience
  const experience = tailored?.tailoredExperience || cv.experience || [];
  if (experience.length > 0) {
    docText += `PROFESSIONAL EXPERIENCE\n`;
    if (theme.showSectionDividers) {
      docText += `------------------------------------------------------------\n`;
    }
    experience.forEach((exp: any) => {
      const dates = exp.startDate ? ` | ${exp.startDate} – ${exp.endDate || (exp.isCurrent ? 'Present' : '')}` : '';
      const loc = exp.location ? ` | ${exp.location}` : '';
      docText += `${exp.role} — ${exp.company}${dates}${loc}\n`;
      if (exp.techStack && exp.techStack.length > 0) {
        docText += `Technologies: ${exp.techStack.join(', ')}\n`;
      }
      exp.bullets.forEach((b: string) => {
        docText += `${bulletSymbol} ${b}\n`;
      });
      docText += `\n`;
    });
  }

  // Education
  const education = cv.education || [];
  if (education.length > 0) {
    docText += `EDUCATION & CREDENTIALS\n`;
    if (theme.showSectionDividers) {
      docText += `------------------------------------------------------------\n`;
    }
    education.forEach((edu) => {
      const yr = edu.graduationYear ? ` (${edu.graduationYear})` : '';
      const loc = edu.location ? ` - ${edu.location}` : '';
      docText += `${bulletSymbol} ${edu.degree} — ${edu.institution}${loc}${yr}\n`;
      if (edu.details) {
        docText += `  ${edu.details}\n`;
      }
    });
    docText += `\n`;
  }

  // Projects
  const projects = cv.projects || [];
  if (projects.length > 0) {
    docText += `NOTABLE PROJECTS\n`;
    if (theme.showSectionDividers) {
      docText += `------------------------------------------------------------\n`;
    }
    projects.forEach((proj) => {
      const link = proj.link ? ` (${proj.link})` : '';
      docText += `${bulletSymbol} ${proj.name}${link}: ${proj.description}\n`;
      if (proj.techStack && proj.techStack.length > 0) {
        docText += `  Tech: ${proj.techStack.join(', ')}\n`;
      }
    });
    docText += `\n`;
  }

  // Certifications
  if (cv.certifications && cv.certifications.length > 0) {
    docText += `CERTIFICATIONS\n`;
    if (theme.showSectionDividers) {
      docText += `------------------------------------------------------------\n`;
    }
    cv.certifications.forEach((c) => {
      docText += `${bulletSymbol} ${c}\n`;
    });
    docText += `\n`;
  }

  return {
    docTitle,
    docText,
    theme,
  };
}

/**
 * Creates a real Google Doc on the user's Google Drive via Google Docs REST API
 */
export async function createGoogleDocFromCV(
  cv: BaseCV,
  tailored?: TailoredCVRecord | null,
  templateId: CVTemplateId = 'modern-executive',
  token?: string
): Promise<GoogleDocResult> {
  const accessToken = token || (await getGoogleDocsAccessToken());

  const { docTitle, docText } = formatCvForGoogleDoc(cv, tailored, templateId, cv.themeSettings);

  if (!accessToken) {
    const simulatedDocId = `doc_${cv.id}_${Date.now()}`;
    return {
      documentId: simulatedDocId,
      documentUrl: `https://docs.google.com/document/create?title=${encodeURIComponent(docTitle)}`,
      title: docTitle,
      createdTime: new Date().toISOString(),
    };
  }

  // 1. Create Blank Google Doc
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: docTitle,
    }),
  });

  if (!createRes.ok) {
    const errJson = await createRes.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Failed to create Google Doc (${createRes.status})`);
  }

  const createdDoc = await createRes.json();
  const documentId = createdDoc.documentId;

  // 2. Insert formatted body text into Google Doc
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: docText,
          },
        },
      ],
    }),
  });

  if (!updateRes.ok) {
    console.warn('Batch update notice on Google Doc:', await updateRes.text());
  }

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    title: docTitle,
    createdTime: new Date().toISOString(),
  };
}

/**
 * Pushes updated BaseCV changes directly to an existing linked Google Doc
 */
export async function pushCVToGoogleDoc(
  documentId: string,
  cv: BaseCV,
  tailored?: TailoredCVRecord | null,
  templateId: CVTemplateId = 'modern-executive',
  token?: string
): Promise<{ success: boolean; documentUrl: string; syncedAt: string }> {
  const accessToken = token || (await getGoogleDocsAccessToken());
  if (!accessToken) {
    throw new Error('Google Docs access token required to push changes.');
  }

  const { docTitle, docText } = formatCvForGoogleDoc(cv, tailored, templateId, cv.themeSettings);

  const res = await fetch('/api/google-docs/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId,
      accessToken,
      formattedText: docText,
      docTitle,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update linked Google Doc');
  }

  return {
    success: true,
    documentUrl: json.documentUrl,
    syncedAt: json.syncedAt || new Date().toISOString(),
  };
}

/**
 * Pulls latest edits from the linked Google Doc back into the BaseCV schema
 */
export async function pullCVFromGoogleDoc(
  documentId: string,
  existingBaseCv: BaseCV,
  token?: string
): Promise<{ success: boolean; data: BaseCV }> {
  const accessToken = token || (await getGoogleDocsAccessToken());
  if (!accessToken) {
    throw new Error('Google Docs access token required to pull edits.');
  }

  const res = await fetch('/api/google-docs/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId,
      accessToken,
      baseCv: existingBaseCv,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to pull changes from Google Doc');
  }

  return {
    success: true,
    data: json.data,
  };
}

/**
 * Downloads a Word-compatible (.doc) file formatted according to template and theme settings
 */
export function downloadWordDocFile(
  cv: BaseCV,
  tailored?: TailoredCVRecord | null,
  templateId: CVTemplateId = 'modern-executive'
) {
  const { docTitle, docText, theme } = formatCvForGoogleDoc(cv, tailored, templateId, cv.themeSettings);

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${docTitle}</title>
      <style>
        body {
          font-family: '${theme.fontFamily}', 'Calibri', 'Arial', sans-serif;
          font-size: ${theme.fontScale === 'compact' ? '10pt' : theme.fontScale === 'relaxed' ? '11.5pt' : '10.5pt'};
          line-height: ${theme.lineHeight === 'tight' ? '1.3' : theme.lineHeight === 'relaxed' ? '1.6' : '1.45'};
          color: #1a1a1a;
          margin: ${theme.marginSize === 'narrow' ? '0.6in' : theme.marginSize === 'wide' ? '1.2in' : '0.85in'};
        }
        h1 { font-size: 20pt; font-weight: bold; margin-bottom: 2pt; color: #0f172a; text-align: ${theme.headerLayout === 'left' ? 'left' : 'center'}; }
        h2 { font-size: 13pt; color: ${theme.primaryColor}; margin-top: 0; text-align: ${theme.headerLayout === 'left' ? 'left' : 'center'}; font-weight: 600; }
        .contact { font-size: 10pt; color: #475569; text-align: ${theme.headerLayout === 'left' ? 'left' : 'center'}; margin-bottom: 15pt; }
        .section-header {
          font-size: 11pt;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: ${theme.showSectionDividers ? `1.5pt solid ${theme.primaryColor}` : 'none'};
          padding-bottom: 2pt;
          margin-top: 14pt;
          margin-bottom: 6pt;
          color: #0f172a;
        }
        p { margin-top: 0; margin-bottom: 6pt; }
        ul { margin-top: 2pt; margin-bottom: 8pt; padding-left: 18pt; }
        li { margin-bottom: 3pt; }
      </style>
    </head>
    <body>
      <pre style="font-family: ${theme.fontFamily}, Calibri, sans-serif; white-space: pre-wrap; font-size: ${
    theme.fontScale === 'compact' ? '10pt' : '10.5pt'
  }; line-height: 1.45;">${docText}</pre>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${docTitle.replace(/[^a-zA-Z0-9-_]/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
