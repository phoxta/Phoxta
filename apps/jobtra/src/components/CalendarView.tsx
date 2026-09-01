import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  List,
  Sparkles,
  MapPin,
  Building
} from 'lucide-react';
import { JobApplication } from '../types';
import { getStatusStyle, formatDate } from '../utils/notionStyles';

interface CalendarViewProps {
  applications: JobApplication[];
  onSelectApplication: (app: JobApplication) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  applications,
  onSelectApplication,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026
  const [mobileMode, setMobileMode] = useState<'grid' | 'agenda'>('agenda');

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDayIndex }, (_, i) => i);

  // Collect upcoming events for Agenda view
  const scheduledInterviews = applications.filter((a) => a.nextStepDate);
  const recentApplications = applications.filter((a) => a.dateApplied);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-8 py-2 sm:py-4">
      {/* Mobile Switcher */}
      <div className="flex sm:hidden items-center justify-between mb-2.5 bg-neutral-100/90 p-1 rounded-xl">
        <span className="text-[11px] font-semibold text-neutral-600 px-2">Calendar Mode</span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setMobileMode('agenda')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
              mobileMode === 'agenda'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            📋 Schedule Agenda
          </button>
          <button
            onClick={() => setMobileMode('grid')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
              mobileMode === 'grid'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            📅 Month Grid
          </button>
        </div>
      </div>

      {/* Agenda Feed for Mobile (Default on small screens) */}
      {mobileMode === 'agenda' && (
        <div className="sm:hidden space-y-4 mb-6">
          {/* Upcoming Interviews & Next Steps */}
          <div className="bg-white rounded-xl border border-purple-200/90 p-3.5 shadow-2xs">
            <h3 className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-2.5">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>Upcoming Interviews &amp; Action Steps</span>
            </h3>

            {scheduledInterviews.length > 0 ? (
              <div className="space-y-2">
                {scheduledInterviews.map((app) => (
                  <div
                    key={`agenda-${app.id}`}
                    onClick={() => onSelectApplication(app)}
                    className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-200/70 active:bg-purple-100 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4 className="font-bold text-xs text-neutral-900">{app.company}</h4>
                      <span className="text-[10px] bg-purple-200/80 text-purple-900 font-semibold px-2 py-0.5 rounded-full">
                        {app.nextStepDate ? new Date(app.nextStepDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-purple-900 mb-1">{app.nextStepTitle || 'Interview'}</p>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                      <span>{app.role}</span>
                      <span>•</span>
                      <span>{app.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 py-2 text-center">No upcoming interviews scheduled yet.</p>
            )}
          </div>

          {/* Applications Timeline */}
          <div className="bg-white rounded-xl border border-neutral-200/90 p-3.5 shadow-2xs">
            <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5 mb-2.5">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Application Submissions</span>
            </h3>

            <div className="space-y-2">
              {recentApplications.map((app) => {
                const style = getStatusStyle(app.status);
                return (
                  <div
                    key={`recent-${app.id}`}
                    onClick={() => onSelectApplication(app)}
                    className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/70 flex items-center justify-between gap-2 active:bg-neutral-100 transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-neutral-900 truncate">{app.company}</h4>
                      <p className="text-[11px] text-neutral-500 truncate">{app.role}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.bg} ${style.text} mb-0.5`}>
                        {app.status}
                      </span>
                      <p className="text-[10px] text-neutral-400">{formatDate(app.dateApplied)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Month Calendar Grid (Visible on Desktop OR when toggled on Mobile) */}
      <div className={`bg-white rounded-xl border border-neutral-200/90 shadow-2xs overflow-hidden ${mobileMode === 'agenda' ? 'hidden sm:block' : 'block'}`}>
        {/* Calendar Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-3 border-b border-neutral-200 bg-[#FAF9F7] gap-2">
          <div className="flex items-center justify-between sm:justify-start space-x-3">
            <span className="text-sm sm:text-base font-bold text-neutral-900">{monthName}</span>
            <div className="flex items-center space-x-1 border border-neutral-300 rounded-lg bg-white p-0.5 shadow-2xs">
              <button
                onClick={prevMonth}
                className="p-1 rounded hover:bg-neutral-100 text-neutral-600 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2 py-0.5 text-xs font-medium hover:bg-neutral-100 rounded text-neutral-700 cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded hover:bg-neutral-100 text-neutral-600 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-[11px] text-neutral-500 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Applied Date
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span> Interview / Next Step
            </span>
          </div>
        </div>

        {/* Scrollable Month Grid for Mobile */}
        <div className="overflow-x-auto w-full overscroll-x-contain touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="min-w-[650px]">
            {/* Days of Week */}
            <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-center text-xs font-semibold text-neutral-600 py-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Grid Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-neutral-200">
              {blankDays.map((_, index) => (
                <div key={`blank-${index}`} className="min-h-[100px] sm:min-h-[110px] bg-neutral-50/40 p-1.5" />
              ))}

              {daysArray.map((day) => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                // Applications applied on this date
                const appliedHere = applications.filter((a) => a.dateApplied === dateStr);

                // Applications with interview / next step on this date
                const nextStepHere = applications.filter(
                  (a) => a.nextStepDate && a.nextStepDate.startsWith(dateStr)
                );

                const isToday =
                  new Date().getDate() === day &&
                  new Date().getMonth() === month &&
                  new Date().getFullYear() === year;

                return (
                  <div
                    key={day}
                    className={`min-h-[100px] sm:min-h-[110px] p-1.5 relative group hover:bg-[#FAF9F7] transition ${
                      isToday ? 'bg-blue-50/20' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-neutral-700'
                        }`}
                      >
                        {day}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {/* Interview events */}
                      {nextStepHere.map((app) => (
                        <button
                          key={`next-${app.id}`}
                          onClick={() => onSelectApplication(app)}
                          className="w-full text-left bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/80 rounded px-1.5 py-0.5 text-[10px] font-medium truncate flex items-center gap-1 transition cursor-pointer"
                        >
                          <Clock className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                          <span className="truncate">{app.company}: {app.nextStepTitle || 'Interview'}</span>
                        </button>
                      ))}

                      {/* Applied items */}
                      {appliedHere.map((app) => {
                        const style = getStatusStyle(app.status);
                        return (
                          <button
                            key={`app-${app.id}`}
                            onClick={() => onSelectApplication(app)}
                            className={`w-full text-left ${style.bg} ${style.text} hover:opacity-90 border ${style.border} rounded px-1.5 py-0.5 text-[10px] font-medium truncate flex items-center gap-1 transition cursor-pointer`}
                          >
                            <span className="font-bold truncate">{app.company}</span>
                            <span className="text-[9px] opacity-75 truncate">({app.role})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
