import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Check,
  TrendingUp,
  Target,
  Award,
  ArrowRight,
  Copy,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import { BulletEvaluationResult } from '../types';

interface BulletOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBullet: string;
  roleTitle?: string;
  companyName?: string;
  onApplyImprovement: (improvedBullet: string) => void;
}

export const BulletOptimizerModal: React.FC<BulletOptimizerModalProps> = ({
  isOpen,
  onClose,
  initialBullet,
  roleTitle = 'Software Professional',
  companyName = '',
  onApplyImprovement,
}) => {
  const [bulletText, setBulletText] = useState(initialBullet);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<BulletEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariationKey, setSelectedVariationKey] = useState<'improved' | 'executive' | 'metricsHeavy' | 'concise'>('improved');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto evaluate when opened if initial bullet is present
  React.useEffect(() => {
    setBulletText(initialBullet);
    setEvaluationResult(null);
    setError(null);
    if (isOpen && initialBullet.trim()) {
      evaluateBullet(initialBullet);
    }
  }, [isOpen, initialBullet]);

  const evaluateBullet = async (textToEval: string) => {
    if (!textToEval.trim()) return;
    setIsEvaluating(true);
    setError(null);

    try {
      const res = await fetch('/api/evaluate-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullet: textToEval,
          role: roleTitle,
          company: companyName,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setEvaluationResult(json.data);
      } else {
        setError(json.error || 'Failed to evaluate bullet score.');
      }
    } catch (err: any) {
      setError(err.message || 'Error evaluating bullet.');
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!isOpen) return null;

  const getScoreBadge = (score: number) => {
    if (score >= 90) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        ring: 'text-emerald-600',
        label: 'Elite Google XYZ Standard',
      };
    }
    if (score >= 75) {
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        ring: 'text-blue-600',
        label: 'Impactful & Strong',
      };
    }
    if (score >= 55) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        ring: 'text-amber-600',
        label: 'Developing (Needs Metrics)',
      };
    }
    return {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      ring: 'text-rose-600',
      label: 'Passive / Task-Oriented',
    };
  };

  const getActiveReplacementText = () => {
    if (!evaluationResult) return bulletText;
    if (selectedVariationKey === 'improved') return evaluationResult.improvedVersion;
    if (selectedVariationKey === 'executive') return evaluationResult.variations.executive;
    if (selectedVariationKey === 'metricsHeavy') return evaluationResult.variations.metricsHeavy;
    if (selectedVariationKey === 'concise') return evaluationResult.variations.concise;
    return evaluationResult.improvedVersion;
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const badgeInfo = evaluationResult ? getScoreBadge(evaluationResult.score) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900">Google XYZ Bullet Coach & Optimizer</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  Formula Engine
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {roleTitle} {companyName ? `• ${companyName}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-neutral-700 flex-1">
          {/* Formula Reference Banner */}
          <div className="p-3 bg-neutral-900 text-neutral-100 rounded-xl space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                The Google XYZ Resume Formula
              </span>
              <span className="text-[10px] text-neutral-400">Recruiter Gold Standard</span>
            </div>
            <div className="text-xs font-mono bg-neutral-800/80 p-2 rounded-lg text-emerald-300 leading-relaxed border border-neutral-700">
              "Accomplished <span className="text-amber-300 font-bold">[X]</span>, as measured by <span className="text-sky-300 font-bold">[Y]</span>, by doing <span className="text-purple-300 font-bold">[Z]</span>"
            </div>
          </div>

          {/* Editable Bullet Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 flex items-center justify-between">
              <span>Original Bullet Statement</span>
              <span className="text-neutral-400 normal-case font-normal">Edit or test variations below</span>
            </label>
            <textarea
              rows={3}
              value={bulletText}
              onChange={(e) => setBulletText(e.target.value)}
              placeholder="e.g., Led backend migration to Kubernetes and improved deployment speed..."
              className="w-full text-xs p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed transition"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => evaluateBullet(bulletText)}
                disabled={isEvaluating || !bulletText.trim()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              >
                {isEvaluating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing Formula & Metrics...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Evaluate & Score Bullet
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Evaluation Score Card */}
          {evaluationResult && badgeInfo && (
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/70 space-y-3.5">
              {/* Score Header */}
              <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Formula Score</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-neutral-900">{evaluationResult.score}</span>
                    <span className="text-xs text-neutral-400">/ 100</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeInfo.bg}`}>
                      {evaluationResult.formulaTier}
                    </span>
                  </div>
                </div>

                {/* Formula Checks */}
                <div className="flex items-center gap-2 text-[11px]">
                  <div
                    className={`px-2 py-1 rounded-lg border flex items-center gap-1 font-medium ${
                      evaluationResult.hasActionVerb
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                    }`}
                  >
                    {evaluationResult.hasActionVerb ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3" />}
                    Action Verb
                  </div>
                  <div
                    className={`px-2 py-1 rounded-lg border flex items-center gap-1 font-medium ${
                      evaluationResult.hasMetrics
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    {evaluationResult.hasMetrics ? <Check className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3" />}
                    Quantified Metrics
                  </div>
                </div>
              </div>

              {/* Coaching Feedback */}
              <div className="text-xs text-neutral-700 bg-white p-3 rounded-lg border border-neutral-200/90 leading-relaxed">
                <strong className="text-neutral-900 font-semibold">Coach Feedback: </strong>
                {evaluationResult.feedback}
              </div>

              {/* XYZ Breakdown */}
              {evaluationResult.xyzFormulaBreakdown && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg">
                    <span className="font-bold text-amber-800 uppercase text-[10px] tracking-wider block mb-0.5">
                      X: Accomplished
                    </span>
                    <p className="text-neutral-800 leading-snug">{evaluationResult.xyzFormulaBreakdown.accomplishedX || 'Business goal'}</p>
                  </div>
                  <div className="p-2.5 bg-sky-50/70 border border-sky-200/80 rounded-lg">
                    <span className="font-bold text-sky-800 uppercase text-[10px] tracking-wider block mb-0.5">
                      Y: Measured By
                    </span>
                    <p className="text-neutral-800 leading-snug">{evaluationResult.xyzFormulaBreakdown.measuredByY || 'Key Metric'}</p>
                  </div>
                  <div className="p-2.5 bg-purple-50/70 border border-purple-200/80 rounded-lg">
                    <span className="font-bold text-purple-800 uppercase text-[10px] tracking-wider block mb-0.5">
                      Z: Method / Action
                    </span>
                    <p className="text-neutral-800 leading-snug">{evaluationResult.xyzFormulaBreakdown.byDoingZ || 'Technical strategy'}</p>
                  </div>
                </div>
              )}

              {/* AI Formula Variations */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Select Optimized Google XYZ Variation
                </div>

                {/* Primary Best Recommendation */}
                <div
                  onClick={() => setSelectedVariationKey('improved')}
                  className={`p-3 rounded-xl border cursor-pointer transition relative ${
                    selectedVariationKey === 'improved'
                      ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-600 text-white rounded-md">
                        Recommended Best
                      </span>
                      <span className="text-xs font-semibold text-neutral-800">Balanced Google XYZ</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(evaluationResult.improvedVersion, 'improved');
                      }}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition"
                      title="Copy"
                    >
                      {copiedKey === 'improved' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                    • {evaluationResult.improvedVersion}
                  </p>
                </div>

                {/* Executive High-Impact */}
                <div
                  onClick={() => setSelectedVariationKey('executive')}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedVariationKey === 'executive'
                      ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md border border-purple-200">
                      Executive & Strategic
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(evaluationResult.variations.executive, 'executive');
                      }}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition"
                    >
                      {copiedKey === 'executive' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                    • {evaluationResult.variations.executive}
                  </p>
                </div>

                {/* Metrics Heavy */}
                <div
                  onClick={() => setSelectedVariationKey('metricsHeavy')}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedVariationKey === 'metricsHeavy'
                      ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200">
                      Metrics & Scale Heavy
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(evaluationResult.variations.metricsHeavy, 'metricsHeavy');
                      }}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition"
                    >
                      {copiedKey === 'metricsHeavy' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                    • {evaluationResult.variations.metricsHeavy}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 rounded-lg transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              onApplyImprovement(getActiveReplacementText());
              onClose();
            }}
            disabled={!bulletText.trim()}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            Apply to Resume
          </button>
        </div>
      </div>
    </div>
  );
};
