import React, { useState } from 'react';
import {
  Kanban,
  Table as TableIcon,
  Calendar,
  Mail,
  BarChart3,
  Filter,
  ArrowUpDown,
  Search,
  Plus,
  ChevronDown,
  X,
  Check,
  FileText
} from 'lucide-react';
import { ApplicationStatus, JobSource, PriorityLevel } from '../types';

export type ViewType = 'board' | 'table' | 'calendar' | 'emails' | 'analytics' | 'cvs';

interface NotionViewTabsProps {
  currentView: ViewType;
  onViewChange: (v: ViewType) => void;
  onOpenNewModal: () => void;
  statusFilter: ApplicationStatus | 'All';
  onStatusFilterChange: (s: ApplicationStatus | 'All') => void;
  sourceFilter: JobSource | 'All';
  onSourceFilterChange: (s: JobSource | 'All') => void;
  priorityFilter: PriorityLevel | 'All';
  onPriorityFilterChange: (p: PriorityLevel | 'All') => void;
  sortBy: 'dateApplied' | 'company' | 'priority' | 'nextStep';
  onSortByChange: (s: 'dateApplied' | 'company' | 'priority' | 'nextStep') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount: number;
  cvCount?: number;
}

export const NotionViewTabs: React.FC<NotionViewTabsProps> = ({
  currentView,
  onViewChange,
  onOpenNewModal,
  statusFilter,
  onStatusFilterChange,
  sourceFilter,
  onSourceFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  sortBy,
  onSortByChange,
  searchQuery,
  onSearchChange,
  totalCount,
  cvCount = 0,
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const activeFiltersCount =
    (statusFilter !== 'All' ? 1 : 0) +
    (sourceFilter !== 'All' ? 1 : 0) +
    (priorityFilter !== 'All' ? 1 : 0);

  return (
    <div className="border-b border-neutral-200/90 bg-white sticky top-12 z-20 shadow-2xs">
      <div className="max-w-[1440px] w-full mx-auto px-3 sm:px-8">
        {/* Top Tab Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-2 pb-2">
          {/* Notion View Buttons - Horizontal swipeable on mobile */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none -mx-1 px-1">
            <button
              onClick={() => onViewChange('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 ${
                currentView === 'board'
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>

            <button
              onClick={() => onViewChange('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 ${
                currentView === 'table'
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>

            <button
              onClick={() => onViewChange('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 ${
                currentView === 'calendar'
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>

            <button
              onClick={() => onViewChange('emails')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 ${
                currentView === 'emails'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-600 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <Mail className={`w-3.5 h-3.5 ${currentView === 'emails' ? 'text-white' : 'text-blue-600'}`} />
              <span>Email Sync Hub</span>
            </button>

            <button
              onClick={() => onViewChange('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 ${
                currentView === 'analytics'
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Funnel & Metrics</span>
            </button>

            <button
              onClick={() => onViewChange('cvs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 ${
                currentView === 'cvs'
                  ? 'bg-purple-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-600 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${currentView === 'cvs' ? 'text-white' : 'text-purple-600'}`} />
              <span>CVs & Resumes</span>
              {typeof cvCount === 'number' && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${currentView === 'cvs' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'}`}>
                  {cvCount}
                </span>
              )}
            </button>
          </div>

          {/* Right Database Controls (Filter, Sort, Search, New) */}
          <div className="flex items-center justify-between md:justify-end space-x-1.5 sm:space-x-2 text-xs">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowFilterDropdown(!showFilterDropdown);
                  setShowSortDropdown(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition cursor-pointer ${
                  activeFiltersCount > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 mt-1.5 z-40 bg-white rounded-lg shadow-xl border border-neutral-200 p-3 w-64 text-neutral-800 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-100 font-semibold text-neutral-700">
                    <span>Filters</span>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => {
                          onStatusFilterChange('All');
                          onSourceFilterChange('All');
                          onPriorityFilterChange('All');
                        }}
                        className="text-blue-600 hover:underline text-[11px]"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-[11px] font-medium text-neutral-500 block mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => onStatusFilterChange(e.target.value as any)}
                      className="w-full text-xs p-1.5 rounded bg-neutral-50 border border-neutral-200 outline-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Wishlist">Wishlist</option>
                      <option value="Applied">Applied</option>
                      <option value="Screening">Screening</option>
                      <option value="Interviewing">Interviewing</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Withdrawn">Withdrawn</option>
                    </select>
                  </div>

                  {/* Source Filter */}
                  <div>
                    <label className="text-[11px] font-medium text-neutral-500 block mb-1">Source</label>
                    <select
                      value={sourceFilter}
                      onChange={(e) => onSourceFilterChange(e.target.value as any)}
                      className="w-full text-xs p-1.5 rounded bg-neutral-50 border border-neutral-200 outline-none"
                    >
                      <option value="All">All Sources</option>
                      <option value="Indeed">Indeed</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Glassdoor">Glassdoor</option>
                      <option value="Company Site">Company Site</option>
                      <option value="Referral">Referral</option>
                      <option value="Email">Email</option>
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="text-[11px] font-medium text-neutral-500 block mb-1">Priority</label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => onPriorityFilterChange(e.target.value as any)}
                      className="w-full text-xs p-1.5 rounded bg-neutral-50 border border-neutral-200 outline-none"
                    >
                      <option value="All">All Priorities</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSortDropdown(!showSortDropdown);
                  setShowFilterDropdown(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Sort</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 mt-1.5 z-40 bg-white rounded-lg shadow-xl border border-neutral-200 p-2 w-48 text-neutral-800 space-y-1">
                  <div className="text-[11px] font-semibold text-neutral-500 px-2 py-1">Sort by</div>
                  {[
                    { id: 'dateApplied', label: 'Date Applied' },
                    { id: 'company', label: 'Company Name' },
                    { id: 'priority', label: 'Priority' },
                    { id: 'nextStep', label: 'Next Step Date' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        onSortByChange(opt.id as any);
                        setShowSortDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-neutral-100 text-left transition cursor-pointer"
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Inline search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-28 sm:w-36 pl-8 pr-2 py-1.5 rounded-md bg-neutral-50 hover:bg-neutral-100/80 focus:bg-white border border-neutral-200 text-xs text-neutral-800 placeholder-neutral-400 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Notion "+ New" Button */}
            <button
              onClick={onOpenNewModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
