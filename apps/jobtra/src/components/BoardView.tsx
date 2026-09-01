import React, { useState } from 'react';
import {
  Plus,
  MoreHorizontal,
  Calendar,
  DollarSign,
  MapPin,
  Mail,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  User,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { ApplicationStatus, JobApplication } from '../types';
import { getStatusStyle, getSourceStyle, getPriorityStyle, formatDate, triggerOfferConfetti } from '../utils/notionStyles';

interface BoardViewProps {
  applications: JobApplication[];
  onSelectApplication: (app: JobApplication) => void;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void;
  onQuickAdd: (status: ApplicationStatus, title: string) => void;
  onDeleteApplication: (id: string) => void;
}

const COLUMNS: { status: ApplicationStatus; title: string }[] = [
  { status: 'Wishlist', title: 'Wishlist' },
  { status: 'Applied', title: 'Applied' },
  { status: 'Screening', title: 'Screening' },
  { status: 'Interviewing', title: 'Interviewing' },
  { status: 'Offer', title: 'Offer' },
  { status: 'Rejected', title: 'Rejected' },
];

export const BoardView: React.FC<BoardViewProps> = ({
  applications,
  onSelectApplication,
  onUpdateStatus,
  onQuickAdd,
  onDeleteApplication,
}) => {
  const [quickAddColumn, setQuickAddColumn] = useState<ApplicationStatus | null>(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null);
  const [mobileActiveColumn, setMobileActiveColumn] = useState<ApplicationStatus | 'all'>('all');

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, colStatus: ApplicationStatus) => {
    e.preventDefault();
    setDragOverColumn(colStatus);
  };

  const handleDrop = (e: React.DragEvent, colStatus: ApplicationStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (id) {
      onUpdateStatus(id, colStatus);
      if (colStatus === 'Offer') {
        triggerOfferConfetti();
      }
    }
    setDraggedId(null);
    setDragOverColumn(null);
  };

  const handleQuickAddSubmit = (status: ApplicationStatus) => {
    if (quickAddText.trim()) {
      onQuickAdd(status, quickAddText.trim());
      setQuickAddText('');
      setQuickAddColumn(null);
    }
  };

  const getNextStatus = (current: ApplicationStatus): ApplicationStatus | null => {
    switch (current) {
      case 'Wishlist': return 'Applied';
      case 'Applied': return 'Screening';
      case 'Screening': return 'Interviewing';
      case 'Interviewing': return 'Offer';
      default: return null;
    }
  };

  const visibleColumns = mobileActiveColumn === 'all'
    ? COLUMNS
    : COLUMNS.filter((c) => c.status === mobileActiveColumn);

  return (
    <div className="w-full pb-12 pt-3 px-3 sm:px-8 max-w-[1440px] mx-auto">
      {/* Mobile Column Quick Filter Chips */}
      <div className="flex md:hidden items-center space-x-1.5 overflow-x-auto pb-3 scrollbar-none -mx-1 px-1">
        <button
          onClick={() => setMobileActiveColumn('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition ${
            mobileActiveColumn === 'all'
              ? 'bg-neutral-900 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          All Stages ({applications.length})
        </button>
        {COLUMNS.map((col) => {
          const count = applications.filter((a) => a.status === col.status).length;
          const style = getStatusStyle(col.status);
          const isSelected = mobileActiveColumn === col.status;
          return (
            <button
              key={col.status}
              onClick={() => setMobileActiveColumn(col.status)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                isSelected
                  ? `${style.bg} ${style.text} ring-2 ring-blue-500`
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              <span>{col.title}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Columns Container */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory">
        {visibleColumns.map((col) => {
          const colApps = applications.filter((a) => a.status === col.status);
          const style = getStatusStyle(col.status);
          const isDraggingOver = dragOverColumn === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`w-[85vw] sm:w-72 shrink-0 snap-start flex flex-col rounded-xl bg-[#FAF9F7]/95 border transition-all ${
                isDraggingOver
                  ? 'border-blue-400 bg-blue-50/40 ring-2 ring-blue-200'
                  : 'border-neutral-200/80'
              } p-2.5 sm:p-3 min-h-[420px] sm:min-h-[500px] shadow-2xs`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1.5 py-1 mb-2">
                <div className="flex items-center space-x-2">
                  {/* Notion colored status pill */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${style.bg} ${style.text} border ${style.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                    {col.title}
                  </span>
                  <span className="text-xs text-neutral-400 font-medium">{colApps.length}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setQuickAddColumn(col.status);
                      setQuickAddText('');
                    }}
                    className="p-1 rounded hover:bg-neutral-200/70 text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
                    title={`Add new card to ${col.title}`}
                  >
                    <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-2 flex-1">
                {colApps.map((app) => {
                  const sourceStyle = getSourceStyle(app.source);
                  const priorityStyle = getPriorityStyle(app.priority);
                  const hasEmailUpdates = app.linkedEmails && app.linkedEmails.length > 0;
                  const nextStatus = getNextStatus(app.status);

                  return (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
                      onClick={() => onSelectApplication(app)}
                      className="group relative bg-white hover:bg-white rounded-lg border border-neutral-200/80 shadow-2xs hover:shadow-md transition-all duration-150 p-3 cursor-pointer select-none"
                    >
                      {/* Top Row: Company & Priority */}
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <div className="font-bold text-neutral-900 text-sm tracking-tight group-hover:text-blue-600 transition flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded bg-neutral-100 border border-neutral-200 text-[11px] font-bold flex items-center justify-center text-neutral-700 shrink-0">
                            {app.company.charAt(0)}
                          </span>
                          <span className="truncate max-w-[150px] sm:max-w-[160px]">{app.company}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityStyle.bg} ${priorityStyle.text}`}
                          >
                            {app.priority}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteApplication(app.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 sm:opacity-0 focus:opacity-100 p-1 rounded hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete application"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Job Role Title */}
                      <div className="text-xs font-semibold text-neutral-700 line-clamp-1 mb-2">
                        {app.role}
                      </div>

                      {/* Details Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2 text-[11px]">
                        {/* Salary */}
                        {app.salary && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px] font-medium border border-neutral-200/60">
                            <DollarSign className="w-2.5 h-2.5 text-neutral-400" />
                            {app.salary}
                          </span>
                        )}

                        {/* Location / WorkType */}
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-50 text-neutral-600 text-[10px] border border-neutral-200/40">
                          <MapPin className="w-2.5 h-2.5 text-neutral-400" />
                          {app.location}
                        </span>

                        {/* Source Tag */}
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${sourceStyle.bg} ${sourceStyle.text}`}
                        >
                          {app.source}
                        </span>

                        {/* Recruiter / Contact Tag */}
                        {(app.contactName || app.contactEmail) && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-100/80 truncate max-w-[140px]"
                            title={`Recruiter: ${app.contactName || ''} (${app.contactEmail || ''})`}
                          >
                            <User className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                            <span className="truncate">{app.contactName || app.contactEmail}</span>
                          </span>
                        )}
                      </div>

                      {/* Next Step Reminder */}
                      {app.nextStepTitle && (
                        <div className="mt-2 pt-1.5 border-t border-neutral-100 flex items-start gap-1.5 text-[11px] text-purple-900 bg-purple-50/70 p-1.5 rounded">
                          <Clock className="w-3 h-3 text-purple-600 shrink-0 mt-0.5" />
                          <div className="truncate">
                            <span className="font-semibold">{app.nextStepTitle}</span>
                          </div>
                        </div>
                      )}

                      {/* Mobile Touch Quick Actions & Email Updates Bar */}
                      <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between gap-1 text-[10px]">
                        {hasEmailUpdates ? (
                          <span className="inline-flex items-center gap-1 text-blue-700 font-medium bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-100 truncate">
                            <Mail className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                            <span>{app.linkedEmails.length} Synced</span>
                          </span>
                        ) : (
                          <span className="text-neutral-400">{formatDate(app.dateApplied)}</span>
                        )}

                        {/* Quick Status Advance for Mobile */}
                        {nextStatus && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(app.id, nextStatus);
                              if (nextStatus === 'Offer') triggerOfferConfetti();
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 hover:bg-blue-50 hover:text-blue-700 rounded text-[10px] font-semibold text-neutral-700 transition cursor-pointer"
                            title={`Advance to ${nextStatus}`}
                          >
                            <span>Move to {nextStatus}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-blue-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Inline Quick Add Input */}
                {quickAddColumn === col.status ? (
                  <div className="bg-white rounded-md border border-blue-400 p-2 shadow-xs">
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Acme Corp - Full Stack Eng"
                      value={quickAddText}
                      onChange={(e) => setQuickAddText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAddSubmit(col.status);
                        if (e.key === 'Escape') setQuickAddColumn(null);
                      }}
                      className="w-full text-xs text-neutral-800 outline-none placeholder-neutral-400 mb-2"
                    />
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-xs">
                      <button
                        onClick={() => handleQuickAddSubmit(col.status)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold"
                      >
                        Add Page
                      </button>
                      <button
                        onClick={() => setQuickAddColumn(null)}
                        className="text-neutral-400 hover:text-neutral-600 text-[11px] px-1.5 py-0.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setQuickAddColumn(col.status);
                      setQuickAddText('');
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-2 rounded hover:bg-neutral-200/60 text-neutral-500 hover:text-neutral-800 text-xs transition cursor-pointer font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add a page</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
