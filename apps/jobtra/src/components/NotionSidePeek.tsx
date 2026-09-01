import { apiUrl } from '../lib/api';
import React, { useState } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  Calendar,
  DollarSign,
  MapPin,
  Mail,
  Sparkles,
  CheckCircle2,
  Clock,
  Trash2,
  Plus,
  ChevronDown,
  Building,
  User,
  Users,
  Tag,
  Link as LinkIcon,
  BookOpen,
  FileText,
  MessageSquare,
  Award,
  RefreshCw,
  Search,
  Copy,
  Check,
  Send,
  Globe,
  Share2,
  AlertCircle,
  Phone,
  Briefcase
} from 'lucide-react';
import { ApplicationStatus, BaseCV, DiscoveredContact, InterviewRound, JobApplication, JobSource, OnlineRecruiterSearchResult, PriorityLevel, WorkType } from '../types';
import { getStatusStyle, getSourceStyle, getPriorityStyle, formatDate, formatDateTime, triggerOfferConfetti } from '../utils/notionStyles';
import { SUPPORTED_CURRENCIES, detectUserCurrency, getCurrencyPresets } from '../utils/currency';
import { CVTailoringPanel } from './CVTailoringPanel';

interface NotionSidePeekProps {
  application: JobApplication;
  baseCvs?: BaseCV[];
  onClose: () => void;
  onUpdate: (updated: JobApplication) => void;
  onDelete: (id: string) => void;
}

const STATUS_LIST: ApplicationStatus[] = [
  'Wishlist',
  'Applied',
  'Screening',
  'Interviewing',
  'Offer',
  'Rejected',
  'Withdrawn',
];

const SOURCE_LIST: JobSource[] = [
  'Indeed',
  'LinkedIn',
  'Glassdoor',
  'Company Site',
  'Referral',
  'Recruiter',
  'Direct',
  'Email',
  'Other',
];

export const NotionSidePeek: React.FC<NotionSidePeekProps> = ({
  application,
  baseCvs = [],
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [isFullPage, setIsFullPage] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'cv-tailor' | 'contacts' | 'interviews' | 'emails' | 'ai-prep'>('notes');

  // Recruiter Online Finder state
  const [isSearchingRecruiter, setIsSearchingRecruiter] = useState(false);
  const [recruiterSearchResult, setRecruiterSearchResult] = useState<OnlineRecruiterSearchResult | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // AI Prep generator state
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false);
  const [prepData, setPrepData] = useState<any | null>(null);

  // New interview round state
  const [newRoundName, setNewRoundName] = useState('');
  const [newRoundInterviewer, setNewRoundInterviewer] = useState('');
  const [newRoundDate, setNewRoundDate] = useState('');

  // Additional contact state
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRole, setNewContactRole] = useState('');

  // Delete confirmation state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const statusStyle = getStatusStyle(application.status);
  const sourceStyle = getSourceStyle(application.source);

  const handleFieldChange = (field: keyof JobApplication, value: any) => {
    const updated = {
      ...application,
      [field]: value,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updated);

    if (field === 'status' && value === 'Offer') {
      triggerOfferConfetti();
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleSearchRecruiterOnline = async () => {
    setIsSearchingRecruiter(true);
    try {
      const res = await fetch(apiUrl('/api/find-recruiter-contacts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: application.company,
          role: application.role,
          location: application.location,
          jobUrl: application.jobUrl,
          notes: application.notes,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setRecruiterSearchResult(data.data);
      }
    } catch (err) {
      console.error('Failed to search recruiter contacts online:', err);
    } finally {
      setIsSearchingRecruiter(false);
    }
  };

  const handleApplyDiscoveredContact = (contact: DiscoveredContact) => {
    const updated = {
      ...application,
      contactName: contact.name || application.contactName,
      contactEmail: contact.email || application.contactEmail,
      contactRole: contact.role || application.contactRole,
      contactLinkedin: contact.linkedinUrl || application.contactLinkedin,
      companyWebsite: recruiterSearchResult?.domain ? `https://${recruiterSearchResult.domain}` : application.companyWebsite,
      companyCareersUrl: recruiterSearchResult?.careersUrl || application.companyCareersUrl,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updated);
    setCopyFeedback('Contact applied to application!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleSetSuggestedEmail = (email: string) => {
    handleFieldChange('contactEmail', email);
    setCopyFeedback('Email updated!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleAddInterviewRound = () => {
    if (!newRoundName.trim()) return;
    const newRound: InterviewRound = {
      id: `round-${Date.now()}`,
      roundName: newRoundName.trim(),
      interviewer: newRoundInterviewer.trim() || undefined,
      date: newRoundDate || undefined,
      status: 'scheduled',
    };
    const updatedRounds = [...(application.interviewRounds || []), newRound];
    handleFieldChange('interviewRounds', updatedRounds);
    setNewRoundName('');
    setNewRoundInterviewer('');
    setNewRoundDate('');
  };

  const handleToggleRoundStatus = (roundId: string, currentStatus: string) => {
    const updatedRounds = (application.interviewRounds || []).map((r) => {
      if (r.id === roundId) {
        return {
          ...r,
          status: currentStatus === 'passed' ? 'scheduled' : ('passed' as any),
        };
      }
      return r;
    });
    handleFieldChange('interviewRounds', updatedRounds);
  };

  const handleGenerateAIPrep = async () => {
    setIsGeneratingPrep(true);
    try {
      const res = await fetch(apiUrl('/api/generate-prep'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: application.company,
          role: application.role,
          description: application.jobDescription,
          notes: application.notes,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPrepData(data.data);
      }
    } catch (err) {
      console.error('Failed to generate AI interview prep:', err);
    } finally {
      setIsGeneratingPrep(false);
    }
  };

  const hasContact = Boolean(application.contactName || application.contactEmail);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white h-full shadow-2xl border-l border-neutral-200 flex flex-col transition-all duration-200 overflow-hidden ${
          isFullPage ? 'w-full max-w-5xl mx-auto rounded-none' : 'w-full md:w-[700px] lg:w-[800px]'
        }`}
      >
        {/* Top Header Controls (Notion Style) */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-200/80 bg-white sticky top-0 z-20 text-neutral-500 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-neutral-400">Notion Page</span>
            <span className="text-neutral-300">/</span>
            <span className="font-semibold text-neutral-800 truncate max-w-[200px]">
              {application.company}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Full page expand */}
            <button
              onClick={() => setIsFullPage(!isFullPage)}
              className="p-1.5 rounded hover:bg-neutral-100 transition cursor-pointer text-neutral-600"
              title={isFullPage ? 'Side peek view' : 'Center page view'}
            >
              {isFullPage ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Delete button with in-UI confirmation */}
            {isConfirmingDelete ? (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg text-xs animate-in fade-in">
                <span className="text-rose-700 font-semibold text-[11px]">Delete?</span>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(application.id);
                    onClose();
                  }}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold shadow-2xs transition cursor-pointer"
                >
                  Yes, Delete
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-1.5 py-0.5 text-neutral-500 hover:text-neutral-700 text-[11px] transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="p-1.5 rounded hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition cursor-pointer"
                title="Delete application"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-neutral-100 transition cursor-pointer text-neutral-600"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Notion Page Icon & Title */}
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 text-2xl flex items-center justify-center font-bold text-neutral-800">
              {application.company ? application.company.charAt(0) : '💼'}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <input
                type="text"
                value={application.company}
                onChange={(e) => handleFieldChange('company', e.target.value)}
                placeholder="Company Name"
                className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight bg-transparent border-none outline-none focus:ring-0 placeholder-neutral-300"
              />
              <input
                type="text"
                value={application.role}
                onChange={(e) => handleFieldChange('role', e.target.value)}
                placeholder="Role / Title"
                className="text-base sm:text-lg font-semibold text-neutral-600 bg-transparent border-none outline-none focus:ring-0 placeholder-neutral-300"
              />
            </div>
          </div>

          {/* Properties Grid (Notion database fields layout) */}
          <div className="border-y border-neutral-200/80 py-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
            {/* Status Property */}
            <div className="flex items-center gap-3">
              <div className="w-28 text-neutral-400 font-medium flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Status</span>
              </div>
              <div className="flex-1">
                <select
                  value={application.status}
                  onChange={(e) => handleFieldChange('status', e.target.value as ApplicationStatus)}
                  className={`px-2 py-1 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} outline-none cursor-pointer`}
                >
                  {STATUS_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Salary Property */}
            <div className="flex items-center gap-3">
              <div className="w-28 text-neutral-400 font-medium flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Compensation</span>
              </div>
              <div className="flex-1 flex items-center gap-1.5">
                <input
                  type="text"
                  value={application.salary || ''}
                  onChange={(e) => handleFieldChange('salary', e.target.value)}
                  placeholder="e.g. $160k - $185k + Equity"
                  className="flex-1 text-xs text-neutral-800 p-1 rounded hover:bg-neutral-50 focus:bg-neutral-100 border border-transparent focus:border-neutral-200 outline-none"
                />
                <select
                  onChange={(e) => {
                    const found = SUPPORTED_CURRENCIES.find((c) => c.code === e.target.value);
                    if (found) {
                      const presets = getCurrencyPresets(found);
                      handleFieldChange('salary', presets[1]);
                    }
                  }}
                  defaultValue=""
                  className="text-[10px] bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-600 outline-none cursor-pointer"
                  title="Switch Currency & Apply Range"
                >
                  <option value="" disabled>Currency</option>
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} ({curr.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-3">
              <div className="w-28 text-neutral-400 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Location</span>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={application.location}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  placeholder="e.g. Remote / San Francisco, CA"
                  className="w-full text-xs text-neutral-800 p-1 rounded hover:bg-neutral-50 focus:bg-neutral-100 border border-transparent focus:border-neutral-200 outline-none"
                />
              </div>
            </div>

            {/* Work Type */}
            <div className="flex items-center gap-3">
              <div className="w-28 text-neutral-400 font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>Work Type</span>
              </div>
              <div className="flex-1">
                <select
                  value={application.workType}
                  onChange={(e) => handleFieldChange('workType', e.target.value as WorkType)}
                  className="p-1 rounded text-xs bg-neutral-50 border border-neutral-200 outline-none cursor-pointer"
                >
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>
            </div>

            {/* Source */}
            <div className="flex items-center gap-3">
              <div className="w-28 text-neutral-400 font-medium flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Source</span>
              </div>
              <div className="flex-1">
                <select
                  value={application.source}
                  onChange={(e) => handleFieldChange('source', e.target.value as JobSource)}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${sourceStyle.bg} ${sourceStyle.text} border border-neutral-200 outline-none cursor-pointer`}
                >
                  {SOURCE_LIST.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Applied */}
            <div className="flex items-center gap-3">
              <div className="w-28 text-neutral-400 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date Applied</span>
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  value={application.dateApplied}
                  onChange={(e) => handleFieldChange('dateApplied', e.target.value)}
                  className="text-xs text-neutral-800 p-1 rounded hover:bg-neutral-50 border border-transparent focus:border-neutral-200 outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Next Interview / Step */}
            <div className="flex items-center gap-3 sm:col-span-2">
              <div className="w-28 text-neutral-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>Next Step</span>
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={application.nextStepTitle || ''}
                  onChange={(e) => handleFieldChange('nextStepTitle', e.target.value)}
                  placeholder="e.g. System Design Interview with VP of Engineering"
                  className="flex-1 text-xs text-neutral-800 p-1 rounded bg-purple-50/50 border border-purple-200/60 focus:bg-white outline-none font-medium"
                />
                <input
                  type="datetime-local"
                  value={application.nextStepDate || ''}
                  onChange={(e) => handleFieldChange('nextStepDate', e.target.value)}
                  className="text-xs text-neutral-700 p-1 rounded bg-neutral-50 border border-neutral-200 outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Recruiter & Contact Property */}
            <div className="flex items-center gap-3 sm:col-span-2">
              <div className="w-28 text-neutral-400 font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Recruiter / Contact</span>
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={application.contactName || ''}
                  onChange={(e) => handleFieldChange('contactName', e.target.value)}
                  placeholder="Recruiter / Contact Name"
                  className="w-36 sm:w-44 text-xs text-neutral-800 p-1 rounded hover:bg-neutral-50 focus:bg-neutral-100 border border-transparent focus:border-neutral-200 outline-none font-medium"
                />
                <input
                  type="email"
                  value={application.contactEmail || ''}
                  onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                  placeholder="recruiter@company.com"
                  className="flex-1 min-w-[170px] text-xs text-neutral-800 p-1 rounded hover:bg-neutral-50 focus:bg-neutral-100 border border-transparent focus:border-neutral-200 outline-none"
                />
                {application.contactEmail ? (
                  <div className="flex items-center gap-1">
                    <a
                      href={`mailto:${application.contactEmail}`}
                      className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                      title="Send email"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Email</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyText(application.contactEmail!, 'Recruiter email copied!')}
                      className="p-1 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
                      title="Copy email"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('contacts');
                      if (!recruiterSearchResult) {
                        handleSearchRecruiterOnline();
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer border border-amber-200/60"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Find Online</span>
                  </button>
                )}
              </div>
            </div>

            {/* Job URL */}
            <div className="flex items-center gap-3 sm:col-span-2">
              <div className="w-28 text-neutral-400 font-medium flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Job Link</span>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="url"
                  value={application.jobUrl || ''}
                  onChange={(e) => handleFieldChange('jobUrl', e.target.value)}
                  placeholder="https://..."
                  className="flex-1 text-xs text-neutral-800 p-1 rounded hover:bg-neutral-50 focus:bg-neutral-100 border border-transparent focus:border-neutral-200 outline-none truncate"
                />
                {application.jobUrl && (
                  <a
                    href={application.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Section Navigation Tabs (Notion sub-blocks) */}
          <div className="flex items-center space-x-2 border-b border-neutral-200 pb-2 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer shrink-0 ${
                activeTab === 'notes'
                  ? 'bg-neutral-100 text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes & Description</span>
            </button>

            <button
              onClick={() => setActiveTab('cv-tailor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer shrink-0 ${
                activeTab === 'cv-tailor'
                  ? 'bg-blue-50 text-blue-900 shadow-2xs border border-blue-200'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>
                CV & Tailoring {application.tailoredCv ? `(${application.tailoredCv.matchScore}% Match)` : ''}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer shrink-0 ${
                activeTab === 'contacts'
                  ? 'bg-blue-50 text-blue-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Recruiter & Contacts {application.contactEmail ? '✓' : ''}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('interviews')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer shrink-0 ${
                activeTab === 'interviews'
                  ? 'bg-neutral-100 text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-purple-600" />
              <span>Interview Rounds ({application.interviewRounds?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('emails')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer shrink-0 ${
                activeTab === 'emails'
                  ? 'bg-blue-50 text-blue-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Synced Emails ({application.linkedEmails?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-prep')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer shrink-0 ${
                activeTab === 'ai-prep'
                  ? 'bg-amber-50 text-amber-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AI Prep Coach</span>
            </button>
          </div>

          {copyFeedback && (
            <div className="bg-emerald-50 text-emerald-800 text-xs px-3 py-2 rounded-md border border-emerald-200 flex items-center justify-between animate-in fade-in">
              <span className="font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                {copyFeedback}
              </span>
            </div>
          )}

          {/* TAB 1: Notes & Job Description */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* CV Tailoring Quick Card */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs text-blue-950">
                      {application.tailoredCv
                        ? `Tailored CV Active: ${application.tailoredCv.baseCvTitle} (${application.tailoredCv.matchScore}% Match)`
                        : 'No Tailored CV Attached Yet'}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    {application.tailoredCv
                      ? 'Custom cover letter, tailored impact bullets, and ATS keywords are ready.'
                      : 'Import job description and let AI tailor your base CV with optimal ATS keywords.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('cv-tailor')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{application.tailoredCv ? 'View Tailored CV' : 'Tailor CV with AI'}</span>
                </button>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                  📝 Application Notes & Preparation
                </label>
                <textarea
                  rows={6}
                  value={application.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Add interview talking points, salary negotiation targets, questions for hiring manager..."
                  className="w-full text-xs text-neutral-800 p-3 rounded-lg bg-neutral-50/70 border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                  📄 Job Description Summary
                </label>
                <textarea
                  rows={4}
                  value={application.jobDescription || ''}
                  onChange={(e) => handleFieldChange('jobDescription', e.target.value)}
                  placeholder="Paste snippet of the original job post or key requirements..."
                  className="w-full text-xs text-neutral-800 p-3 rounded-lg bg-neutral-50/70 border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Recruiter & Company Contacts */}
          {activeTab === 'contacts' && (
            <div className="space-y-5 text-xs">
              {/* Header with Search Online Button */}
              <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2 font-bold text-blue-950 text-sm">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Recruiter & Company Contacts</span>
                  </div>
                  <p className="text-blue-800/90 text-[11px] mt-0.5">
                    Automatically extracted from your email threads or searched online via Gemini AI & LinkedIn.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSearchRecruiterOnline}
                  disabled={isSearchingRecruiter}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0 disabled:opacity-50"
                >
                  {isSearchingRecruiter ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Searching Web & Company...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Search Online / Company Site</span>
                    </>
                  )}
                </button>
              </div>

              {/* Primary Contact Card */}
              <div className="bg-white rounded-xl border border-neutral-200/80 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                  <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Primary Recruiter / Hiring Lead</span>
                  </div>
                  {hasContact && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200/60">
                      Active Contact
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                      Recruiter / Contact Name
                    </label>
                    <input
                      type="text"
                      value={application.contactName || ''}
                      onChange={(e) => handleFieldChange('contactName', e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full text-xs text-neutral-800 p-2 rounded-lg bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                      Role / Title
                    </label>
                    <input
                      type="text"
                      value={application.contactRole || ''}
                      onChange={(e) => handleFieldChange('contactRole', e.target.value)}
                      placeholder="e.g. Lead Technical Recruiter"
                      className="w-full text-xs text-neutral-800 p-2 rounded-lg bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                      Email Address
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="email"
                        value={application.contactEmail || ''}
                        onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                        placeholder="s.jenkins@company.com"
                        className="flex-1 text-xs text-neutral-800 p-2 rounded-lg bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none"
                      />
                      {application.contactEmail && (
                        <a
                          href={`mailto:${application.contactEmail}`}
                          className="px-2.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center gap-1 transition"
                          title="Send email"
                        >
                          <Send className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                      LinkedIn Profile or Search
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        value={application.contactLinkedin || ''}
                        onChange={(e) => handleFieldChange('contactLinkedin', e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="flex-1 text-xs text-neutral-800 p-2 rounded-lg bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none"
                      />
                      {application.contactLinkedin ? (
                        <a
                          href={application.contactLinkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold flex items-center gap-1 transition"
                          title="Open LinkedIn"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <a
                          href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(application.company + ' recruiter ' + (application.contactName || ''))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium flex items-center gap-1 transition text-[10px]"
                          title="Search on LinkedIn"
                        >
                          <Search className="w-3 h-3" />
                          <span>Search</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick action bar */}
                {application.contactEmail && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 text-[11px]">
                    <a
                      href={`mailto:${application.contactEmail}?subject=${encodeURIComponent(`Following up on ${application.role} application`)}`}
                      className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Recruiter</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyText(application.contactEmail!, 'Recruiter email copied!')}
                      className="px-3 py-1.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Email</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Online Search Results Card */}
              {recruiterSearchResult && (
                <div className="bg-[#FAF9F7] rounded-xl border border-blue-200/90 p-4 space-y-4 shadow-2xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Online Discovery for {application.company}</span>
                    </div>
                    {recruiterSearchResult.domain && (
                      <span className="text-[11px] text-neutral-500 font-mono">
                        Domain: {recruiterSearchResult.domain}
                      </span>
                    )}
                  </div>

                  {/* Discovered Talent Inboxes */}
                  {recruiterSearchResult.suggestedEmails && recruiterSearchResult.suggestedEmails.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="font-semibold text-neutral-800 text-[11px] flex items-center gap-1">
                        <Mail className="w-3 h-3 text-blue-600" />
                        <span>Company Careers & Talent Inboxes:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recruiterSearchResult.suggestedEmails.map((email, idx) => (
                          <div
                            key={idx}
                            className="bg-white border border-neutral-200 rounded-md px-2.5 py-1.5 flex items-center gap-2 shadow-2xs"
                          >
                            <span className="font-mono text-neutral-800 text-[11px] font-medium">{email}</span>
                            <button
                              type="button"
                              onClick={() => handleSetSuggestedEmail(email)}
                              className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded transition cursor-pointer"
                            >
                              Set as Contact
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discovered Recruiters List */}
                  {recruiterSearchResult.discoveredContacts && recruiterSearchResult.discoveredContacts.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-semibold text-neutral-800 text-[11px] flex items-center gap-1">
                        <Users className="w-3 h-3 text-purple-600" />
                        <span>Identified Talent Acquisition Leads:</span>
                      </div>
                      <div className="space-y-2">
                        {recruiterSearchResult.discoveredContacts.map((contact, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-3 rounded-lg border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                          >
                            <div>
                              <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                                <span>{contact.name}</span>
                                {contact.confidence && (
                                  <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded font-normal">
                                    {contact.confidence}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-600">{contact.role}</div>
                              {contact.email && (
                                <div className="text-[11px] text-blue-600 font-mono mt-0.5">{contact.email}</div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {contact.linkedinUrl && (
                                <a
                                  href={contact.linkedinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 transition"
                                  title="LinkedIn"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleApplyDiscoveredContact(contact)}
                                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-[11px] font-semibold transition cursor-pointer"
                              >
                                Apply to Job
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct Online Shortcuts */}
                  <div className="bg-white p-3 rounded-lg border border-neutral-200 space-y-2">
                    <div className="font-semibold text-neutral-800 text-[11px]">Direct Web Search Shortcuts:</div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${application.company}" recruiter OR "talent acquisition" OR "technical recruiter"`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-medium flex items-center gap-1.5 transition"
                      >
                        <Search className="w-3 h-3 text-neutral-500" />
                        <span>Google Recruiter Search</span>
                      </a>

                      <a
                        href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${application.company} recruiter`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-medium flex items-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3 h-3 text-sky-600" />
                        <span>LinkedIn People Search</span>
                      </a>

                      {recruiterSearchResult.careersUrl && (
                        <a
                          href={recruiterSearchResult.careersUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-medium flex items-center gap-1.5 transition"
                        >
                          <Globe className="w-3 h-3 text-purple-600" />
                          <span>Official Careers Portal</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* AI Generated Outreach / Follow-Up Pitch */}
                  {recruiterSearchResult.outreachEmailSubject && (
                    <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-neutral-900 text-[11px] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>AI Outreach / Follow-Up Email Draft</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyText(`${recruiterSearchResult.outreachEmailSubject}\n\n${recruiterSearchResult.outreachEmailBody}`, 'Email draft copied!')}
                            className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-medium flex items-center gap-1 transition cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy Draft</span>
                          </button>
                          {application.contactEmail && (
                            <a
                              href={`mailto:${application.contactEmail}?subject=${encodeURIComponent(recruiterSearchResult.outreachEmailSubject)}&body=${encodeURIComponent(recruiterSearchResult.outreachEmailBody || '')}`}
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center gap-1 transition"
                            >
                              <Send className="w-3 h-3" />
                              <span>Open in Mail</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="bg-neutral-50 p-2.5 rounded border border-neutral-200 text-[11px] space-y-1.5 font-sans">
                        <div className="font-semibold text-neutral-800">
                          Subject: <span className="font-normal text-neutral-900">{recruiterSearchResult.outreachEmailSubject}</span>
                        </div>
                        <div className="whitespace-pre-wrap text-neutral-700 leading-relaxed text-[11px]">
                          {recruiterSearchResult.outreachEmailBody}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Interview Rounds Tracker */}
          {activeTab === 'interviews' && (
            <div className="space-y-4">
              <div className="space-y-2">
                {(application.interviewRounds || []).map((round) => {
                  const isPassed = round.status === 'passed';
                  return (
                    <div
                      key={round.id}
                      className="p-3 bg-[#FAF9F7] rounded-lg border border-neutral-200/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 flex-1">
                        <button
                          onClick={() => handleToggleRoundStatus(round.id, round.status)}
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition cursor-pointer ${
                            isPassed
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-neutral-300 hover:border-neutral-400 bg-white'
                          }`}
                        >
                          {isPassed && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <div>
                          <div className={`font-bold ${isPassed ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                            {round.roundName}
                          </div>
                          {round.interviewer && (
                            <div className="text-[11px] text-neutral-500">
                              Interviewer: {round.interviewer}
                            </div>
                          )}
                          {round.notes && (
                            <div className="text-[11px] text-neutral-600 mt-1 bg-white p-2 rounded border border-neutral-200/60">
                              {round.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {round.date && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-medium shrink-0">
                          {round.date}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add New Round Form */}
              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-2">
                <div className="text-xs font-bold text-neutral-800">Add Interview Stage</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Stage (e.g. System Design Round)"
                    value={newRoundName}
                    onChange={(e) => setNewRoundName(e.target.value)}
                    className="text-xs p-2 bg-white rounded border border-neutral-200 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Interviewer Name (e.g. Karri / VP Eng)"
                    value={newRoundInterviewer}
                    onChange={(e) => setNewRoundInterviewer(e.target.value)}
                    className="text-xs p-2 bg-white rounded border border-neutral-200 outline-none"
                  />
                </div>
                <button
                  onClick={handleAddInterviewRound}
                  disabled={!newRoundName.trim()}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  + Add Stage
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Synced Emails History */}
          {activeTab === 'emails' && (
            <div className="space-y-4">
              {application.linkedEmails && application.linkedEmails.length > 0 ? (
                <div className="space-y-3">
                  {application.linkedEmails.map((em) => (
                    <div
                      key={em.id}
                      className="bg-white rounded-lg border border-blue-200/80 p-4 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-neutral-900 text-sm">{em.subject}</div>
                          <div className="text-[11px] text-neutral-500">From: {em.sender}</div>
                        </div>
                        <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-mono">
                          {em.date}
                        </span>
                      </div>

                      {em.aiSummary && (
                        <div className="bg-blue-50/80 border border-blue-100 rounded p-2 text-[11px] text-blue-950">
                          <span className="font-bold">AI Takeaway: </span>
                          {em.aiSummary}
                        </div>
                      )}

                      {em.actionRequired && (
                        <div className="bg-purple-50 text-purple-900 border border-purple-100 rounded p-2 text-[11px]">
                          <span className="font-bold">Pending Action: </span>
                          {em.actionRequired}
                        </div>
                      )}

                      <div className="bg-neutral-50 p-2.5 rounded text-[11px] text-neutral-700 border border-neutral-200/60 leading-relaxed">
                        {em.snippet}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#FAF9F7] border border-dashed border-neutral-300 rounded-xl p-8 text-center text-neutral-500 text-xs">
                  <Mail className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                  <p className="font-semibold text-neutral-700">No emails linked yet</p>
                  <p className="mt-1">
                    Emails received from Indeed or Gmail regarding {application.company} will automatically link here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB: CV & Tailoring */}
          {activeTab === 'cv-tailor' && (
            <CVTailoringPanel
              application={application}
              baseCvs={baseCvs}
              onUpdateApplication={onUpdate}
            />
          )}

          {/* TAB 4: AI Prep Coach */}
          {activeTab === 'ai-prep' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-4 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Gemini AI Interview Preparation Pack</span>
                  </div>
                  <button
                    onClick={handleGenerateAIPrep}
                    disabled={isGeneratingPrep}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isGeneratingPrep ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <span>Generate Tailored Prep</span>
                    )}
                  </button>
                </div>
                <p className="text-amber-800 text-[11px]">
                  Generate role-specific behavioral questions, STAR responses, and company architecture talking points for {application.company}.
                </p>
              </div>

              {prepData && (
                <div className="space-y-4 text-xs">
                  {/* Company Profile */}
                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200">
                    <div className="font-bold text-neutral-900 mb-1">Company Culture & Focus</div>
                    <p className="text-neutral-700 leading-relaxed">{prepData.companyProfile}</p>
                  </div>

                  {/* Top Questions */}
                  <div className="space-y-2">
                    <div className="font-bold text-neutral-900">Predicted Interview Questions</div>
                    {prepData.topQuestions?.map((q: any, idx: number) => (
                      <div key={idx} className="bg-[#FAF9F7] p-3 rounded-lg border border-neutral-200/80 space-y-1.5">
                        <div className="font-bold text-neutral-900">Q{idx + 1}: {q.question}</div>
                        <div className="text-[11px] text-purple-900 bg-purple-50 p-2 rounded">
                          <span className="font-semibold">Coaching Tip: </span>{q.tips}
                        </div>
                        {q.sampleKeyPoints && (
                          <div className="text-[11px] text-neutral-600 pl-3">
                            <span className="font-medium text-neutral-700">Key talking points:</span>
                            <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                              {q.sampleKeyPoints.map((pt: string, pIdx: number) => (
                                <li key={pIdx}>{pt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Questions to Ask */}
                  {prepData.questionsToAskInterviewer && (
                    <div className="bg-white p-3.5 rounded-lg border border-neutral-200">
                      <div className="font-bold text-neutral-900 mb-2">Impressive Questions to Ask the Interviewer</div>
                      <ul className="space-y-1.5">
                        {prepData.questionsToAskInterviewer.map((qa: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-neutral-700">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{qa}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Danger Zone: Permanently Delete Application */}
          <div className="pt-8 mt-8 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/50 p-4 rounded-xl">
            <div>
              <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete This Application</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Permanently remove {application.company} from your tracker, board, and Firestore database.
              </p>
            </div>

            {isConfirmingDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(application.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Permanent Deletion</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Application</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
