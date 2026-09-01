import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  Layers,
  Calendar,
  CheckCircle2,
  PieChart as PieChartIcon,
  DollarSign,
  ArrowUpRight,
  Briefcase,
  FileText,
  Sparkles,
  BarChart3,
  Sliders,
  Filter,
  Check,
  Zap,
  Target
} from 'lucide-react';
import { JobApplication, BaseCV } from '../types';
import { CV_TEMPLATES } from '../data/cvTemplates';

interface AnalyticsViewProps {
  applications: JobApplication[];
  baseCvs?: BaseCV[];
  onSelectApplication: (app: JobApplication) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  applications,
  baseCvs = [],
  onSelectApplication,
}) => {
  const [selectedCvFilter, setSelectedCvFilter] = useState<string | 'all'>('all');

  const total = applications.length;
  const wishlistCount = applications.filter((a) => a.status === 'Wishlist').length;
  const appliedCount = applications.filter((a) => a.status === 'Applied').length;
  const screeningCount = applications.filter((a) => a.status === 'Screening').length;
  const interviewCount = applications.filter((a) => a.status === 'Interviewing').length;
  const offerCount = applications.filter((a) => a.status === 'Offer').length;
  const rejectedCount = applications.filter((a) => a.status === 'Rejected').length;

  const totalSubmitted = total - wishlistCount;
  const responseCount = screeningCount + interviewCount + offerCount + rejectedCount;
  const responseRate = totalSubmitted > 0 ? Math.round((responseCount / totalSubmitted) * 100) : 0;
  const interviewRate = totalSubmitted > 0 ? Math.round(((interviewCount + offerCount) / totalSubmitted) * 100) : 0;
  const offerRate = totalSubmitted > 0 ? Math.round((offerCount / totalSubmitted) * 100) : 0;

  // Source breakdown
  const sourceCounts: Record<string, { total: number; interviews: number; offers: number }> = {};
  applications.forEach((a) => {
    if (!sourceCounts[a.source]) {
      sourceCounts[a.source] = { total: 0, interviews: 0, offers: 0 };
    }
    sourceCounts[a.source].total += 1;
    if (a.status === 'Interviewing' || a.status === 'Offer') {
      sourceCounts[a.source].interviews += 1;
    }
    if (a.status === 'Offer') {
      sourceCounts[a.source].offers += 1;
    }
  });

  // CV Version Performance Calculation (Pipeline Attribution)
  const cvMetrics = baseCvs.map((cv) => {
    const linkedApps = applications.filter(
      (a) => a.appliedCvId === cv.id || a.tailoredCv?.baseCvId === cv.id
    );
    const submitted = linkedApps.filter((a) => a.status !== 'Wishlist');
    const responses = submitted.filter((a) => ['Screening', 'Interviewing', 'Offer', 'Rejected'].includes(a.status));
    const interviews = submitted.filter((a) => ['Interviewing', 'Offer'].includes(a.status));
    const offers = submitted.filter((a) => a.status === 'Offer');

    const matchScores = linkedApps
      .map((a) => a.tailoredCv?.matchScore)
      .filter((s): s is number => typeof s === 'number');
    const avgMatchScore = matchScores.length > 0 ? Math.round(matchScores.reduce((acc, v) => acc + v, 0) / matchScores.length) : null;

    const respRate = submitted.length > 0 ? Math.round((responses.length / submitted.length) * 100) : 0;
    const intRate = submitted.length > 0 ? Math.round((interviews.length / submitted.length) * 100) : 0;
    const offRate = submitted.length > 0 ? Math.round((offers.length / submitted.length) * 100) : 0;

    return {
      cv,
      totalApps: linkedApps.length,
      submittedCount: submitted.length,
      responseRate: respRate,
      interviewRate: intRate,
      offerRate: offRate,
      offersCount: offers.length,
      avgMatchScore,
    };
  });

  // Tailored vs Generic CV A/B Performance
  const tailoredApps = applications.filter((a) => !!a.tailoredCv && a.status !== 'Wishlist');
  const genericApps = applications.filter((a) => !a.tailoredCv && a.status !== 'Wishlist');

  const tailoredInterviews = tailoredApps.filter((a) => ['Interviewing', 'Offer'].includes(a.status)).length;
  const genericInterviews = genericApps.filter((a) => ['Interviewing', 'Offer'].includes(a.status)).length;

  const tailoredInterviewRate = tailoredApps.length > 0 ? Math.round((tailoredInterviews / tailoredApps.length) * 100) : 0;
  const genericInterviewRate = genericApps.length > 0 ? Math.round((genericInterviews / genericApps.length) * 100) : 0;

  // Filtered applications based on selected CV version
  const displayedFilteredApps = selectedCvFilter === 'all'
    ? applications
    : applications.filter((a) => a.appliedCvId === selectedCvFilter || a.tailoredCv?.baseCvId === selectedCvFilter);

  const funnelSteps = [
    { label: 'Applications Submitted', count: totalSubmitted, color: 'bg-blue-600', percent: '100%' },
    {
      label: 'Responses Received',
      count: responseCount,
      color: 'bg-indigo-500',
      percent: `${responseRate}%`,
    },
    {
      label: 'Interviews Scheduled',
      count: interviewCount + offerCount,
      color: 'bg-purple-600',
      percent: `${interviewRate}%`,
    },
    {
      label: 'Offers Extended',
      count: offerCount,
      color: 'bg-emerald-600',
      percent: `${offerRate}%`,
    },
  ];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-8 py-3 sm:py-6 space-y-5 sm:space-y-7">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-900 via-indigo-900 to-neutral-900 p-5 sm:p-6 rounded-2xl text-white shadow-md">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Pipeline Intelligence &amp; CV Attribution</span>
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Real-time analytics across your application funnels, CV version conversion rates, and ATS tailoring lift.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-3 py-2 rounded-xl backdrop-blur-xs border border-white/10 text-center">
            <span className="text-[10px] text-blue-200 uppercase font-semibold block">Tailored Lift</span>
            <span className="text-base font-black text-emerald-400">
              +{Math.max(0, tailoredInterviewRate - genericInterviewRate)}%
            </span>
          </div>
          <div className="bg-white/10 px-3 py-2 rounded-xl backdrop-blur-xs border border-white/10 text-center">
            <span className="text-[10px] text-blue-200 uppercase font-semibold block">Active Funnel</span>
            <span className="text-base font-black text-white">{totalSubmitted} Apps</span>
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-xl border border-neutral-200/90 p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] sm:text-xs mb-1">
            <span>Total Applied</span>
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-neutral-900">{totalSubmitted}</div>
          <div className="text-[10px] sm:text-[11px] text-neutral-400 mt-1">{wishlistCount} in Wishlist</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] sm:text-xs mb-1">
            <span>Response Rate</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-neutral-900">{responseRate}%</div>
          <div className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-1">
            {responseCount} employer replies
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] sm:text-xs mb-1">
            <span>Interview Rate</span>
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-neutral-900">{interviewRate}%</div>
          <div className="text-[10px] sm:text-[11px] text-purple-700 font-medium mt-1">
            {interviewCount} active rounds
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/90 p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] sm:text-xs mb-1">
            <span>Offers Extended</span>
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600">{offerCount}</div>
          <div className="text-[10px] sm:text-[11px] text-neutral-400 mt-1">{offerRate}% final conversion</div>
        </div>
      </div>

      {/* CV Version Performance & Traceability Table */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>CV Version Attribution &amp; Conversion Rates</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Compare callback and interview rates across your target role profiles to double down on high-performing resumes.
            </p>
          </div>
          {baseCvs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-neutral-400 font-medium text-[11px]">Filter View:</span>
              <select
                value={selectedCvFilter}
                onChange={(e) => setSelectedCvFilter(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-700 outline-none"
              >
                <option value="all">All Base Profiles ({applications.length})</option>
                {baseCvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {cvMetrics.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl">
            No Base CVs found. Create your target role profiles in the CV Vault to start tracking version performance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 rounded-l-lg">CV Role Archetype</th>
                  <th className="py-2.5 px-3">Submissions</th>
                  <th className="py-2.5 px-3">Avg Match</th>
                  <th className="py-2.5 px-3">Response Rate</th>
                  <th className="py-2.5 px-3">Interview Rate</th>
                  <th className="py-2.5 px-3">Offers</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {cvMetrics.map((m) => {
                  const isSelected = selectedCvFilter === m.cv.id;
                  return (
                    <tr
                      key={m.cv.id}
                      className={`hover:bg-blue-50/30 transition ${
                        isSelected ? 'bg-blue-50/60 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {m.cv.title.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-neutral-900 block truncate font-bold text-xs">
                              {m.cv.title}
                            </span>
                            <span className="text-[10px] text-neutral-400 truncate block">
                              {m.cv.targetRole}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-neutral-800 font-bold">{m.submittedCount}</span>
                        <span className="text-neutral-400 text-[10px] ml-1">apps</span>
                      </td>
                      <td className="py-3 px-3">
                        {m.avgMatchScore ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            {m.avgMatchScore}%
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-neutral-900">{m.responseRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-neutral-200 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full bg-purple-600 rounded-full"
                              style={{ width: `${Math.min(100, m.interviewRate)}%` }}
                            />
                          </div>
                          <span className="font-bold text-purple-700">{m.interviewRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          {m.offersCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCvFilter(selectedCvFilter === m.cv.id ? 'all' : m.cv.id)
                          }
                          className="px-2 py-1 text-[11px] rounded font-semibold text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                        >
                          {isSelected ? 'Reset Filter' : 'Filter Apps'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* A/B Tailoring Benchmark & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tailoring Lift A/B Benchmark */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Tailoring Conversion Lift</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full">
              A/B Test
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Interview callback rates for AI-tailored applications vs generic static submissions.
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>AI-Tailored CVs</span>
                </span>
                <span className="text-blue-900 font-black text-sm">{tailoredInterviewRate}%</span>
              </div>
              <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${Math.min(100, tailoredInterviewRate)}%` }}
                />
              </div>
              <span className="text-[10px] text-blue-700 block">
                {tailoredApps.length} applications with custom bullet alignment
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-700">Generic / Static CVs</span>
                <span className="text-neutral-900 font-black text-sm">{genericInterviewRate}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-600 rounded-full"
                  style={{ width: `${Math.min(100, genericInterviewRate)}%` }}
                />
              </div>
              <span className="text-[10px] text-neutral-500 block">
                {genericApps.length} applications without custom targeting
              </span>
            </div>
          </div>
        </div>

        {/* Funnel Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Application Pipeline Funnel</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Stage-by-stage progression from initial submission to final compensation offer.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {funnelSteps.map((step, idx) => (
              <div key={idx} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-700 text-[11px] sm:text-xs">
                    {step.label}
                  </span>
                  <span className="text-neutral-500 text-[11px]">
                    <strong className="text-neutral-900">{step.count}</strong> ({step.percent})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${step.color} rounded-full transition-all duration-500`}
                    style={{
                      width:
                        totalSubmitted > 0
                          ? `${Math.max(8, (step.count / Math.max(1, totalSubmitted)) * 100)}%`
                          : '0%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sources & Action items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Source breakdown */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-neutral-900">Applications by Platform</h3>
          <div className="space-y-2 text-xs">
            {Object.entries(sourceCounts).map(([src, stat]) => {
              const pct = total > 0 ? Math.round((stat.total / total) * 100) : 0;
              const intRate = stat.total > 0 ? Math.round((stat.interviews / stat.total) * 100) : 0;
              return (
                <div
                  key={src}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-100"
                >
                  <div>
                    <span className="font-semibold text-neutral-800 block">{src}</span>
                    <span className="text-[10px] text-purple-700 font-medium">
                      {stat.interviews} interviews ({intRate}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 text-[11px]">{stat.total} apps</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-neutral-200 text-neutral-700 font-bold text-[11px]">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action item list */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">High-Priority Pipeline Actions</h3>
            {selectedCvFilter !== 'all' && (
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Filtered
              </span>
            )}
          </div>
          <div className="space-y-2 text-xs">
            {displayedFilteredApps
              .filter((a) => a.nextStepTitle || a.status === 'Interviewing' || a.status === 'Screening')
              .slice(0, 4)
              .map((app) => (
                <div
                  key={app.id}
                  onClick={() => onSelectApplication(app)}
                  className="p-2.5 rounded-lg border border-purple-100 bg-purple-50/50 hover:bg-purple-50 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-purple-950 truncate">{app.company}</div>
                    <div className="text-[11px] text-purple-700 truncate">
                      {app.nextStepTitle || `In ${app.status} stage`}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-purple-600 shrink-0" />
                </div>
              ))}
            {displayedFilteredApps.filter(
              (a) => a.nextStepTitle || a.status === 'Interviewing' || a.status === 'Screening'
            ).length === 0 && (
              <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-50 rounded-lg">
                No active follow-ups for this filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
