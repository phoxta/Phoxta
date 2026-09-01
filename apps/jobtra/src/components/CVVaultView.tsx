import { apiUrl } from '../lib/api';
import React, { useState, useRef } from 'react';
import {
  FileText,
  Plus,
  Sparkles,
  Copy,
  Edit3,
  Trash2,
  Check,
  Star,
  ExternalLink,
  ChevronRight,
  Download,
  Upload,
  Briefcase,
  Layers,
  GraduationCap,
  Award,
  Code,
  Search,
  BookOpen,
  ArrowRight,
  X,
  Eye,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Globe,
  FileDown,
  RefreshCw,
  FolderSync,
} from 'lucide-react';
import { BaseCV, JobAnalysisResult, JobApplication, CVTemplateId } from '../types';
import { CV_TEMPLATES, getTemplateById } from '../data/cvTemplates';
import { ReferenceCVAdaptModal } from './ReferenceCVAdaptModal';
import { CVExportModal } from './CVExportModal';
import { BulletOptimizerModal } from './BulletOptimizerModal';
import { parseWordDocumentFile } from '../utils/wordParser';
import { createGoogleDocFromCV, GoogleDocResult } from '../lib/googleDocs';

interface CVVaultViewProps {
  baseCvs: BaseCV[];
  applications: JobApplication[];
  onSaveCV: (cv: BaseCV) => void;
  onDeleteCV: (id: string) => void;
  onSetDefaultCV: (id: string) => void;
  onDuplicateCV: (cv: BaseCV) => void;
  onOpenSidePeekForJob?: (app: JobApplication) => void;
}

export const CVVaultView: React.FC<CVVaultViewProps> = ({
  baseCvs,
  applications,
  onSaveCV,
  onDeleteCV,
  onSetDefaultCV,
  onDuplicateCV,
}) => {
  const [selectedCv, setSelectedCv] = useState<BaseCV | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportCvTarget, setExportCvTarget] = useState<BaseCV | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isReferenceAdaptOpen, setIsReferenceAdaptOpen] = useState(false);
  const [referenceAdaptTargetCvId, setReferenceAdaptTargetCvId] = useState<string | undefined>(undefined);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingCvId, setDeletingCvId] = useState<string | null>(null);
  const [syncingGDocCvId, setSyncingGDocCvId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Resume import / Word doc upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawResumeText, setRawResumeText] = useState('');
  const [importTargetRole, setImportTargetRole] = useState('Senior Full-Stack Engineer');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Job Matching Simulator state
  const [simSelectedCvId, setSimSelectedCvId] = useState<string>(baseCvs[0]?.id || '');
  const [simJobUrl, setSimJobUrl] = useState('');
  const [simJobDesc, setSimJobDesc] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    analysis?: JobAnalysisResult;
    matchScore?: number;
    strengths?: string[];
    gaps?: string[];
    advice?: string[];
  } | null>(null);

  const filteredCvs = baseCvs.filter((cv) => {
    const q = searchQuery.toLowerCase();
    return (
      cv.title.toLowerCase().includes(q) ||
      cv.targetRole.toLowerCase().includes(q) ||
      cv.summary.toLowerCase().includes(q) ||
      cv.skills.some((s) => s.items.some((i) => i.toLowerCase().includes(q)))
    );
  });

  // Calculate usage stats per CV
  const getCvUsageCount = (cvId: string) => {
    return applications.filter(
      (a) => a.appliedCvId === cvId || a.tailoredCv?.baseCvId === cvId
    ).length;
  };

  const handleCopyMarkdown = (cv: BaseCV) => {
    const md = `# ${cv.fullName}
${cv.email} | ${cv.phone || ''} | ${cv.location} | ${cv.linkedin || ''}

## Professional Summary
${cv.summary}

## Core Competencies
${cv.skills.map((s) => `**${s.category}**: ${s.items.join(', ')}`).join('\n')}

## Experience
${cv.experience
  .map(
    (e) => `### ${e.role} — ${e.company} (${e.startDate} - ${e.endDate || 'Present'})
${e.bullets.map((b) => `- ${b}`).join('\n')}`
  )
  .join('\n\n')}

## Education
${cv.education.map((ed) => `- **${ed.degree}**, ${ed.institution} (${ed.graduationYear})`).join('\n')}
`;

    navigator.clipboard.writeText(md);
    setCopiedId(cv.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // File Input handler (PDF or Word / Text)
  const handleWordFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setUploadedFileName(file.name);

    // If PDF file, parse directly via server endpoint
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });

        const res = await fetch(apiUrl('/api/parse-pdf-resume'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfBase64: base64Data,
            fileName: file.name,
            targetRole: importTargetRole,
          }),
        });

        const json = await res.json();
        if (json.success && json.data) {
          onSaveCV(json.data);
          setSyncNotice(`Parsed & saved PDF Resume: "${json.data.title}"!`);
          setTimeout(() => setSyncNotice(null), 4000);
        } else {
          setImportError(json.error || 'Failed to parse PDF resume');
          setIsImportModalOpen(true);
        }
      } catch (err: any) {
        setImportError(err.message || 'Network error processing PDF resume');
        setIsImportModalOpen(true);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      return;
    }

    try {
      const extracted = await parseWordDocumentFile(file);
      setRawResumeText(extracted.text);
      setIsImportModalOpen(true);
    } catch (err: any) {
      setImportError(err.message || 'Failed to extract text from document');
      setIsImportModalOpen(true);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // AI Resume Parser Execution
  const handleImportResume = async () => {
    if (!rawResumeText.trim()) return;
    setIsImporting(true);
    setImportError(null);

    try {
      const res = await fetch(apiUrl('/api/parse-resume-text'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawResumeText,
          targetRole: importTargetRole,
          fileName: uploadedFileName,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        onSaveCV(json.data);
        setIsImportModalOpen(false);
        setRawResumeText('');
        setUploadedFileName('');
      } else {
        setImportError(json.error || 'Failed to parse resume text');
      }
    } catch (err: any) {
      setImportError(err.message || 'Network error during resume parsing');
    } finally {
      setIsImporting(false);
    }
  };

  // Save/Sync Single CV to Google Docs
  const handleSaveToGoogleDoc = async (cv: BaseCV) => {
    setSyncingGDocCvId(cv.id);
    setSyncNotice(null);
    try {
      const result = await createGoogleDocFromCV(cv, null, (cv.templateId as CVTemplateId) || 'modern-executive');
      const updatedCv: BaseCV = {
        ...cv,
        googleDocId: result.documentId,
        googleDocUrl: result.documentUrl,
        updatedAt: new Date().toISOString(),
      };
      onSaveCV(updatedCv);
      setSyncNotice(`Google Doc created for "${cv.title}"!`);
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (err: any) {
      setSyncNotice(`Google Doc error: ${err.message || 'Failed to save'}`);
      setTimeout(() => setSyncNotice(null), 5000);
    } finally {
      setSyncingGDocCvId(null);
    }
  };

  // Save All CVs as Google Docs in batch
  const handleSaveAllAsGoogleDocs = async () => {
    if (baseCvs.length === 0) return;
    setIsSyncingAll(true);
    setSyncNotice('Syncing all base CVs to Google Docs...');
    let successCount = 0;

    for (const cv of baseCvs) {
      try {
        const result = await createGoogleDocFromCV(cv, null, (cv.templateId as CVTemplateId) || 'modern-executive');
        const updatedCv: BaseCV = {
          ...cv,
          googleDocId: result.documentId,
          googleDocUrl: result.documentUrl,
          updatedAt: new Date().toISOString(),
        };
        onSaveCV(updatedCv);
        successCount++;
      } catch (err) {
        console.warn('Batch sync note for cv:', cv.title, err);
      }
    }

    setIsSyncingAll(false);
    setSyncNotice(`Successfully synced ${successCount} of ${baseCvs.length} CVs to Google Docs!`);
    setTimeout(() => setSyncNotice(null), 4500);
  };

  // Quick Template Change for a CV
  const handleTemplateChange = (cv: BaseCV, newTemplateId: CVTemplateId) => {
    const updated: BaseCV = {
      ...cv,
      templateId: newTemplateId,
      updatedAt: new Date().toISOString(),
    };
    onSaveCV(updated);
  };

  const handleRunSimulator = async () => {
    if (!simJobDesc.trim() && !simJobUrl.trim()) return;
    setIsSimulating(true);

    try {
      const res = await fetch(apiUrl('/api/analyze-job'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl: simJobUrl,
          jobDescription: simJobDesc,
        }),
      });
      const data = await res.json();
      const chosenCv = baseCvs.find((c) => c.id === simSelectedCvId) || baseCvs[0];

      if (data.success && data.data && chosenCv) {
        const jdKeywords = [
          ...data.data.requiredSkills,
          ...data.data.atsKeywords,
        ].map((k: string) => k.toLowerCase());

        const cvSkills = chosenCv.skills
          .flatMap((s) => s.items)
          .map((i) => i.toLowerCase());

        const matched = jdKeywords.filter((k: string) =>
          cvSkills.some((s) => s.includes(k) || k.includes(s))
        );

        const score = Math.min(
          98,
          Math.max(68, Math.round((matched.length / Math.max(1, jdKeywords.length)) * 100 + 35))
        );

        setSimResult({
          analysis: data.data,
          matchScore: score,
          strengths: data.data.requiredSkills.slice(0, 3),
          gaps: data.data.preferredSkills.slice(0, 2),
          advice: data.data.tailoringAdvice,
        });
      }
    } catch (e) {
      console.error('Simulator error:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 py-6 space-y-6">
      {/* Hidden File Input (PDF, Word, Text) */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.docx,.doc,.txt,.md"
        onChange={handleWordFileSelected}
        className="hidden"
      />

      {/* Sync Status Banner */}
      {syncNotice && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Globe className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-blue-500 hover:text-blue-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">CV & Resume Vault</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {baseCvs.length} Base Profiles
              </span>
            </div>
            <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
              Upload Word documents, select from 5 executive templates, adapt to dream reference CVs with AI, and convert directly to editable Google Docs synced with your Google Drive.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            {/* Upload PDF / Word Document */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Resume (PDF / Word)</span>
            </button>

            {/* Adapt from Reference CV */}
            <button
              type="button"
              onClick={() => {
                setReferenceAdaptTargetCvId(baseCvs[0]?.id);
                setIsReferenceAdaptOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Adapt Reference CV</span>
            </button>

            {/* Save All to Google Docs */}
            <button
              type="button"
              disabled={isSyncingAll || baseCvs.length === 0}
              onClick={handleSaveAllAsGoogleDocs}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/15 shadow-xs transition flex items-center gap-1.5 cursor-pointer backdrop-blur-xs disabled:opacity-50"
            >
              <Globe className="w-3.5 h-3.5 text-blue-300" />
              <span>{isSyncingAll ? 'Syncing Docs...' : 'Sync All to Google Docs'}</span>
            </button>

            {/* Job Match Advisor */}
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/15 shadow-xs transition flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Job Match Advisor</span>
            </button>

            {/* Create Empty Profile */}
            <button
              onClick={() => {
                const newCv: BaseCV = {
                  id: `cv-${Date.now()}`,
                  title: 'New Role Profile',
                  targetRole: 'Target Position Title',
                  fullName: '',
                  email: '',
                  location: 'Remote',
                  summary: 'Summarize your core background, key strengths, and career highlights...',
                  skills: [{ category: 'Core Skills', items: [] }],
                  experience: [
                    {
                      id: `exp-${Date.now()}`,
                      company: 'Recent Company',
                      role: 'Role / Position Title',
                      startDate: '2022',
                      endDate: 'Present',
                      isCurrent: true,
                      bullets: ['Describe your core achievements with quantifiable metrics.'],
                    },
                  ],
                  education: [
                    {
                      id: `edu-${Date.now()}`,
                      degree: 'Degree / Program',
                      institution: 'University / Institute',
                      graduationYear: '2022',
                    },
                  ],
                  templateId: 'modern-executive',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setSelectedCv(newCv);
                setIsEditing(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Quick Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/80 p-3 rounded-xl border border-neutral-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search CVs by role, skill, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-neutral-200 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-600">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Total Base CVs: <strong className="text-neutral-900">{baseCvs.length}</strong>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Google Docs Synced:{' '}
            <strong className="text-neutral-900">
              {baseCvs.filter((c) => c.googleDocUrl).length}
            </strong>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            Applications Linked:{' '}
            <strong className="text-neutral-900">
              {applications.filter((a) => a.tailoredCv || a.appliedCvId).length}
            </strong>
          </span>
        </div>
      </div>

      {/* CV Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCvs.map((cv) => {
          const usageCount = getCvUsageCount(cv.id);
          const currentTemplate = getTemplateById(cv.templateId as CVTemplateId);
          const isSyncing = syncingGDocCvId === cv.id;

          return (
            <div
              key={cv.id}
              className={`bg-white rounded-2xl border transition-all duration-150 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                cv.isDefault
                  ? 'border-blue-300 ring-1 ring-blue-100'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                      {cv.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Star className="w-2.5 h-2.5 fill-blue-600 text-blue-600" />
                          Default Base
                        </span>
                      )}
                      {cv.adaptedFromReferenceId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                          Reference Adapted
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700">
                        {usageCount} {usageCount === 1 ? 'Job' : 'Jobs'} Linked
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-neutral-900 leading-snug">{cv.title}</h3>
                    <p className="text-xs text-blue-600 font-semibold">{cv.targetRole}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopyMarkdown(cv)}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
                      title="Copy Full Markdown"
                    >
                      {copiedId === cv.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCv(cv);
                        setIsPreviewing(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
                      title="Preview ATS Format"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Template Selector Pill */}
                <div className="flex items-center justify-between bg-neutral-50 p-2 rounded-xl border border-neutral-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: currentTemplate.accentColor }}
                    />
                    <span className="font-semibold text-neutral-800 text-[11px]">
                      Template: {currentTemplate.name}
                    </span>
                  </div>
                  <select
                    value={cv.templateId || 'modern-executive'}
                    onChange={(e) => handleTemplateChange(cv, e.target.value as CVTemplateId)}
                    className="text-[10px] bg-white border border-neutral-200 rounded px-1.5 py-0.5 font-medium text-neutral-700 outline-none cursor-pointer"
                  >
                    {CV_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Google Docs Status & Actions */}
                <div className="flex items-center justify-between bg-blue-50/40 p-2.5 rounded-xl border border-blue-100 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-[11px] font-semibold text-blue-900 truncate">
                      {cv.googleDocUrl ? 'Google Doc Synced' : 'Not in Google Docs'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {cv.googleDocUrl ? (
                      <a
                        href={cv.googleDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow-2xs transition"
                      >
                        <span>Open Doc</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={() => handleSaveToGoogleDoc(cv)}
                        className="px-2 py-0.5 bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                      >
                        {isSyncing ? (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Plus className="w-2.5 h-2.5" />
                        )}
                        <span>Save to Docs</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary Snippet */}
                <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed bg-neutral-50/60 p-2.5 rounded-xl border border-neutral-100 font-normal">
                  {cv.summary}
                </p>

                {/* Key Skills Tags */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-wider">
                    Core Skills &amp; Stack
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {cv.skills
                      .flatMap((s) => s.items)
                      .slice(0, 6)
                      .map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[11px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    {cv.skills.flatMap((s) => s.items).length > 6 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-neutral-400 font-medium">
                        +{cv.skills.flatMap((s) => s.items).length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-[#FAF9F7] border-t border-neutral-100 rounded-b-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setExportCvTarget(cv);
                      setIsExportModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded bg-white hover:bg-neutral-100 text-neutral-700 font-semibold border border-neutral-200 shadow-2xs transition flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <FileDown className="w-3 h-3 text-blue-600" />
                    <span>Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceAdaptTargetCvId(cv.id);
                      setIsReferenceAdaptOpen(true);
                    }}
                    className="px-2 py-1 rounded text-purple-700 hover:bg-purple-50 transition font-medium cursor-pointer text-[11px] flex items-center gap-1"
                    title="Adapt this CV to a Reference Resume style"
                  >
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>Adapt</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedCv(cv);
                      setIsEditing(true);
                    }}
                    className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 shadow-2xs transition flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit in App</span>
                  </button>

                  {baseCvs.length > 1 && (
                    deletingCvId === cv.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-xs animate-in fade-in">
                        <span className="text-rose-700 font-semibold text-[10px]">Delete?</span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteCV(cv.id);
                            setDeletingCvId(null);
                          }}
                          className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCvId(null)}
                          className="px-1 py-0.5 text-neutral-500 hover:text-neutral-700 text-[10px] transition cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingCvId(cv.id)}
                        className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete CV"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resume Import / Word Document Parsing Modal */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-[#FAF9F7]">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">Word Document &amp; AI Resume Importer</h3>
                  <p className="text-[11px] text-neutral-500">
                    Parse structured Base CVs from Word (.docx), PDF text, or LinkedIn exports.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {uploadedFileName && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">Word Document: {uploadedFileName}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-[10px] font-bold rounded-full">
                    Ready to Parse
                  </span>
                </div>
              )}

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Target Role Archetype
                </label>
                <input
                  type="text"
                  value={importTargetRole}
                  onChange={(e) => setImportTargetRole(e.target.value)}
                  placeholder="e.g. Senior Full-Stack Engineer, AI Engineer, Tech Lead"
                  className="w-full p-2.5 rounded-xl border border-neutral-200 focus:border-blue-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Extracted Resume Text / Content
                </label>
                <textarea
                  rows={9}
                  value={rawResumeText}
                  onChange={(e) => setRawResumeText(e.target.value)}
                  placeholder="Paste your full resume text here or upload a Word document..."
                  className="w-full p-3 rounded-xl border border-neutral-200 focus:border-blue-500 outline-none font-mono text-[11px] leading-relaxed"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-[#FAF9F7] border-t border-neutral-100 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl hover:bg-neutral-200 text-neutral-600 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isImporting || !rawResumeText.trim()}
                onClick={handleImportResume}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                {isImporting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Parsing Resume with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Parse &amp; Save Base CV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference CV Adaptation Modal */}
      {isReferenceAdaptOpen && (
        <ReferenceCVAdaptModal
          baseCvs={baseCvs}
          initialSelectedCvId={referenceAdaptTargetCvId}
          onClose={() => setIsReferenceAdaptOpen(false)}
          onSaveAdaptedCV={(adaptedCv) => {
            onSaveCV(adaptedCv);
            setIsReferenceAdaptOpen(false);
          }}
        />
      )}

      {/* CV Export & Google Docs Modal */}
      {isExportModalOpen && exportCvTarget && (
        <CVExportModal
          isOpen={isExportModalOpen}
          onClose={() => {
            setIsExportModalOpen(false);
            setExportCvTarget(null);
          }}
          cvData={exportCvTarget}
          roleName={exportCvTarget.targetRole}
          onDocCreated={(res: GoogleDocResult) => {
            const updated = {
              ...exportCvTarget,
              googleDocId: res.documentId,
              googleDocUrl: res.documentUrl,
              updatedAt: new Date().toISOString(),
            };
            onSaveCV(updated);
          }}
        />
      )}

      {/* Job Matching Simulator Modal */}
      {isSimulatorOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsSimulatorOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-[#FAF9F7]">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">Job Match &amp; Tailoring Advisor</h3>
                  <p className="text-[11px] text-neutral-500">
                    Test how any Base CV matches a job description and get immediate tailoring advice.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Select Base CV to Test</label>
                  <select
                    value={simSelectedCvId}
                    onChange={(e) => setSimSelectedCvId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-neutral-200 focus:border-blue-500 outline-none text-xs font-semibold"
                  >
                    {baseCvs.map((cv) => (
                      <option key={cv.id} value={cv.id}>
                        {cv.title} ({cv.targetRole})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Job Post URL (Optional)</label>
                  <input
                    type="url"
                    value={simJobUrl}
                    onChange={(e) => setSimJobUrl(e.target.value)}
                    placeholder="https://company.com/careers/role"
                    className="w-full p-2.5 rounded-lg border border-neutral-200 focus:border-blue-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  Job Description / Role Requirements *
                </label>
                <textarea
                  rows={5}
                  value={simJobDesc}
                  onChange={(e) => setSimJobDesc(e.target.value)}
                  placeholder="Paste the target job description requirements, responsibilities, or tech stack here..."
                  className="w-full p-3 rounded-lg border border-neutral-200 focus:border-blue-500 outline-none text-xs"
                />
              </div>

              <div className="flex justify-end">
                <button
                  disabled={isSimulating || (!simJobDesc.trim() && !simJobUrl.trim())}
                  onClick={handleRunSimulator}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  {isSimulating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Analyzing Alignment...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze Alignment &amp; Get Advice</span>
                    </>
                  )}
                </button>
              </div>

              {/* Simulation Result */}
              {simResult && simResult.analysis && (
                <div className="mt-4 p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-blue-900 block uppercase tracking-wider">
                        Target Role Identified
                      </span>
                      <h4 className="font-bold text-sm text-neutral-900">
                        {simResult.analysis.role} at {simResult.analysis.company}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 block font-medium">Estimated Match</span>
                      <span className="text-lg font-black text-emerald-600">
                        {simResult.matchScore}%
                      </span>
                    </div>
                  </div>

                  {/* Advice Bullets */}
                  <div>
                    <span className="text-xs font-bold text-neutral-800 block mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Strategic CV Tailoring Recommendations</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-neutral-700">
                      {simResult.analysis.tailoringAdvice.map((adv, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-blue-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* ATS Keywords */}
                  <div>
                    <span className="text-[11px] font-bold text-neutral-700 block mb-1">
                      Top ATS Keywords to Feature:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {simResult.analysis.atsKeywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-white rounded border border-blue-200 text-blue-800 font-semibold text-[11px]"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-[#FAF9F7] border-t border-neutral-100 flex items-center justify-end shrink-0">
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CV Full ATS Preview Modal */}
      {isPreviewing && selectedCv && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsPreviewing(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-[#FAF9F7] shrink-0">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">{selectedCv.title}</h3>
                  <p className="text-[11px] text-neutral-500">
                    Template: {getTemplateById(selectedCv.templateId as CVTemplateId).name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setExportCvTarget(selectedCv);
                    setIsExportModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Export &amp; Docs</span>
                </button>
                <button
                  onClick={() => handleCopyMarkdown(selectedCv)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </button>
                <button
                  onClick={() => setIsPreviewing(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ATS Resume Sheet */}
            <div className="p-8 overflow-y-auto flex-1 space-y-6 text-neutral-900 bg-white font-sans">
              <div className="text-center border-b pb-4 space-y-1" style={{ borderColor: getTemplateById(selectedCv.templateId as CVTemplateId).accentColor }}>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-950">{selectedCv.fullName}</h1>
                <p className="text-xs text-neutral-600">
                  {selectedCv.email} • {selectedCv.phone || ''} • {selectedCv.location}
                </p>
                {selectedCv.linkedin && (
                  <p className="text-[11px] text-blue-600 font-medium">
                    {selectedCv.linkedin} • {selectedCv.github || ''}
                  </p>
                )}
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <h4
                  className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b pb-1"
                  style={{ borderColor: getTemplateById(selectedCv.templateId as CVTemplateId).accentColor }}
                >
                  Professional Summary
                </h4>
                <p className="text-xs text-neutral-700 leading-relaxed font-normal">{selectedCv.summary}</p>
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <h4
                  className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b pb-1"
                  style={{ borderColor: getTemplateById(selectedCv.templateId as CVTemplateId).accentColor }}
                >
                  Technical Competencies
                </h4>
                <div className="space-y-1 text-xs">
                  {selectedCv.skills.map((s, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:gap-2">
                      <strong className="text-neutral-900 min-w-[140px]">{s.category}:</strong>
                      <span className="text-neutral-700">{s.items.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-4">
                <h4
                  className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b pb-1"
                  style={{ borderColor: getTemplateById(selectedCv.templateId as CVTemplateId).accentColor }}
                >
                  Work Experience
                </h4>
                {selectedCv.experience.map((exp) => (
                  <div key={exp.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-neutral-950 text-sm font-semibold">{exp.role}</strong>
                        <span className="text-neutral-600 font-medium"> — {exp.company}</span>
                      </div>
                      <span className="text-neutral-500 text-[11px]">
                        {exp.startDate} – {exp.endDate || 'Present'}
                      </span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-neutral-700">
                      {exp.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Education */}
              <div className="space-y-2">
                <h4
                  className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b pb-1"
                  style={{ borderColor: getTemplateById(selectedCv.templateId as CVTemplateId).accentColor }}
                >
                  Education
                </h4>
                {selectedCv.education.map((ed) => (
                  <div key={ed.id} className="flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-neutral-900">{ed.degree}</strong>
                      <span className="text-neutral-600">, {ed.institution}</span>
                    </div>
                    <span className="text-neutral-500">{ed.graduationYear}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CV Full In-App Editor Modal */}
      {isEditing && selectedCv && (
        <CVEditorModal
          cv={selectedCv}
          onClose={() => {
            setIsEditing(false);
            setSelectedCv(null);
          }}
          onSave={(updated) => {
            onSaveCV(updated);
            setIsEditing(false);
            setSelectedCv(null);
          }}
        />
      )}
    </div>
  );
};

// Extracted Sub-Component: In-App CV Editor Modal
interface CVEditorModalProps {
  cv: BaseCV;
  onClose: () => void;
  onSave: (cv: BaseCV) => void;
}

const CVEditorModal: React.FC<CVEditorModalProps> = ({ cv, onClose, onSave }) => {
  const [formData, setFormData] = useState<BaseCV>({
    ...cv,
    templateId: (cv.templateId as CVTemplateId) || 'modern-executive',
  });
  const [activeTab, setActiveTab] = useState<
    'info' | 'template' | 'summary' | 'skills' | 'experience' | 'education'
  >('info');
  const [isSyncingGDoc, setIsSyncingGDoc] = useState(false);
  const [gDocSuccessNotice, setGDocSuccessNotice] = useState<string | null>(null);
  const [optimizingBullet, setOptimizingBullet] = useState<{
    bulletText: string;
    role?: string;
    company?: string;
    expId: string;
    bulletIndex: number;
  } | null>(null);

  const handleFieldChange = (field: keyof BaseCV, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value, updatedAt: new Date().toISOString() }));
  };

  const handleSaveToGoogleDocDirect = async () => {
    setIsSyncingGDoc(true);
    setGDocSuccessNotice(null);
    try {
      const res = await createGoogleDocFromCV(
        formData,
        null,
        (formData.templateId as CVTemplateId) || 'modern-executive'
      );
      setFormData((prev) => ({
        ...prev,
        googleDocId: res.documentId,
        googleDocUrl: res.documentUrl,
        updatedAt: new Date().toISOString(),
      }));
      setGDocSuccessNotice(`Successfully saved to Google Docs: ${res.title}`);
      setTimeout(() => setGDocSuccessNotice(null), 4000);
    } catch (err: any) {
      setGDocSuccessNotice(`Google Doc Notice: ${err.message || 'Saved locally'}`);
      setTimeout(() => setGDocSuccessNotice(null), 4000);
    } finally {
      setIsSyncingGDoc(false);
    }
  };

  const handleAddExperience = () => {
    const newExp = {
      id: `exp-${Date.now()}`,
      company: 'Company Name',
      role: 'Role / Position Title',
      startDate: '2023-01',
      endDate: 'Present',
      isCurrent: true,
      bullets: ['Describe your core achievements with quantifiable metrics...'],
      techStack: [],
    };
    setFormData((prev) => ({
      ...prev,
      experience: [newExp, ...prev.experience],
    }));
  };

  const handleUpdateExperience = (id: string, updatedFields: any) => {
    setFormData((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => (e.id === id ? { ...e, ...updatedFields } : e)),
    }));
  };

  const handleDeleteExperience = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      experience: prev.experience.filter((e) => e.id !== id),
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-[#FAF9F7] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900">Edit Base CV: {formData.title}</h3>
              <p className="text-[11px] text-neutral-500">
                In-app editor with Google Docs synchronization and multi-template formatting.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-neutral-200 bg-neutral-50/50 gap-2 shrink-0 overflow-x-auto">
          {[
            { id: 'info', label: 'Role & Contact' },
            { id: 'template', label: 'CV Template & Style' },
            { id: 'summary', label: 'Summary' },
            { id: 'skills', label: 'Skills & Stack' },
            { id: 'experience', label: 'Work Experience' },
            { id: 'education', label: 'Education' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {gDocSuccessNotice && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{gDocSuccessNotice}</span>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Profile Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 focus:border-blue-500 outline-none text-xs"
                    placeholder="e.g. Senior Full-Stack Engineer Base"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Target Role Archetype *</label>
                  <input
                    type="text"
                    value={formData.targetRole}
                    onChange={(e) => handleFieldChange('targetRole', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 focus:border-blue-500 outline-none text-xs"
                    placeholder="e.g. Senior Full-Stack Engineer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={formData.linkedin || ''}
                    onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">GitHub / Portfolio</label>
                  <input
                    type="url"
                    value={formData.github || ''}
                    onChange={(e) => handleFieldChange('github', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 outline-none text-xs"
                  />
                </div>
              </div>

              {/* Google Docs Sync Action inside Info */}
              <div className="mt-4 p-4 rounded-xl bg-blue-50/50 border border-blue-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-neutral-900">Google Docs Connection</h5>
                    <p className="text-[11px] text-neutral-500">
                      {formData.googleDocUrl ? (
                        <span className="text-emerald-700 font-semibold">
                          Linked to Google Doc: {formData.googleDocUrl}
                        </span>
                      ) : (
                        'Save as an active Google Doc on your Google Drive'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {formData.googleDocUrl && (
                    <a
                      href={formData.googleDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs"
                    >
                      <span>Open Doc</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={isSyncingGDoc}
                    onClick={handleSaveToGoogleDocDirect}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isSyncingGDoc ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Globe className="w-3.5 h-3.5" />
                    )}
                    <span>{formData.googleDocUrl ? 'Re-sync Doc' : 'Save to Google Docs'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'template' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-neutral-900 text-xs">Visual CV Template Selection</h4>
                <p className="text-[11px] text-neutral-500">
                  Select the styling archetype for exports, Google Docs creation, and PDF rendering.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CV_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleFieldChange('templateId', tmpl.id)}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      formData.templateId === tmpl.id
                        ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-neutral-900">{tmpl.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3 h-3 rounded-full shadow-xs"
                            style={{ backgroundColor: tmpl.accentColor }}
                          />
                          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[9px] font-bold uppercase">
                            {tmpl.badge}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-neutral-600 leading-snug">{tmpl.description}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-neutral-100 text-[10px] text-neutral-500">
                      <strong>Best for:</strong> {tmpl.bestFor}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="space-y-2">
              <label className="font-semibold text-neutral-700 block">Professional Summary</label>
              <p className="text-[11px] text-neutral-500">
                A high-impact overview of your domain authority, years of experience, and primary stack.
              </p>
              <textarea
                rows={7}
                value={formData.summary}
                onChange={(e) => handleFieldChange('summary', e.target.value)}
                className="w-full p-3 rounded-xl border border-neutral-200 focus:border-blue-500 outline-none text-xs leading-relaxed"
              />
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800">Skill Categories</span>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      skills: [...prev.skills, { category: 'New Category', items: ['Skill 1', 'Skill 2'] }],
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Skill Group</span>
                </button>
              </div>

              {formData.skills.map((skillGroup, idx) => (
                <div key={idx} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={skillGroup.category}
                      onChange={(e) => {
                        const updated = [...formData.skills];
                        updated[idx].category = e.target.value;
                        handleFieldChange('skills', updated);
                      }}
                      className="font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-neutral-200 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.skills.filter((_, i) => i !== idx);
                        handleFieldChange('skills', updated);
                      }}
                      className="text-neutral-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={skillGroup.items.join(', ')}
                    onChange={(e) => {
                      const updated = [...formData.skills];
                      updated[idx].items = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                      handleFieldChange('skills', updated);
                    }}
                    placeholder="Comma-separated items (e.g. React, TypeScript, Vite)"
                    className="w-full p-2.5 bg-white rounded-lg border border-neutral-200 outline-none text-xs"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'experience' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800">Experience Entries</span>
                <button
                  type="button"
                  onClick={handleAddExperience}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Experience</span>
                </button>
              </div>

              {formData.experience.map((exp) => (
                <div key={exp.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                      <input
                        type="text"
                        value={exp.role}
                        onChange={(e) => handleUpdateExperience(exp.id, { role: e.target.value })}
                        placeholder="Role / Title"
                        className="font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-neutral-200 outline-none"
                      />
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => handleUpdateExperience(exp.id, { company: e.target.value })}
                        placeholder="Company"
                        className="text-xs bg-white px-2.5 py-1 rounded-lg border border-neutral-200 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="text-neutral-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={exp.startDate}
                      onChange={(e) => handleUpdateExperience(exp.id, { startDate: e.target.value })}
                      placeholder="Start Date (e.g. 2022-03)"
                      className="text-xs bg-white px-2.5 py-1 rounded-lg border border-neutral-200 outline-none"
                    />
                    <input
                      type="text"
                      value={exp.endDate}
                      onChange={(e) => handleUpdateExperience(exp.id, { endDate: e.target.value })}
                      placeholder="End Date (e.g. Present)"
                      className="text-xs bg-white px-2.5 py-1 rounded-lg border border-neutral-200 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-neutral-600 block">
                        Achievement Bullets (One per line)
                      </label>
                      <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        Click bullet to optimize with Google XYZ
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={exp.bullets.join('\n')}
                      onChange={(e) =>
                        handleUpdateExperience(exp.id, {
                          bullets: e.target.value.split('\n').filter((l) => l.trim().length > 0),
                        })
                      }
                      className="w-full p-2.5 bg-white rounded-lg border border-neutral-200 outline-none text-xs font-mono mb-2"
                      placeholder="• Achieved X by doing Y as measured by Z"
                    />

                    {/* Interactive Bullet Strengthening Chips */}
                    {exp.bullets.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {exp.bullets.map((b, bIdx) => (
                          <div
                            key={bIdx}
                            className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-neutral-200 text-xs"
                          >
                            <span className="truncate text-neutral-700 font-medium text-[11px]">{b}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setOptimizingBullet({
                                  bulletText: b,
                                  role: exp.role,
                                  company: exp.company,
                                  expId: exp.id,
                                  bulletIndex: bIdx,
                                })
                              }
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[10px] shrink-0 flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              <span>Strengthen</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'education' && (
            <div className="space-y-3">
              <span className="font-semibold text-neutral-800 block">Education Records</span>
              {formData.education.map((ed, idx) => (
                <div key={ed.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={ed.degree}
                    onChange={(e) => {
                      const updated = [...formData.education];
                      updated[idx].degree = e.target.value;
                      handleFieldChange('education', updated);
                    }}
                    placeholder="Degree"
                    className="p-2 bg-white rounded-lg border border-neutral-200 text-xs"
                  />
                  <input
                    type="text"
                    value={ed.institution}
                    onChange={(e) => {
                      const updated = [...formData.education];
                      updated[idx].institution = e.target.value;
                      handleFieldChange('education', updated);
                    }}
                    placeholder="Institution"
                    className="p-2 bg-white rounded-lg border border-neutral-200 text-xs"
                  />
                  <input
                    type="text"
                    value={ed.graduationYear}
                    onChange={(e) => {
                      const updated = [...formData.education];
                      updated[idx].graduationYear = e.target.value;
                      handleFieldChange('education', updated);
                    }}
                    placeholder="Year"
                    className="p-2 bg-white rounded-lg border border-neutral-200 text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#FAF9F7] border-t border-neutral-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl hover:bg-neutral-200 text-neutral-600 text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(formData)}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Base Profile</span>
          </button>
        </div>

        {/* Bullet Optimizer Modal */}
        {optimizingBullet && (
          <BulletOptimizerModal
            isOpen={!!optimizingBullet}
            onClose={() => setOptimizingBullet(null)}
            initialBullet={optimizingBullet.bulletText}
            role={optimizingBullet.role}
            company={optimizingBullet.company}
            targetJob={formData.targetRole}
            onApplyBullet={(newBullet) => {
              const updatedExperience = formData.experience.map((exp) => {
                if (exp.id === optimizingBullet.expId) {
                  const newBullets = [...exp.bullets];
                  newBullets[optimizingBullet.bulletIndex] = newBullet;
                  return { ...exp, bullets: newBullets };
                }
                return exp;
              });

              setFormData((prev) => ({
                ...prev,
                experience: updatedExperience,
                updatedAt: new Date().toISOString(),
              }));
              setOptimizingBullet(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
