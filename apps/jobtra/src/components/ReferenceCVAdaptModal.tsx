import React, { useState } from 'react';
import { BaseCV, CVTemplateId, CVTemplateInfo } from '../types';
import { CV_TEMPLATES, getTemplateById } from '../data/cvTemplates';
import { parseWordDocumentFile } from '../utils/wordParser';
import {
  Sparkles,
  X,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ArrowRight,
  Sliders,
  Check,
} from 'lucide-react';

interface ReferenceCVAdaptModalProps {
  baseCvs: BaseCV[];
  initialSelectedCvId?: string;
  onClose: () => void;
  onSaveAdaptedCV: (adaptedCv: BaseCV) => void;
}

export const ReferenceCVAdaptModal: React.FC<ReferenceCVAdaptModalProps> = ({
  baseCvs,
  initialSelectedCvId,
  onClose,
  onSaveAdaptedCV,
}) => {
  const [selectedBaseCvId, setSelectedBaseCvId] = useState<string>(
    initialSelectedCvId || baseCvs[0]?.id || ''
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<CVTemplateId>('modern-executive');
  const [referenceText, setReferenceText] = useState('');
  const [referenceName, setReferenceName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAdapting, setIsAdapting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adaptedResult, setAdaptedResult] = useState<BaseCV | null>(null);

  const selectedBaseCv = baseCvs.find((c) => c.id === selectedBaseCvId) || baseCvs[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const parsed = await parseWordDocumentFile(file);
      setReferenceText(parsed.text);
      setReferenceName(file.name.replace(/\.[^/.]+$/, ''));
    } catch (err: any) {
      setError(err.message || 'Failed to read Word document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunAdaptation = async () => {
    if (!selectedBaseCv || !referenceText.trim()) {
      setError('Please select a Base CV and upload or paste reference CV content.');
      return;
    }

    setIsAdapting(true);
    setError(null);

    try {
      const res = await fetch('/api/adapt-reference-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseCv: selectedBaseCv,
          referenceText,
          referenceName: referenceName || 'Target Reference CV',
          templateId: selectedTemplateId,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAdaptedResult(json.data);
      } else {
        setError(json.error || 'Failed to adapt CV to reference style.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error during adaptation.');
    } finally {
      setIsAdapting(false);
    }
  };

  const handleSaveAndApply = () => {
    if (adaptedResult) {
      onSaveAdaptedCV(adaptedResult);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                <span>Adapt Base CV to Reference Resume</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                  AI Style Transfer
                </span>
              </h3>
              <p className="text-[11px] text-neutral-500">
                Upload a standout candidate resume or executive format to adapt your experience, tone, and bullet syntax.
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!adaptedResult ? (
            <>
              {/* Step 1: Base CV Selection */}
              <div className="space-y-2">
                <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">
                    1
                  </span>
                  <span>Select Source Base CV to Transform</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {baseCvs.map((cv) => (
                    <button
                      key={cv.id}
                      type="button"
                      onClick={() => setSelectedBaseCvId(cv.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                        selectedBaseCvId === cv.id
                          ? 'border-purple-600 bg-purple-50/40 ring-1 ring-purple-400'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <FileText
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          selectedBaseCvId === cv.id ? 'text-purple-600' : 'text-neutral-400'
                        }`}
                      />
                      <div className="overflow-hidden">
                        <div className="font-bold text-neutral-900 text-xs truncate">{cv.title}</div>
                        <div className="text-[11px] text-neutral-500 truncate">{cv.targetRole}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Reference Document Upload or Paste */}
              <div className="space-y-2">
                <label className="font-bold text-neutral-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">
                      2
                    </span>
                    <span>Upload Target Reference CV (.docx or text)</span>
                  </span>
                  <label className="text-purple-700 hover:text-purple-900 font-semibold cursor-pointer flex items-center gap-1 text-[11px]">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Word (.docx)</span>
                    <input
                      type="file"
                      accept=".docx,.doc,.txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </label>

                {referenceName && (
                  <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-[11px] text-purple-900">
                    <span className="font-medium truncate">📄 Loaded: {referenceName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setReferenceName('');
                        setReferenceText('');
                      }}
                      className="text-purple-500 hover:text-purple-800"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <textarea
                  rows={6}
                  value={referenceText}
                  onChange={(e) => setReferenceText(e.target.value)}
                  placeholder="Paste the reference CV / resume text here, or upload a Word document above..."
                  className="w-full p-3 rounded-xl border border-neutral-200 focus:border-purple-500 outline-none text-[11px] leading-relaxed font-mono"
                />
              </div>

              {/* Step 3: Choose Visual CV Template */}
              <div className="space-y-2">
                <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">
                    3
                  </span>
                  <span>Select CV Visual Layout Template</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {CV_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        selectedTemplateId === tmpl.id
                          ? 'border-purple-600 bg-purple-50/40 ring-1 ring-purple-400'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-neutral-900">{tmpl.name}</span>
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tmpl.accentColor }}
                          />
                        </div>
                        <p className="text-[10px] text-neutral-500 line-clamp-2 leading-tight">
                          {tmpl.description}
                        </p>
                      </div>
                      <span className="mt-2 text-[9px] font-semibold text-purple-700 uppercase tracking-wide">
                        {tmpl.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Adapted Result Preview */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-purple-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Reference Adaptation Complete</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-900 text-[10px] font-bold">
                    Template: {getTemplateById(adaptedResult.templateId).name}
                  </span>
                </div>

                {adaptedResult.referenceAnalysis && (
                  <div className="space-y-1 text-xs text-neutral-700 pt-1">
                    <p className="font-medium text-purple-900">
                      <strong>Tone detected:</strong> {adaptedResult.referenceAnalysis.detectedTone}
                    </p>
                    <p className="text-neutral-600 leading-snug">
                      {adaptedResult.referenceAnalysis.adaptationSummary}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {adaptedResult.referenceAnalysis.keyFormattingTraits?.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-white text-purple-800 rounded border border-purple-200 text-[10px] font-semibold"
                        >
                          ✓ {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview of adapted summary & experience */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-white space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Adapted Executive Summary
                  </span>
                  <p className="text-xs text-neutral-800 leading-relaxed font-normal mt-0.5">
                    {adaptedResult.summary}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    Adapted Experience Bullets ({adaptedResult.experience.length} roles)
                  </span>
                  <div className="space-y-2">
                    {adaptedResult.experience.slice(0, 2).map((exp) => (
                      <div key={exp.id} className="p-2.5 bg-neutral-50 rounded-lg text-xs space-y-1">
                        <div className="font-semibold text-neutral-900">
                          {exp.role} — {exp.company}
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-neutral-700 text-[11px]">
                          {exp.bullets.slice(0, 3).map((b, bIdx) => (
                            <li key={bIdx}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

          {!adaptedResult ? (
            <button
              disabled={isAdapting || isUploading || !referenceText.trim()}
              onClick={handleRunAdaptation}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              {isAdapting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing & Adapting CV...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Adapt to Reference Style</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdaptedResult(null)}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-semibold hover:bg-neutral-100 cursor-pointer"
              >
                Re-configure
              </button>
              <button
                type="button"
                onClick={handleSaveAndApply}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save to CV Vault</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
