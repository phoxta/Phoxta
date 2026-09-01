import React, { useState } from 'react';
import {
  Search,
  Star,
  Share2,
  Mail,
  Sparkles,
  Plus,
  ChevronRight,
  X,
  Database,
  Lock
} from 'lucide-react';

interface NotionTopNavProps {
  onOpenNewModal: () => void;
  onOpenEmailSync: () => void;
  unreadEmailUpdatesCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isStarred: boolean;
  onToggleStar: () => void;
  isFirebaseConnected?: boolean;
  connectedAccountsCount?: number;
  onLock?: () => void;
}

export const NotionTopNav: React.FC<NotionTopNavProps> = ({
  onOpenNewModal,
  onOpenEmailSync,
  unreadEmailUpdatesCount,
  searchQuery,
  onSearchChange,
  isStarred,
  onToggleStar,
  isFirebaseConnected = true,
  connectedAccountsCount = 2,
  onLock,
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-12 px-3 sm:px-5 bg-white/95 backdrop-blur-md border-b border-neutral-200/90 text-xs text-neutral-600 select-none">
      {/* Mobile Search Overlay */}
      {isMobileSearchOpen ? (
        <div className="flex items-center w-full gap-2 animate-in fade-in duration-150">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search companies, roles, status..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 focus:bg-white focus:border-blue-500 text-xs text-neutral-900 outline-none"
            />
          </div>
          <button
            onClick={() => {
              setIsMobileSearchOpen(false);
              onSearchChange('');
            }}
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          {/* Left: Notion Breadcrumbs */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-hidden">
            <div className="flex items-center space-x-1 hover:bg-neutral-100 py-1 px-1.5 rounded transition cursor-pointer text-neutral-700 font-medium">
              <span className="text-base">💼</span>
              <span className="truncate max-w-[80px] sm:max-w-[140px]">Career</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <div className="flex items-center space-x-1.5 hover:bg-neutral-100 py-1 px-1.5 rounded transition cursor-pointer text-neutral-900 font-semibold truncate">
              <span className="truncate max-w-[110px] sm:max-w-none">Job Tracker</span>
            </div>

            {/* Firebase Cloud Persistence Badge */}
            <div className="hidden lg:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium" title="Data is securely stored in Supabase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Supabase Synced</span>
            </div>
          </div>

          {/* Center/Right Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Mobile Search Button */}
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="sm:hidden p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 transition cursor-pointer"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Desktop Search Input */}
            <div className="relative hidden sm:flex items-center">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-32 md:w-44 lg:w-52 pl-8 pr-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200/70 focus:bg-white border border-transparent focus:border-blue-400 text-xs text-neutral-800 placeholder-neutral-400 outline-none transition"
              />
            </div>

            {/* Email Sync Badge Button */}
            <button
              onClick={onOpenEmailSync}
              className="relative inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition cursor-pointer border border-blue-200/70 text-xs"
              title="Fetch and sync job updates from Gmail & Indeed"
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Sync Emails</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 bg-blue-600 text-white rounded-full font-bold">
                <Sparkles className="w-2.5 h-2.5" />
                {unreadEmailUpdatesCount > 0 ? unreadEmailUpdatesCount : 'AI'}
              </span>
            </button>

            {/* Favorite */}
            <button
              onClick={onToggleStar}
              className={`p-1.5 rounded-lg hover:bg-neutral-100 transition cursor-pointer ${
                isStarred ? 'text-amber-500' : 'text-neutral-500'
              }`}
              title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
            </button>

            {/* Share */}
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-100 transition text-neutral-600 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            {/* Lock Workspace Button */}
            {onLock && (
              <button
                onClick={onLock}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-100 transition text-neutral-600 cursor-pointer"
                title="Lock workspace (Require access code)"
              >
                <Lock className="w-3.5 h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">Lock</span>
              </button>
            )}

            {/* New Application Blue Button */}
            <button
              onClick={onOpenNewModal}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition cursor-pointer text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </>
      )}
    </header>
  );
};
