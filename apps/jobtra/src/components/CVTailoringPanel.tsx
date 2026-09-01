import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Copy,
  Download,
  Check,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Layers,
  Award,
  Send,
  Eye,
  Sliders,
  Briefcase,
  FileDown,
  Globe
} from 'lucide-react';
import { BaseCV, JobAnalysisResult, JobApplication, TailoredCVRecord } from '../types';
import { CVExportModal } from './CVExportModal';
import { BulletOptimizerModal } from './BulletOptimizerModal';

interface CVTailoringPanelProps {
  application: JobApplication;
  baseCvs: BaseCV[];
  onUpdateApplication: (app: JobApplication) => void;
}

export const CVTailoringPanel: React.FC<CVTailoringPanelProps> = ({
  application,
  baseCvs,
  onUpdateApplication,
}) => {
  // Select Base CV (default to application.appliedCvId, or the first default CV)
  const [selectedBaseCvId, setSelectedBaseCvId] = useState<string>(() => {
    if (application.appliedCvId && baseCvs.some((c) => c.id === application.appliedCvId)) {
      return application.appliedCvId;
    }
    if (application.tailoredCv?.baseCvId && baseCvs.some((c) => c.id === application.tailoredCv.baseCvId)) {
      return application.tailoredCv.baseCvId;
    }
    const defaultCv = baseCvs.find((c) => c.isDefault);
    return defaultCv ? defaultCv.id : baseCvs[0]?.id || '';
  });

  const [jobDescription, setJobDescription] = useState(application.jobDescription || '');
  const [jobUrl, setJobUrl] = useState(application.jobUrl || '');

  // Analysis & Tailoring state
  const [isAnalyzingJob, setIsAnalyzingJob] = useState(false);
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysisResult | null>(null);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorStep, setTailorStep] = useState<string>('');
  const [tailorError, setTailorError] = useState<string | null>(null);

  // Active tailored result
  const [tailoredResult, setTailoredResult] = useState<TailoredCVRecord | null>(
    application.tailoredCv || null
  );

  const [activeSubTab, setActiveSubTab] = useState<'cv' | 'coverletter' | 'advice' | 'raw'>('cv');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [optimizingBullet, setOptimizingBullet] = useState<{
    bulletText: string;
    role?: string;
    company?: string;
    expId: string;
    bulletIndex: number;
  } | null>(null);

  const selectedBaseCv = baseCvs.find((c) => c.id === selectedBaseCvId) || baseCvs[0];

  // Sync when application changes
  useEffect(() => {
    setTailoredResult(application.tailoredCv || null);
    setJobDescription(application.jobDescription || '');
    setJobUrl(application.jobUrl || '');
    if (application.appliedCvId) {
      setSelectedBaseCvId(application.appliedCvId);
    }
  }, [application]);

  // 1. Analyze Job Description / Link
  const handleAnalyzeJob = async () => {
    if (!jobDescription.trim() && !jobUrl.trim() && !application.role) return;
    setIsAnalyzingJob(true);
    setTailorError(null);

    try {
      const res = await fetch('/api/analyze-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl,
          jobDescription,
          company: application.company,
          role: application.role,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setJobAnalysis(json.data);
        // If user didn't have JD text saved, save the extracted synthesis
        if (!jobDescription.trim() && json.data.extractedDescription) {
          setJobDescription(json.data.extractedDescription);
          onUpdateApplication({
            ...application,
            jobDescription: json.data.extractedDescription,
            jobUrl: jobUrl || application.jobUrl,
          });
        }
      } else {
        setTailorError(json.error || 'Failed to analyze job description');
      }
    } catch (err: any) {
      setTailorError(err.message || 'Error analyzing job description');
    } finally {
      setIsAnalyzingJob(false);
    }
  };

  // 2. Run AI CV Tailoring
  const handleTailorCV = async () => {
    if (!selectedBaseCv) {
      setTailorError('Please select a Base CV from your vault first.');
      return;
    }

    setIsTailoring(true);
    setTailorError(null);
    setTailorStep('Reading Job Description & requirements...');

    try {
      setTimeout(() => setTailorStep('Matching technical skills & domain keywords...'), 600);
      setTimeout(() => setTailorStep('Rewriting impact achievement bullets...'), 1400);
      setTimeout(() => setTailorStep('Crafting tailored executive summary & cover pitch...'), 2200);

      const res = await fetch('/api/tailor-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseCv: selectedBaseCv,
          jobDescription: jobDescription || `Role: ${application.role} at ${application.company}`,
          company: application.company,
          role: application.role,
          jobUrl: jobUrl || application.jobUrl,
          notes: application.notes,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const record: TailoredCVRecord = json.data;
        record.baseCvId = selectedBaseCv.id;
        record.baseCvTitle = selectedBaseCv.title;
        record.jobApplicationId = application.id;

        setTailoredResult(record);

        // Auto-save to application document
        const updatedApp: JobApplication = {
          ...application,
          tailoredCv: record,
          appliedCvId: selectedBaseCv.id,
          appliedCvTitle: selectedBaseCv.title,
          jobDescription: jobDescription || application.jobDescription,
          jobUrl: jobUrl || application.jobUrl,
          updatedAt: new Date().toISOString(),
        };

        onUpdateApplication(updatedApp);
        setSaveNotice(true);
        setTimeout(() => setSaveNotice(false), 3500);
      } else {
        setTailorError(json.error || 'Failed to tailor CV with AI');
      }
    } catch (err: any) {
      setTailorError(err.message || 'Network error during tailoring');
    } finally {
      setIsTailoring(false);
      setTailorStep('');
    }
  };

  const handleCopyText = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  return (
    <div className="space-y-6 text-xs text-neutral-800">
      {/* Top Banner / Status */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-xl p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-sm tracking-tight text-white">
                AI Application & CV Tailoring
              </span>
              {tailoredResult ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {tailoredResult.matchScore}% ATS Match
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Ready to Tailor
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-300">
              Custom-tailored for <strong>{application.role}</strong> at <strong>{application.company}</strong>.
              All tailored bullets and custom cover letters are saved directly to this application record.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={isTailoring}
              onClick={handleTailorCV}
              className="px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              {isTailoring ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Tailoring...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{tailoredResult ? 'Re-Tailor CV' : 'Tailor CV with AI'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {saveNotice && (
          <div className="mt-3 p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-lg text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Tailored CV & application strategy saved successfully to this job record!</span>
          </div>
        )}
      </div>

      {tailorError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{tailorError}</span>
        </div>
      )}

      {/* Step 1: Base CV Selection & Job Input Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Base CV Selection */}
        <div className="lg:col-span-4 bg-neutral-50/80 p-4 rounded-xl border border-neutral-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Select Base CV</span>
            </label>
            <span className="text-[10px] text-neutral-500 font-medium">From Vault</span>
          </div>

          <select
            value={selectedBaseCvId}
            onChange={(e) => setSelectedBaseCvId(e.target.value)}
            className="w-full p-2 bg-white rounded-lg border border-neutral-200 text-xs font-semibold focus:border-blue-500 outline-none cursor-pointer"
          >
            {baseCvs.map((cv) => (
              <option key={cv.id} value={cv.id}>
                {cv.title} {cv.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>

          {selectedBaseCv && (
            <div className="p-3 bg-white rounded-lg border border-neutral-200 space-y-2 text-[11px]">
              <div>
                <span className="text-neutral-500 block text-[10px]">Target Role Archetype:</span>
                <strong className="text-neutral-800">{selectedBaseCv.targetRole}</strong>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Base Skills Sample:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedBaseCv.skills
                    .flatMap((s) => s.items)
                    .slice(0, 5)
                    .map((sk, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-neutral-100 rounded text-[10px]">
                        {sk}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Job Description & Link Import */}
        <div className="lg:col-span-8 bg-neutral-50/80 p-4 rounded-xl border border-neutral-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. Job Description & Posting Details</span>
            </label>
            <button
              type="button"
              disabled={isAnalyzingJob || (!jobDescription.trim() && !jobUrl.trim())}
              onClick={handleAnalyzeJob}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-neutral-200 shadow-2xs transition cursor-pointer"
            >
              {isAnalyzingJob ? (
                <>
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>Analyze Requirements</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <input
                type="url"
                placeholder="Job URL (e.g. https://company.com/jobs/...)"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="w-full p-2 bg-white rounded-lg border border-neutral-200 text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder={`Target: ${application.role} at ${application.company}`}
                readOnly
                className="w-full p-2 bg-neutral-100/70 rounded-lg border border-neutral-200 text-xs text-neutral-500 font-medium"
              />
            </div>
          </div>

          <div>
            <textarea
              rows={3}
              placeholder="Paste job description, requirements, or core responsibilities here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full p-2.5 bg-white rounded-lg border border-neutral-200 text-xs outline-none focus:border-blue-500 leading-relaxed font-sans"
            />
          </div>
        </div>
      </div>

      {/* AI Job Analysis Highlights (if available) */}
      {jobAnalysis && (
        <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Extracted Job Alignment Strategy</span>
            </span>
            <span className="text-[11px] text-indigo-800 font-semibold">
              {jobAnalysis.workType} • {jobAnalysis.location || 'Remote'}
            </span>
          </div>

          {/* Key Advice */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-indigo-900 block">
              Strategic CV Positioning Advice:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jobAnalysis.tailoringAdvice.map((adv, i) => (
                <div
                  key={i}
                  className="bg-white p-2 rounded-lg border border-indigo-100 text-[11px] text-neutral-700 flex items-start gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{adv}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top ATS Keywords */}
          <div>
            <span className="text-[10px] font-bold text-indigo-900 block uppercase tracking-wider mb-1">
              Key ATS Keywords to Emphasize:
            </span>
            <div className="flex flex-wrap gap-1">
              {jobAnalysis.atsKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-white text-indigo-800 font-semibold rounded text-[11px] border border-indigo-200"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tailoring Progress Loader */}
      {isTailoring && (
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-3 animate-in fade-in duration-150">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <strong className="text-sm text-neutral-900 block">Crafting Tailored Application Packet</strong>
            <p className="text-xs text-blue-700 font-medium">{tailorStep}</p>
          </div>
        </div>
      )}

      {/* Step 3: Tailored CV Results Output */}
      {tailoredResult && !isTailoring && (
        <div className="space-y-4 pt-2">
          {/* Match Score Bar */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center">
                <span className="text-base font-black text-emerald-700">
                  {tailoredResult.matchScore}%
                </span>
                <span className="text-[9px] font-bold text-emerald-600 uppercase">Match</span>
              </div>
              <div>
                <strong className="text-sm text-neutral-900 block">
                  Tailored with Base: {tailoredResult.baseCvTitle}
                </strong>
                <span className="text-[11px] text-neutral-500">
                  Tailored on {new Date(tailoredResult.tailoredAt).toLocaleDateString()} for {tailoredResult.company}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExportOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export &amp; Google Docs</span>
              </button>
              <button
                onClick={() =>
                  handleCopyText(tailoredResult.fullTailoredMarkdown, 'markdown')
                }
                className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedSection === 'markdown' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied Full CV!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Tailored CV</span>
                  </>
                )}
              </button>
              <button
                onClick={() =>
                  handleCopyText(tailoredResult.tailoredCoverLetter, 'cover')
                }
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedSection === 'cover' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied Pitch!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Copy Cover Letter</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sub-Tab Navigation for Tailored Packet */}
          <div className="flex items-center border-b border-neutral-200 bg-neutral-50/50 rounded-t-xl px-2 gap-1">
            {[
              { id: 'cv', label: 'Tailored CV & Bullets' },
              { id: 'coverletter', label: 'Custom Cover Letter / Pitch' },
              { id: 'advice', label: 'Strategic Interview Angles' },
              { id: 'raw', label: 'ATS Markdown Code' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`py-2.5 px-3.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  activeSubTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Tailored CV Content */}
          {activeSubTab === 'cv' && (
            <div className="bg-white p-6 rounded-b-xl border border-neutral-200 space-y-6 shadow-2xs">
              {/* Executive Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
                    Tailored Professional Summary
                  </span>
                  <button
                    onClick={() => handleCopyText(tailoredResult.tailoredSummary, 'summary')}
                    className="text-[11px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSection === 'summary' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy Summary</span>
                  </button>
                </div>
                <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-100 text-neutral-800 leading-relaxed font-medium">
                  {tailoredResult.tailoredSummary}
                </div>
              </div>

              {/* Match Strengths & Keywords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/70 space-y-1.5">
                  <span className="font-bold text-emerald-950 text-xs block">Key Match Strengths</span>
                  <ul className="space-y-1 text-[11px] text-emerald-900">
                    {tailoredResult.matchStrengths.map((str, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/70 space-y-1.5">
                  <span className="font-bold text-amber-950 text-xs block">Gaps to Address in Pitch</span>
                  <ul className="space-y-1 text-[11px] text-amber-900">
                    {tailoredResult.matchGaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Tailored Experience Bullets */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-neutral-900 uppercase tracking-wider block">
                    Tailored Work Experience Bullets (Optimized for {tailoredResult.company})
                  </span>
                  <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    Google XYZ Formula Optimized
                  </span>
                </div>

                {tailoredResult.tailoredExperience.map((exp) => (
                  <div key={exp.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs text-neutral-950 font-bold">{exp.role}</strong>
                      <span className="text-neutral-600 font-medium text-xs">{exp.company}</span>
                    </div>
                    <ul className="space-y-2 text-xs text-neutral-700">
                      {exp.bullets.map((b, i) => (
                        <li
                          key={i}
                          className="flex items-start justify-between gap-3 p-2 bg-white rounded-lg border border-neutral-200/80 hover:border-blue-300 transition group"
                        >
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="text-blue-500 font-bold text-xs mt-0.5">•</span>
                            <span className="leading-relaxed text-xs text-neutral-800">{b}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setOptimizingBullet({
                                bulletText: b,
                                role: exp.role,
                                company: exp.company,
                                expId: exp.id,
                                bulletIndex: i,
                              })
                            }
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-bold shrink-0 opacity-80 group-hover:opacity-100 transition flex items-center gap-1 cursor-pointer"
                            title="Analyze and strengthen with Google XYZ Formula"
                          >
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            <span>Strengthen</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Custom Cover Letter */}
          {activeSubTab === 'coverletter' && (
            <div className="bg-white p-6 rounded-b-xl border border-neutral-200 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
                  Tailored Cover Letter & Outreach Pitch
                </span>
                <button
                  onClick={() => handleCopyText(tailoredResult.tailoredCoverLetter, 'cover')}
                  className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSection === 'cover' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Cover Letter</span>
                </button>
              </div>

              <textarea
                rows={12}
                value={tailoredResult.tailoredCoverLetter}
                onChange={(e) => {
                  const updated = { ...tailoredResult, tailoredCoverLetter: e.target.value };
                  setTailoredResult(updated);
                  onUpdateApplication({ ...application, tailoredCv: updated });
                }}
                className="w-full p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-sans leading-relaxed outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          )}

          {/* Tab 3: Strategic Interview Angles */}
          {activeSubTab === 'advice' && (
            <div className="bg-white p-6 rounded-b-xl border border-neutral-200 space-y-4 shadow-2xs">
              <span className="font-bold text-xs text-neutral-900 uppercase tracking-wider block">
                Application & Interview Playbook
              </span>

              <div className="space-y-3">
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                  <strong className="text-xs text-blue-950 block">Tailoring Recommendations:</strong>
                  <ul className="space-y-1.5 text-xs text-neutral-700">
                    {tailoredResult.tailoringAdvice.map((adv, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                  <strong className="text-xs text-purple-950 block">Key Talking Points for First Call:</strong>
                  <ul className="space-y-1.5 text-xs text-neutral-700">
                    {tailoredResult.interviewAngles.map((angle, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>{angle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: ATS Markdown */}
          {activeSubTab === 'raw' && (
            <div className="bg-white p-6 rounded-b-xl border border-neutral-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-neutral-900 uppercase tracking-wider">
                  ATS-Friendly Markdown CV
                </span>
                <button
                  onClick={() => handleCopyText(tailoredResult.fullTailoredMarkdown, 'markdown')}
                  className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSection === 'markdown' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Markdown</span>
                </button>
              </div>

              <textarea
                rows={14}
                value={tailoredResult.fullTailoredMarkdown}
                onChange={(e) => {
                  const updated = { ...tailoredResult, fullTailoredMarkdown: e.target.value };
                  setTailoredResult(updated);
                  onUpdateApplication({ ...application, tailoredCv: updated });
                }}
                className="w-full p-4 bg-neutral-900 text-neutral-100 rounded-xl font-mono text-[11px] leading-relaxed outline-none"
              />
            </div>
          )}
          {/* CV Export & Google Docs Modal */}
          {isExportOpen && selectedBaseCv && (
            <CVExportModal
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
              cvData={selectedBaseCv}
              tailoredData={tailoredResult}
              companyName={application.company}
              roleName={application.role}
            />
          )}

          {/* Real-Time Bullet Optimizer Modal */}
          {optimizingBullet && (
            <BulletOptimizerModal
              isOpen={!!optimizingBullet}
              onClose={() => setOptimizingBullet(null)}
              initialBullet={optimizingBullet.bulletText}
              role={optimizingBullet.role}
              company={optimizingBullet.company}
              targetJob={application.role}
              onApplyBullet={(newBullet) => {
                if (!tailoredResult) return;
                const updatedExperience = tailoredResult.tailoredExperience.map((exp) => {
                  if (exp.id === optimizingBullet.expId) {
                    const newBullets = [...exp.bullets];
                    newBullets[optimizingBullet.bulletIndex] = newBullet;
                    return { ...exp, bullets: newBullets };
                  }
                  return exp;
                });

                const updatedTailored: TailoredCVRecord = {
                  ...tailoredResult,
                  tailoredExperience: updatedExperience,
                };
                setTailoredResult(updatedTailored);
                onUpdateApplication({
                  ...application,
                  tailoredCv: updatedTailored,
                });
                setOptimizingBullet(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
