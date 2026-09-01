import { apiUrl } from '../lib/api';
import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Briefcase,
  Building,
  DollarSign,
  MapPin,
  Tag,
  Link as LinkIcon,
  Sparkles,
  Globe,
  Check,
  AlertCircle,
  FileText
} from 'lucide-react';
import { ApplicationStatus, BaseCV, JobApplication, JobSource, PriorityLevel, WorkType } from '../types';
import { getStatusStyle } from '../utils/notionStyles';
import {
  SUPPORTED_CURRENCIES,
  CurrencyOption,
  detectUserCurrency,
  inferCurrencyFromLocation,
  getCurrencyPresets
} from '../utils/currency';

interface NewApplicationModalProps {
  isOpen: boolean;
  baseCvs?: BaseCV[];
  onClose: () => void;
  onAdd: (app: JobApplication) => void;
}

export const NewApplicationModal: React.FC<NewApplicationModalProps> = ({
  isOpen,
  baseCvs = [],
  onClose,
  onAdd,
}) => {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  
  // Currency & Salary state
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption>(SUPPORTED_CURRENCIES[0]);
  const [salary, setSalary] = useState('');
  const [currencyNotice, setCurrencyNotice] = useState<string | null>(null);

  const [location, setLocation] = useState('Remote');
  const [workType, setWorkType] = useState<WorkType>('Remote');
  const [source, setSource] = useState<JobSource>('Indeed');
  const [dateApplied, setDateApplied] = useState(new Date().toISOString().split('T')[0]);
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedBaseCvId, setSelectedBaseCvId] = useState<string>(baseCvs[0]?.id || '');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('High');
  const [notes, setNotes] = useState('');

  // AI Auto-Fill & Analyze state
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  // Auto-detect browser/locale currency on initial open
  useEffect(() => {
    if (isOpen) {
      const detected = detectUserCurrency();
      setSelectedCurrency(detected);
      if (baseCvs.length > 0 && !selectedBaseCvId) {
        const def = baseCvs.find((c) => c.isDefault) || baseCvs[0];
        setSelectedBaseCvId(def.id);
      }
    }
  }, [isOpen, baseCvs]);

  const handleAiAutoFill = async () => {
    if (!jobUrl.trim() && !jobDescription.trim() && !company.trim()) {
      setAiError('Please enter a Job URL or paste the Job Description first.');
      return;
    }

    setIsAiAnalyzing(true);
    setAiError(null);
    setAiSuccessMsg(null);

    try {
      const res = await fetch(apiUrl('/api/analyze-job'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl,
          jobDescription,
          company,
          role,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.company && !company) setCompany(d.company);
        if (d.role && !role) setRole(d.role);
        if (d.location && location === 'Remote') setLocation(d.location);
        if (d.workType) setWorkType(d.workType);
        if (d.salaryEstimate && !salary) setSalary(d.salaryEstimate);
        if (d.extractedDescription && !jobDescription) setJobDescription(d.extractedDescription);

        const adviceNotes = d.tailoringAdvice && d.tailoringAdvice.length > 0
          ? `\n\n🎯 AI Advice: ${d.tailoringAdvice.slice(0, 2).join(' • ')}`
          : '';
        const keywordsNotes = d.atsKeywords && d.atsKeywords.length > 0
          ? `\n🏷️ Key ATS: ${d.atsKeywords.slice(0, 5).join(', ')}`
          : '';

        setNotes((prev) => (prev ? `${prev}${adviceNotes}${keywordsNotes}` : `${adviceNotes}${keywordsNotes}`.trim()));
        setAiSuccessMsg(`Auto-filled details for ${d.role || 'role'} at ${d.company || 'company'}!`);
        setTimeout(() => setAiSuccessMsg(null), 4000);
      } else {
        setAiError(json.error || 'Could not analyze job posting.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Network error during job analysis.');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Infer currency when user edits location
  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
    const inferred = inferCurrencyFromLocation(newLocation);
    if (inferred && inferred.code !== selectedCurrency.code) {
      setSelectedCurrency(inferred);
      setCurrencyNotice(`Auto-switched currency to ${inferred.code} (${inferred.symbol}) based on location.`);
      setTimeout(() => setCurrencyNotice(null), 3000);
    }
  };

  const handleAutoDetectCurrency = () => {
    const locInferred = inferCurrencyFromLocation(location);
    const detected = locInferred || detectUserCurrency();
    setSelectedCurrency(detected);
    setCurrencyNotice(`Detected currency: ${detected.code} (${detected.symbol}) - ${detected.name}`);
    setTimeout(() => setCurrencyNotice(null), 3000);
  };

  const handleCurrencyChange = (code: string) => {
    const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
    if (found) {
      setSelectedCurrency(found);
    }
  };

  const handleApplySalaryPreset = (preset: string) => {
    setSalary(preset);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    // If salary was typed as just a raw number without symbol, auto-prefix with selected currency symbol
    let formattedSalary = salary.trim();
    if (formattedSalary && /^\d+(\s*-\s*\d+)?(\s*[kKmM])?(\s*\/[a-zA-Z]+)?$/.test(formattedSalary)) {
      formattedSalary = `${selectedCurrency.symbol}${formattedSalary}`;
    }

    const chosenCv = baseCvs.find((c) => c.id === selectedBaseCvId);

    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      company: company.trim(),
      role: role.trim(),
      status,
      salary: formattedSalary || undefined,
      location: location.trim() || 'Remote',
      workType,
      source,
      dateApplied,
      jobUrl: jobUrl.trim() || undefined,
      jobDescription: jobDescription.trim() || undefined,
      appliedCvId: chosenCv?.id,
      appliedCvTitle: chosenCv?.title,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      priority,
      notes: notes.trim(),
      linkedEmails: [],
      interviewRounds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAdd(newApp);
    onClose();

    // Reset fields
    setCompany('');
    setRole('');
    setSalary('');
    setJobUrl('');
    setJobDescription('');
    setContactName('');
    setContactEmail('');
    setNotes('');
  };

  const currencyPresets = getCurrencyPresets(selectedCurrency);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-[#FAF9F7] shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xl">💼</span>
            <div>
              <span className="font-bold text-sm text-neutral-900 block">New Job Application</span>
              <span className="text-[11px] text-neutral-500">Track, import job links, and tailor your CV</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* AI Import / Auto-Fill Box */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>AI Job Link & Description Importer</span>
              </span>
              <button
                type="button"
                disabled={isAiAnalyzing || (!jobUrl.trim() && !jobDescription.trim())}
                onClick={handleAiAutoFill}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-[11px] shadow-2xs transition flex items-center gap-1 cursor-pointer"
              >
                {isAiAnalyzing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Fill Form</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="url"
                placeholder="Paste Job Post URL (Indeed, LinkedIn, careers)..."
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="w-full p-2 rounded-lg bg-white border border-blue-200 text-xs outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Or paste snippet of Job Description..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full p-2 rounded-lg bg-white border border-blue-200 text-xs outline-none focus:border-blue-500"
              />
            </div>

            {aiSuccessMsg && (
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{aiSuccessMsg}</span>
              </div>
            )}
            {aiError && (
              <div className="text-[11px] text-red-700 flex items-center gap-1 bg-red-50 p-1.5 rounded border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}
          </div>

          {/* Quick preset templates */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-neutral-100 text-[11px] text-neutral-500">
            <span>Template:</span>
            <button
              type="button"
              onClick={() => {
                setSource('Indeed');
                setStatus('Applied');
                setLocation('Remote');
              }}
              className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition cursor-pointer"
            >
              Indeed Application
            </button>
            <button
              type="button"
              onClick={() => {
                setSource('LinkedIn');
                setStatus('Wishlist');
                setPriority('High');
              }}
              className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-medium hover:bg-neutral-200 transition cursor-pointer"
            >
              Wishlist Job
            </button>
            <button
              type="button"
              onClick={() => {
                setSource('Company Site');
                setStatus('Applied');
                setPriority('High');
              }}
              className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium hover:bg-purple-100 transition cursor-pointer"
            >
              Direct Referral
            </button>
          </div>

          {/* Company & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Company *</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Stripe, Linear, Google"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Role / Position *</label>
              <input
                type="text"
                required
                placeholder="e.g. Product Manager, Designer, Operations Lead, Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none text-xs"
              />
            </div>
          </div>

          {/* Base CV selector */}
          {baseCvs.length > 0 && (
            <div>
              <label className="font-semibold text-neutral-700 block mb-1 flex items-center justify-between">
                <span>Base CV Profile to Associate</span>
                <span className="text-[10px] text-neutral-400 font-normal">Can be tailored anytime</span>
              </label>
              <select
                value={selectedBaseCvId}
                onChange={(e) => setSelectedBaseCvId(e.target.value)}
                className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white outline-none text-xs font-semibold cursor-pointer"
              >
                {baseCvs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.targetRole}) {c.isDefault ? '— Default' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status, Source, Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white outline-none text-xs cursor-pointer font-medium"
              >
                <option value="Wishlist">Wishlist</option>
                <option value="Applied">Applied</option>
                <option value="Screening">Screening</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as JobSource)}
                className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white outline-none text-xs cursor-pointer"
              >
                <option value="Indeed">Indeed</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Glassdoor">Glassdoor</option>
                <option value="Company Site">Company Site</option>
                <option value="Referral">Referral</option>
                <option value="Direct">Direct</option>
                <option value="Email">Email</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white outline-none text-xs cursor-pointer"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Location & Work Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1 flex items-center justify-between">
                <span>Location</span>
                <span className="text-[10px] text-neutral-400 font-normal">Auto-infers currency</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Remote, London UK, San Francisco CA"
                value={location}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-blue-500 outline-none text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Work Type</label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value as WorkType)}
                className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white outline-none text-xs cursor-pointer"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">Onsite</option>
              </select>
            </div>
          </div>

          {/* Currency Selection & Salary Section */}
          <div className="bg-neutral-50/80 border border-neutral-200 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-neutral-800 text-xs flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Currency & Salary Compensation</span>
              </label>
              <button
                type="button"
                onClick={handleAutoDetectCurrency}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-neutral-200 shadow-2xs transition cursor-pointer"
                title="Auto-detect currency from locale or location"
              >
                <Sparkles className="w-3 h-3 text-blue-500" />
                <span>Auto-Detect Currency</span>
              </button>
            </div>

            {currencyNotice && (
              <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{currencyNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Currency Selector */}
              <div>
                <label className="text-[11px] font-medium text-neutral-600 block mb-1">Currency</label>
                <select
                  value={selectedCurrency.code}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full p-2 rounded-md bg-white border border-neutral-200 focus:border-blue-500 outline-none text-xs font-semibold cursor-pointer text-neutral-800"
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} ({curr.symbol}) - {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Salary Amount Input */}
              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-neutral-600 block mb-1">Salary Range / Amount</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs font-bold text-neutral-500">
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    type="text"
                    placeholder={`e.g. 130,000 - 160,000 /yr`}
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 rounded-md bg-white border border-neutral-200 focus:border-blue-500 outline-none text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Quick Currency Range Presets */}
            <div className="pt-1">
              <span className="text-[10px] text-neutral-500 block mb-1 font-medium">Quick {selectedCurrency.code} Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {currencyPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySalaryPreset(preset)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-neutral-200/70 text-neutral-700 border border-neutral-200 text-[11px] font-medium transition cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date Applied */}
          <div>
            <label className="font-semibold text-neutral-700 block mb-1">Date Applied</label>
            <input
              type="date"
              value={dateApplied}
              onChange={(e) => setDateApplied(e.target.value)}
              className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white outline-none text-xs cursor-pointer"
            />
          </div>

          {/* Recruiter / Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Recruiter / Contact Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white outline-none text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Recruiter Email (Optional)</label>
              <input
                type="email"
                placeholder="recruiter@company.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white outline-none text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-neutral-700 block mb-1">Job Post URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white outline-none text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-neutral-700 block mb-1">Initial Notes</label>
            <textarea
              rows={2}
              placeholder="Any details on tech stack, referral contact, or why you applied..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 rounded-md bg-neutral-50 border border-neutral-200 focus:bg-white outline-none text-xs"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 font-medium transition cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs transition cursor-pointer text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Application</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
