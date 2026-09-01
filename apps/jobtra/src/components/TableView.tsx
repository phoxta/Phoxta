import React, { useState, useRef } from 'react';
import {
  MoreHorizontal,
  ExternalLink,
  ChevronDown,
  Mail,
  Calendar,
  DollarSign,
  MapPin,
  Sparkles,
  Trash2,
  Check,
  Plus,
  Maximize2,
  FileText,
  ChevronRight,
  ChevronLeft,
  ArrowRight
} from 'lucide-react';
import { ApplicationStatus, JobApplication, JobSource, PriorityLevel } from '../types';
import { getStatusStyle, getSourceStyle, getPriorityStyle, formatDate } from '../utils/notionStyles';

interface TableViewProps {
  applications: JobApplication[];
  onSelectApplication: (app: JobApplication) => void;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void;
  onDeleteApplication: (id: string) => void;
  onOpenNewModal: () => void;
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

export const TableView: React.FC<TableViewProps> = ({
  applications,
  onSelectApplication,
  onUpdateStatus,
  onDeleteApplication,
  onOpenNewModal,
}) => {
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mobileDisplayMode, setMobileDisplayMode] = useState<'table' | 'cards'>('table');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const toggleSelectAll = () => {
    if (selectedIds.length === applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map((a) => a.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleScrollTable = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      tableContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-8 py-2 sm:py-4">
      {/* Mobile Toolbar & Switcher */}
      <div className="flex flex-col sm:hidden mb-2.5 gap-2">
        <div className="flex items-center justify-between bg-neutral-100/90 p-1 rounded-xl">
          <span className="text-[11px] font-semibold text-neutral-600 px-2">Display</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setMobileDisplayMode('table')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                mobileDisplayMode === 'table'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              📊 Spreadsheet
            </button>
            <button
              onClick={() => setMobileDisplayMode('cards')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                mobileDisplayMode === 'cards'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              📱 Mobile Cards
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Hint on Mobile */}
        {mobileDisplayMode === 'table' && (
          <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200/80 px-2.5 py-1.5 rounded-lg text-[11px] text-blue-900">
            <span className="font-medium flex items-center gap-1">
              <span>↔️ Swipe table horizontally</span>
              <span className="text-[10px] text-blue-600">(Company pinned)</span>
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleScrollTable('left')}
                className="p-1 rounded bg-white hover:bg-blue-100 text-blue-800 shadow-2xs border border-blue-200 cursor-pointer"
                title="Scroll Left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleScrollTable('right')}
                className="p-1 rounded bg-white hover:bg-blue-100 text-blue-800 shadow-2xs border border-blue-200 cursor-pointer"
                title="Scroll Right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards View (< sm screens when selected) */}
      {mobileDisplayMode === 'cards' && (
        <div className="sm:hidden space-y-2.5 mb-6">
          {applications.map((app) => {
            const statusStyle = getStatusStyle(app.status);
            const sourceStyle = getSourceStyle(app.source);
            const priorityStyle = getPriorityStyle(app.priority);

            return (
              <div
                key={app.id}
                onClick={() => onSelectApplication(app)}
                className="bg-white rounded-xl border border-neutral-200/90 p-3.5 shadow-2xs active:bg-neutral-50 transition cursor-pointer"
              >
                {/* Header: Company, Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 text-xs font-bold flex items-center justify-center text-neutral-800 shrink-0">
                      {app.company.charAt(0)}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 leading-snug">{app.company}</h4>
                      <p className="text-xs font-medium text-neutral-600 line-clamp-1">{app.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} shrink-0`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      {app.status}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteApplication(app.id);
                      }}
                      className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete application"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Properties Row */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-600 mb-2">
                  {app.salary && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 font-medium">
                      <DollarSign className="w-2.5 h-2.5 text-neutral-400" />
                      {app.salary}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-50 text-neutral-600 border border-neutral-200/60">
                    <MapPin className="w-2.5 h-2.5 text-neutral-400" />
                    {app.location}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded font-medium ${sourceStyle.bg} ${sourceStyle.text}`}>
                    {app.source}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
                    {app.priority}
                  </span>
                </div>

                {/* CV & Next Step info */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px]">
                  {app.tailoredCv ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                      <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{app.tailoredCv.matchScore}% Match CV</span>
                    </span>
                  ) : app.appliedCvTitle ? (
                    <span className="inline-flex items-center gap-1 text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded truncate max-w-[170px]">
                      <FileText className="w-3 h-3 text-purple-600 shrink-0" />
                      <span className="truncate">{app.appliedCvTitle}</span>
                    </span>
                  ) : (
                    <span className="text-neutral-400">Default CV</span>
                  )}

                  {app.nextStepTitle ? (
                    <span className="inline-flex items-center gap-1 text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded truncate max-w-[150px]">
                      <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="truncate">{app.nextStepTitle}</span>
                    </span>
                  ) : (
                    <span className="text-neutral-400">{formatDate(app.dateApplied)}</span>
                  )}
                </div>
              </div>
            );
          })}

          <button
            onClick={onOpenNewModal}
            className="w-full py-2.5 rounded-xl border border-dashed border-neutral-300 text-neutral-600 hover:text-blue-600 hover:border-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 bg-neutral-50/50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Application</span>
          </button>
        </div>
      )}

      {/* Spreadsheet Table Container */}
      <div className={`border border-neutral-200/90 rounded-xl overflow-hidden bg-white shadow-2xs ${mobileDisplayMode === 'cards' ? 'hidden sm:block' : 'block'}`}>
        <div
          ref={tableContainerRef}
          className="overflow-x-auto w-full overscroll-x-contain touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <table className="w-full text-left text-xs border-collapse min-w-[1080px]">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-neutral-200 bg-[#FAF9F7] text-neutral-600 font-semibold select-none">
                {/* Sticky Checkbox Header */}
                <th className="sticky left-0 bg-[#FAF9F7] z-20 w-9 px-3 py-2.5 text-center shadow-[1px_0_0_0_#e5e5e5]">
                  <input
                    type="checkbox"
                    checked={applications.length > 0 && selectedIds.length === applications.length}
                    onChange={toggleSelectAll}
                    className="rounded border-neutral-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </th>

                {/* Sticky Company & Role Header */}
                <th className="sticky left-9 bg-[#FAF9F7] z-20 px-3 py-2.5 font-semibold text-neutral-800 min-w-[190px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] border-r border-neutral-200/80">
                  Company & Role
                </th>

                <th className="px-3 py-2.5 font-medium min-w-[125px]">Status</th>
                <th className="px-3 py-2.5 font-medium min-w-[130px]">CV / Tailored</th>
                <th className="px-3 py-2.5 font-medium min-w-[110px]">Salary</th>
                <th className="px-3 py-2.5 font-medium min-w-[120px]">Location</th>
                <th className="px-3 py-2.5 font-medium min-w-[110px]">Source</th>
                <th className="px-3 py-2.5 font-medium min-w-[160px]">Recruiter Contact</th>
                <th className="px-3 py-2.5 font-medium min-w-[110px]">Date Applied</th>
                <th className="px-3 py-2.5 font-medium min-w-[180px]">Next Step / Interview</th>
                <th className="px-3 py-2.5 font-medium min-w-[115px]">Emails Synced</th>
                <th className="w-12 px-3 py-2.5 text-right font-medium"></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-neutral-100">
              {applications.map((app) => {
                const statusStyle = getStatusStyle(app.status);
                const sourceStyle = getSourceStyle(app.source);
                const priorityStyle = getPriorityStyle(app.priority);
                const isSelected = selectedIds.includes(app.id);

                return (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApplication(app)}
                    className={`group hover:bg-[#F9F9F8] transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Sticky Checkbox Column */}
                    <td
                      className={`sticky left-0 z-10 px-3 py-2.5 text-center shadow-[1px_0_0_0_#e5e5e5] ${
                        isSelected ? 'bg-blue-50/90' : 'bg-white group-hover:bg-[#F9F9F8]'
                      }`}
                      onClick={(e) => toggleSelectOne(app.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-neutral-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Sticky Company & Role Column */}
                    <td
                      className={`sticky left-9 z-10 px-3 py-2.5 font-medium text-neutral-900 min-w-[190px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] border-r border-neutral-200/80 ${
                        isSelected ? 'bg-blue-50/90' : 'bg-white group-hover:bg-[#F9F9F8]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-neutral-100 border border-neutral-200 text-[11px] font-bold flex items-center justify-center text-neutral-700 shrink-0">
                          {app.company.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-neutral-900 group-hover:text-blue-600 transition flex items-center gap-1.5 truncate">
                            <span className="truncate">{app.company}</span>
                            <span className="opacity-0 group-hover:opacity-100 transition text-neutral-400 shrink-0">
                              <Maximize2 className="w-3 h-3" />
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 font-normal truncate max-w-[170px]">
                            {app.role}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td
                      className="px-3 py-2.5 relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          setActiveStatusDropdownId(
                            activeStatusDropdownId === app.id ? null : app.id
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} hover:opacity-90 transition cursor-pointer`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                        <span>{app.status}</span>
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </button>

                      {activeStatusDropdownId === app.id && (
                        <div className="absolute left-3 top-full mt-1 z-40 bg-white rounded-lg shadow-xl border border-neutral-200 p-1.5 w-40 text-neutral-800 space-y-0.5">
                          {STATUS_LIST.map((st) => {
                            const style = getStatusStyle(st);
                            return (
                              <button
                                key={st}
                                onClick={() => {
                                  onUpdateStatus(app.id, st);
                                  setActiveStatusDropdownId(null);
                                }}
                                className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] hover:bg-neutral-100 text-left transition cursor-pointer`}
                              >
                                <span className={`px-1.5 py-0.2 rounded font-medium ${style.bg} ${style.text}`}>
                                  {st}
                                </span>
                                {app.status === st && <Check className="w-3 h-3 text-blue-600" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* CV / Tailored Profile */}
                    <td className="px-3 py-2.5">
                      {app.tailoredCv ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{app.tailoredCv.matchScore}% Match</span>
                        </span>
                      ) : app.appliedCvTitle ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700 max-w-[140px] truncate">
                          <span className="truncate">{app.appliedCvTitle}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400 font-normal">Not tailored</span>
                      )}
                    </td>

                    {/* Salary */}
                    <td className="px-3 py-2.5 text-neutral-700">
                      {app.salary ? (
                        <span className="font-mono text-[11px] text-neutral-800 font-medium">{app.salary}</span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    {/* Location & Work Type */}
                    <td className="px-3 py-2.5 text-neutral-600 text-[11px]">
                      <div className="flex items-center gap-1 truncate max-w-[140px]">
                        <span className="truncate">{app.location}</span>
                      </div>
                    </td>

                    {/* Source */}
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${sourceStyle.bg} ${sourceStyle.text}`}
                      >
                        {app.source}
                      </span>
                    </td>

                    {/* Recruiter / Contact */}
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {app.contactName || app.contactEmail ? (
                        <div className="flex flex-col max-w-[170px]">
                          {app.contactName && (
                            <span className="font-semibold text-neutral-800 text-[11px] truncate">
                              {app.contactName}
                            </span>
                          )}
                          {app.contactEmail && (
                            <a
                              href={`mailto:${app.contactEmail}`}
                              className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate"
                              title={`Email ${app.contactEmail}`}
                            >
                              <Mail className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{app.contactEmail}</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Date Applied */}
                    <td className="px-3 py-2.5 text-neutral-600 text-[11px]">
                      {formatDate(app.dateApplied)}
                    </td>

                    {/* Next Step / Interview */}
                    <td className="px-3 py-2.5">
                      {app.nextStepTitle ? (
                        <div className="flex items-center gap-1.5 text-purple-900 bg-purple-50 px-2 py-1 rounded text-[11px] font-medium border border-purple-100 max-w-[200px] truncate">
                          <Calendar className="w-3 h-3 text-purple-600 shrink-0" />
                          <span className="truncate">{app.nextStepTitle}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Emails Synced */}
                    <td className="px-3 py-2.5">
                      {app.linkedEmails && app.linkedEmails.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-100">
                          <Mail className="w-3 h-3 text-blue-600" />
                          {app.linkedEmails.length} Synced
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">0</span>
                      )}
                    </td>

                    {/* Action Menu */}
                    <td
                      className="px-3 py-2.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onDeleteApplication(app.id)}
                        className="opacity-60 hover:opacity-100 p-1.5 rounded hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete application"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Quick add bottom row */}
              <tr>
                <td colSpan={12} className="px-3 py-2 bg-[#FCFBFA]">
                  <button
                    onClick={onOpenNewModal}
                    className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 text-xs font-medium py-1 px-2 rounded hover:bg-neutral-200/50 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Application</span>
                  </button>
                </td>
              </tr>
            </tbody>

            {/* Footer Calculation Row */}
            <tfoot>
              <tr className="border-t border-neutral-200 bg-[#FAF9F7] text-neutral-500 text-[11px] font-medium">
                <td className="sticky left-0 bg-[#FAF9F7] z-10 px-3 py-2 text-center shadow-[1px_0_0_0_#e5e5e5]"></td>
                <td className="sticky left-9 bg-[#FAF9F7] z-10 px-3 py-2 font-semibold text-neutral-700 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] border-r border-neutral-200/80">
                  Total: {applications.length} apps
                </td>
                <td className="px-3 py-2 text-emerald-700 font-medium">
                  {applications.filter((a) => a.status === 'Offer').length} Offers
                </td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2">
                  {applications.filter((a) => a.source === 'Indeed').length} from Indeed
                </td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-purple-700 font-medium">
                  {applications.filter((a) => a.status === 'Interviewing').length} Interviews
                </td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/95 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3.5 z-50 border border-neutral-700 animate-in slide-in-from-bottom-3">
          <span className="text-xs font-semibold">{selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected</span>
          <div className="h-4 w-px bg-neutral-700" />
          <button
            type="button"
            onClick={() => {
              selectedIds.forEach((id) => onDeleteApplication(id));
              setSelectedIds([]);
            }}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected ({selectedIds.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-xs text-neutral-400 hover:text-white px-2 py-1 transition cursor-pointer"
          >
            Deselect
          </button>
        </div>
      )}
    </div>
  );
};
