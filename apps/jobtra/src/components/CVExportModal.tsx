import React, { useState } from 'react';
import {
  FileDown,
  FileText,
  Printer,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Download,
  X,
  FileCode,
  Globe,
  CheckCircle2,
  AlertCircle,
  Sliders,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
} from 'lucide-react';
import { BaseCV, TailoredCVRecord, CVTemplateId, CVThemeSettings } from '../types';
import { CV_TEMPLATES, getTemplateById, resolveCVTheme } from '../data/cvTemplates';
import {
  createGoogleDocFromCV,
  downloadWordDocFile,
  pushCVToGoogleDoc,
  pullCVFromGoogleDoc,
  GoogleDocResult,
} from '../lib/googleDocs';
import { CVThemeCustomizer } from './CVThemeCustomizer';

interface CVExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: BaseCV | null;
  tailoredData?: TailoredCVRecord | null;
  companyName?: string;
  roleName?: string;
  onDocCreated?: (docResult: GoogleDocResult) => void;
  onUpdateCV?: (updatedCv: BaseCV) => void;
}

export const CVExportModal: React.FC<CVExportModalProps> = ({
  isOpen,
  onClose,
  cvData,
  tailoredData,
  companyName,
  roleName,
  onDocCreated,
  onUpdateCV,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<CVTemplateId>(
    (cvData?.templateId as CVTemplateId) || 'modern-executive'
  );
  const [themeSettings, setThemeSettings] = useState<CVThemeSettings>(() =>
    resolveCVTheme(
      (cvData?.templateId as CVTemplateId) || 'modern-executive',
      cvData?.themeSettings
    )
  );
  const [activeTab, setActiveTab] = useState<'export' | 'theme' | 'preview'>('export');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [isCreatingGDoc, setIsCreatingGDoc] = useState(false);
  const [isPushingDoc, setIsPushingDoc] = useState(false);
  const [isPullingDoc, setIsPullingDoc] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [gDocResult, setGDocResult] = useState<GoogleDocResult | null>(
    cvData?.googleDocUrl
      ? {
          documentId: cvData.googleDocId || '',
          documentUrl: cvData.googleDocUrl,
          title: `${cvData.fullName || 'Candidate'} CV`,
          createdTime: cvData.lastSyncedToGoogleDocAt || new Date().toISOString(),
        }
      : null
  );
  const [gDocError, setGDocError] = useState<string | null>(null);

  React.useEffect(() => {
    if (cvData) {
      const resolved = resolveCVTheme(
        (cvData.templateId as CVTemplateId) || selectedTemplateId,
        cvData.themeSettings
      );
      setThemeSettings(resolved);
      if (cvData.googleDocUrl) {
        setGDocResult({
          documentId: cvData.googleDocId || '',
          documentUrl: cvData.googleDocUrl,
          title: `${cvData.fullName || 'Candidate'} CV`,
          createdTime: cvData.lastSyncedToGoogleDocAt || new Date().toISOString(),
        });
      }
    }
  }, [cvData, selectedTemplateId]);

  if (!isOpen || (!cvData && !tailoredData)) return null;

  const currentTemplate = getTemplateById(selectedTemplateId);
  const targetTitle = roleName || cvData?.targetRole || 'Professional';
  const targetCompany = companyName ? ` for ${companyName}` : '';
  const fullName = cvData?.fullName || 'Candidate';
  const email = cvData?.email || 'email@example.com';
  const phone = cvData?.phone || '';
  const location = cvData?.location || 'Remote';
  const linkedin = cvData?.linkedin || '';
  const github = cvData?.github || '';

  const summaryText =
    tailoredData?.tailoredSummary ||
    cvData?.summary ||
    'Experienced professional with proven domain expertise.';

  const handleTemplateChange = (tmplId: CVTemplateId) => {
    setSelectedTemplateId(tmplId);
    const resolved = resolveCVTheme(tmplId);
    setThemeSettings(resolved);
    if (onUpdateCV && cvData) {
      onUpdateCV({ ...cvData, templateId: tmplId, themeSettings: resolved });
    }
  };

  const handleThemeChange = (newTheme: CVThemeSettings) => {
    setThemeSettings(newTheme);
    if (onUpdateCV && cvData) {
      onUpdateCV({ ...cvData, themeSettings: newTheme });
    }
  };

  const handleResetTheme = () => {
    const defaultTheme = resolveCVTheme(selectedTemplateId);
    setThemeSettings(defaultTheme);
    if (onUpdateCV && cvData) {
      onUpdateCV({ ...cvData, themeSettings: defaultTheme });
    }
  };

  // Build clean HTML formatted document using dynamic theme settings
  const generateCleanHTML = () => {
    const accent = themeSettings.primaryColor || currentTemplate.accentColor || '#2563eb';
    const font = themeSettings.fontFamily || 'Inter';
    const margin =
      themeSettings.marginSize === 'narrow'
        ? '12mm'
        : themeSettings.marginSize === 'wide'
        ? '24mm'
        : '18mm';
    const lineHeight =
      themeSettings.lineHeight === 'tight'
        ? '1.3'
        : themeSettings.lineHeight === 'relaxed'
        ? '1.6'
        : '1.45';
    const fontSize =
      themeSettings.fontScale === 'compact'
        ? '9.5pt'
        : themeSettings.fontScale === 'relaxed'
        ? '11.5pt'
        : '10.5pt';
    const headerAlign = themeSettings.headerLayout === 'left' ? 'left' : 'center';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${fullName} - ${targetTitle} Resume</title>
  <style>
    @page {
      margin: ${margin};
      size: A4 portrait;
    }
    body {
      font-family: '${font}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      line-height: ${lineHeight};
      font-size: ${fontSize};
      margin: 0;
      padding: 24px;
      background: #ffffff;
    }
    .header {
      text-align: ${headerAlign};
      ${themeSettings.showSectionDividers ? `border-bottom: 2pt solid ${accent};` : ''}
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .name {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .title {
      font-size: 13pt;
      font-weight: 600;
      color: ${accent};
      margin: 0 0 6px 0;
    }
    .contact-info {
      font-size: 9.5pt;
      color: #475569;
      display: flex;
      justify-content: ${headerAlign === 'left' ? 'flex-start' : 'center'};
      flex-wrap: wrap;
      gap: 12px;
    }
    .section {
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0f172a;
      ${themeSettings.showSectionDividers ? `border-bottom: 1.5pt solid ${accent};` : ''}
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .summary-text {
      font-size: 10pt;
      color: #334155;
      text-align: justify;
      margin: 0;
    }
    .item {
      margin-bottom: 10px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      font-size: 10.5pt;
      color: #0f172a;
    }
    .item-sub {
      display: flex;
      justify-content: space-between;
      color: ${accent};
      font-weight: 600;
      font-size: 9.5pt;
      margin-bottom: 3px;
    }
    ul {
      margin: 3px 0 0 0;
      padding-left: 18px;
      list-style-type: ${
        themeSettings.bulletStyle === 'hyphen'
          ? 'none'
          : themeSettings.bulletStyle === 'square'
          ? 'square'
          : 'disc'
      };
    }
    li {
      margin-bottom: 2.5px;
      color: #334155;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 4px;
      font-size: 10pt;
    }
    .skill-cat {
      font-weight: 700;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${fullName}</div>
    <div class="title">${targetTitle}</div>
    <div class="contact-info">
      ${email ? `<span>${email}</span>` : ''}
      ${phone ? `<span>${phone}</span>` : ''}
      ${location ? `<span>${location}</span>` : ''}
      ${linkedin ? `<span>LinkedIn: ${linkedin}</span>` : ''}
      ${github ? `<span>GitHub: ${github}</span>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary-text">${summaryText}</p>
  </div>

  ${
    cvData?.skills && cvData.skills.length > 0
      ? `
  <div class="section">
    <div class="section-title">Skills &amp; Technologies</div>
    <div class="skills-grid">
      ${cvData.skills
        .map(
          (s) => `
        <div style="margin-bottom: 3px;">
          <span class="skill-cat">${s.category}:</span> ${s.items.join(', ')}
        </div>
      `
        )
        .join('')}
    </div>
  </div>
  `
      : ''
  }

  ${
    cvData?.experience && cvData.experience.length > 0
      ? `
  <div class="section">
    <div class="section-title">Professional Experience</div>
    ${cvData.experience
      .map((exp) => {
        const bullets =
          tailoredData?.tailoredBullets && tailoredData.tailoredBullets[exp.id]
            ? tailoredData.tailoredBullets[exp.id]
            : exp.bullets;

        return `
      <div class="item">
        <div class="item-header">
          <span>${exp.company}</span>
          <span style="font-weight: 500; font-size: 9pt; color: #64748b;">${
            exp.startDate
          } – ${exp.isCurrent ? 'Present' : exp.endDate || ''}</span>
        </div>
        <div class="item-sub">
          <span>${exp.role}</span>
          <span style="font-size: 9pt; color: #64748b;">${exp.location || ''}</span>
        </div>
        <ul>
          ${bullets.map((b) => `<li>${b}</li>`).join('')}
        </ul>
      </div>
    `;
      })
      .join('')}
  </div>
  `
      : ''
  }

  ${
    cvData?.education && cvData.education.length > 0
      ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${cvData.education
      .map(
        (edu) => `
      <div class="item">
        <div class="item-header">
          <span>${edu.institution}</span>
          <span style="font-weight: 500; font-size: 9pt; color: #64748b;">${edu.graduationYear}</span>
        </div>
        <div class="item-sub">
          <span>${edu.degree}</span>
          <span style="font-size: 9pt; color: #64748b;">${edu.location || ''}</span>
        </div>
        ${
          edu.details
            ? `<p style="font-size: 9pt; color: #64748b; margin: 2px 0 0 0;">${edu.details}</p>`
            : ''
        }
      </div>
    `
      )
      .join('')}
  </div>
  `
      : ''
  }
</body>
</html>`;
  };

  const generateMarkdown = () => {
    let md = `# ${fullName}\n`;
    md += `**${targetTitle}**\n\n`;
    md += `${email} | ${phone ? `${phone} | ` : ''}${location}`;
    if (linkedin) md += ` | [LinkedIn](${linkedin})`;
    if (github) md += ` | [GitHub](${github})`;
    md += `\n\n---\n\n`;

    md += `### Professional Summary\n\n${summaryText}\n\n`;

    if (cvData?.skills && cvData.skills.length > 0) {
      md += `### Skills & Technologies\n\n`;
      cvData.skills.forEach((s) => {
        md += `- **${s.category}**: ${s.items.join(', ')}\n`;
      });
      md += `\n`;
    }

    if (cvData?.experience && cvData.experience.length > 0) {
      md += `### Professional Experience\n\n`;
      cvData.experience.forEach((exp) => {
        const bullets =
          tailoredData?.tailoredBullets && tailoredData.tailoredBullets[exp.id]
            ? tailoredData.tailoredBullets[exp.id]
            : exp.bullets;

        md += `#### ${exp.role} - **${exp.company}**\n`;
        md += `*${exp.startDate} - ${
          exp.isCurrent ? 'Present' : exp.endDate || ''
        }* ${exp.location ? `| ${exp.location}` : ''}\n\n`;
        bullets.forEach((b) => {
          md += `- ${b}\n`;
        });
        md += `\n`;
      });
    }

    if (cvData?.education && cvData.education.length > 0) {
      md += `### Education\n\n`;
      cvData.education.forEach((edu) => {
        md += `#### ${edu.degree} - **${edu.institution}**\n`;
        md += `*Graduation: ${edu.graduationYear}*\n\n`;
      });
    }

    return md;
  };

  const handlePrintPDF = () => {
    const html = generateCleanHTML();
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    }
  };

  const handleDownloadWord = () => {
    if (cvData) {
      downloadWordDocFile(cvData, tailoredData, selectedTemplateId);
    }
  };

  const handleCreateGoogleDoc = async () => {
    if (!cvData) return;
    setIsCreatingGDoc(true);
    setGDocError(null);

    try {
      const result = await createGoogleDocFromCV(
        cvData,
        tailoredData,
        selectedTemplateId
      );
      setGDocResult(result);
      if (onDocCreated) {
        onDocCreated(result);
      }
      if (onUpdateCV) {
        onUpdateCV({
          ...cvData,
          googleDocId: result.documentId,
          googleDocUrl: result.documentUrl,
          lastSyncedToGoogleDocAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setGDocError(err.message || 'Failed to create Google Doc');
    } finally {
      setIsCreatingGDoc(false);
    }
  };

  // Two-Way Push: Overwrites Google Doc with current BaseCV state
  const handlePushToGoogleDoc = async () => {
    if (!cvData || !gDocResult?.documentId) return;
    setIsPushingDoc(true);
    setGDocError(null);
    setSyncStatusMsg(null);

    try {
      const res = await pushCVToGoogleDoc(
        gDocResult.documentId,
        cvData,
        tailoredData,
        selectedTemplateId
      );
      setSyncStatusMsg('Successfully pushed updates to linked Google Doc!');
      if (onUpdateCV) {
        onUpdateCV({
          ...cvData,
          lastSyncedToGoogleDocAt: res.syncedAt,
        });
      }
      setTimeout(() => setSyncStatusMsg(null), 3500);
    } catch (err: any) {
      setGDocError(err.message || 'Failed to push to Google Doc.');
    } finally {
      setIsPushingDoc(false);
    }
  };

  // Two-Way Pull: Re-imports edits made inside the Google Doc back to BaseCV
  const handlePullFromGoogleDoc = async () => {
    if (!cvData || !gDocResult?.documentId) return;
    setIsPullingDoc(true);
    setGDocError(null);
    setSyncStatusMsg(null);

    try {
      const res = await pullCVFromGoogleDoc(gDocResult.documentId, cvData);
      if (res.success && res.data) {
        setSyncStatusMsg('Successfully synchronized edits from Google Doc!');
        if (onUpdateCV) {
          onUpdateCV(res.data);
        }
      }
      setTimeout(() => setSyncStatusMsg(null), 3500);
    } catch (err: any) {
      setGDocError(err.message || 'Failed to pull changes from Google Doc.');
    } finally {
      setIsPullingDoc(false);
    }
  };

  const handleCopyRichText = async () => {
    const html = generateCleanHTML();
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const textBlob = new Blob([generateMarkdown()], { type: 'text/plain' });
        const htmlBlob = new Blob([html], { type: 'text/html' });
        await navigator.clipboard.write([
          new window.ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(generateMarkdown());
      }
      setCopiedFormat('gdocs');
      setTimeout(() => setCopiedFormat(null), 3000);
    } catch {
      await navigator.clipboard.writeText(generateMarkdown());
      setCopiedFormat('gdocs');
      setTimeout(() => setCopiedFormat(null), 3000);
    }
  };

  const handleCopyMarkdown = async () => {
    await navigator.clipboard.writeText(generateMarkdown());
    setCopiedFormat('md');
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <span>Export, Theme &amp; 2-Way Sync</span>
                {tailoredData && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ✨ Tailored ({tailoredData.matchScore}% match)
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-500 truncate max-w-[320px]">
                {fullName} • {targetTitle} {targetCompany}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="px-6 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileDown className="w-3.5 h-3.5" />
            Export &amp; Sync
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'theme'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Typography &amp; Theme Engine
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Live Preview
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {gDocError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gDocError}</span>
            </div>
          )}

          {syncStatusMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {activeTab === 'theme' && (
            <CVThemeCustomizer
              templateId={selectedTemplateId}
              themeSettings={themeSettings}
              onChangeTheme={handleThemeChange}
              onResetDefault={handleResetTheme}
            />
          )}

          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold text-neutral-500 flex items-center justify-between">
                <span>Direct Render Preview (A4 Scaled)</span>
                <span>
                  Font: {themeSettings.fontFamily} • Color: {themeSettings.primaryColor}
                </span>
              </div>
              <div className="border border-neutral-300 rounded-xl overflow-hidden shadow-inner bg-neutral-100 p-2">
                <iframe
                  title="CV Live Preview"
                  srcDoc={generateCleanHTML()}
                  className="w-full h-[380px] bg-white rounded-lg border border-neutral-200 shadow-xs"
                />
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <>
              {/* Template Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-neutral-800 flex items-center justify-between">
                  <span>CV Archetype Template</span>
                  <span className="text-[10px] font-medium text-neutral-500">
                    Selected: {currentTemplate.name}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {CV_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleTemplateChange(tmpl.id)}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        selectedTemplateId === tmpl.id
                          ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-400'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-neutral-900 truncate">
                          {tmpl.name}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tmpl.accentColor }}
                        />
                      </div>
                      <span className="text-[9px] font-semibold text-blue-700 uppercase tracking-wide">
                        {tmpl.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Two-Way Google Docs Sync Hub */}
              <div className="p-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                        <span>Two-Way Google Docs Synchronization</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          Live Drive Sync
                        </span>
                      </h4>
                      <p className="text-[11px] text-neutral-600 leading-snug mt-0.5">
                        Sync formatted CV directly to Google Drive. Edit live in Google Docs and pull modifications back seamlessly!
                      </p>
                    </div>
                  </div>
                </div>

                {gDocResult ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-neutral-900 truncate text-[11px]">
                          {gDocResult.title}
                        </span>
                      </div>
                      <a
                        href={gDocResult.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition shrink-0"
                      >
                        <span>Open Doc</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* 2-Way Sync Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handlePushToGoogleDoc}
                        disabled={isPushingDoc}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                      >
                        {isPushingDoc ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>Push Changes to Google Doc</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePullFromGoogleDoc}
                        disabled={isPullingDoc}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                      >
                        {isPullingDoc ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>Pull Edits from Google Doc</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={isCreatingGDoc}
                      onClick={handleCreateGoogleDoc}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      {isCreatingGDoc ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Creating Google Doc...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          <span>Save &amp; Link Google Doc</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Word Document Download */}
                <div className="p-3 rounded-xl border border-neutral-200 bg-white hover:border-blue-300 transition flex flex-col justify-between space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-neutral-900">Word Doc (.doc)</h5>
                      <p className="text-[10px] text-neutral-500 leading-tight">
                        Pre-styled with custom {themeSettings.fontFamily} &amp; margins.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadWord}
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .Doc</span>
                  </button>
                </div>

                {/* PDF Print */}
                <div className="p-3 rounded-xl border border-neutral-200 bg-white hover:border-red-300 transition flex flex-col justify-between space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-neutral-900">Print / PDF</h5>
                      <p className="text-[10px] text-neutral-500 leading-tight">
                        Clean vector A4 layout formatted for ATS parsers.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrintPDF}
                    className="w-full px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print PDF</span>
                  </button>
                </div>

                {/* Copy Formatted for Docs */}
                <div className="p-3 rounded-xl border border-neutral-200 bg-white hover:border-purple-300 transition flex flex-col justify-between space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
                      <Copy className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-neutral-900">Copy Formatted</h5>
                      <p className="text-[10px] text-neutral-500 leading-tight">
                        Copies with fonts, color accents &amp; layout.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyRichText}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      copiedFormat === 'gdocs'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {copiedFormat === 'gdocs' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied Rich Text!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Rich Text</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Copy Clean Markdown */}
                <div className="p-3 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 transition flex flex-col justify-between space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center shrink-0">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-neutral-900">Clean Markdown</h5>
                      <p className="text-[10px] text-neutral-500 leading-tight">
                        Plain ATS markdown text with standard syntax.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    {copiedFormat === 'md' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied MD!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Google Docs 2-Way Sync &amp; ATS-safe formatting active</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
