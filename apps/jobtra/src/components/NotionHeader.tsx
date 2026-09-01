import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  Sparkles,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  Image as ImageIcon,
  Smile,
  MailCheck,
  Plus,
  ChevronDown,
  X,
  Upload,
  Link as LinkIcon,
  Trash2,
  Shuffle,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { JobApplication } from '../types';
import {
  saveCoverToDB,
  loadCoverFromDB,
  saveCoverToLocalStorage,
  loadCoverFromLocalStorage,
  compressAndOptimizeImage
} from '../utils/coverStorage';

interface NotionHeaderProps {
  applications: JobApplication[];
  onOpenEmailSync: () => void;
  onOpenNewModal: () => void;
}

export interface CoverConfig {
  id: string;
  name: string;
  type: 'gradient' | 'image';
  value: string; // CSS gradient class or Image URL
  accent?: string;
}

const GRADIENT_COVERS: CoverConfig[] = [
  {
    id: 'gradient-indigo',
    name: 'Nordic Indigo',
    type: 'gradient',
    value: 'bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900',
    accent: 'border-indigo-400/40'
  },
  {
    id: 'gradient-slate',
    name: 'Obsidian Slate',
    type: 'gradient',
    value: 'bg-gradient-to-r from-neutral-950 via-zinc-900 to-slate-950',
    accent: 'border-slate-400/40'
  },
  {
    id: 'gradient-emerald',
    name: 'Emerald Aurora',
    type: 'gradient',
    value: 'bg-gradient-to-r from-teal-950 via-emerald-950 to-slate-950',
    accent: 'border-emerald-400/40'
  },
  {
    id: 'gradient-sunset',
    name: 'Sunset Ember',
    type: 'gradient',
    value: 'bg-gradient-to-r from-amber-950 via-rose-950 to-neutral-950',
    accent: 'border-amber-400/40'
  },
  {
    id: 'gradient-violet',
    name: 'Cosmic Violet',
    type: 'gradient',
    value: 'bg-gradient-to-r from-violet-950 via-purple-950 to-slate-950',
    accent: 'border-purple-400/40'
  },
  {
    id: 'gradient-ocean',
    name: 'Deep Blue Sea',
    type: 'gradient',
    value: 'bg-gradient-to-r from-cyan-950 via-blue-950 to-slate-950',
    accent: 'border-cyan-400/40'
  },
  {
    id: 'gradient-crimson',
    name: 'Crimson Flame',
    type: 'gradient',
    value: 'bg-gradient-to-r from-rose-950 via-red-950 to-stone-950',
    accent: 'border-rose-400/40'
  },
  {
    id: 'gradient-cyber',
    name: 'Cyberpunk Mint',
    type: 'gradient',
    value: 'bg-gradient-to-r from-emerald-950 via-teal-900 to-sky-950',
    accent: 'border-teal-400/40'
  },
  {
    id: 'gradient-golden',
    name: 'Golden Hour',
    type: 'gradient',
    value: 'bg-gradient-to-r from-orange-950 via-amber-900 to-stone-900',
    accent: 'border-amber-400/40'
  }
];

const PHOTO_COVERS: CoverConfig[] = [
  {
    id: 'photo-minimal-architecture',
    name: 'Modern Architecture',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
    accent: 'border-blue-300/40'
  },
  {
    id: 'photo-workspace',
    name: 'Executive Studio',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
    accent: 'border-zinc-400/40'
  },
  {
    id: 'photo-misty-mountain',
    name: 'Alpine Horizon',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
    accent: 'border-indigo-300/40'
  },
  {
    id: 'photo-tokyo-night',
    name: 'Tokyo Skyline',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80',
    accent: 'border-purple-300/40'
  },
  {
    id: 'photo-nebula',
    name: 'Deep Cosmos',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80',
    accent: 'border-violet-300/40'
  },
  {
    id: 'photo-geometry',
    name: 'Abstract Fluid',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
    accent: 'border-rose-300/40'
  }
];

const EMOJI_CATEGORIES = {
  'Career & Work': ['💼', '🎯', '🚀', '⚡', '💻', '📈', '🏢', '👔', '📁', '📊', '🤝', '💡'],
  'Achievements': ['✨', '🏆', '🔥', '⭐', '💎', '🥇', '👑', '🎉', '🌟', '🎖️', '🏅', '🚀'],
  'Vibes & Nature': ['🌱', '🌊', '🪐', '🌙', '☕', '🎨', '🧩', '🍀', '🔮', '🧘', '🦄', '🕊️']
};

const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

const STORAGE_KEY_COVER = 'jobtra_notion_cover_config_v2';
const STORAGE_KEY_ICON = 'jobtra_notion_icon_v2';
const STORAGE_KEY_TITLE = 'jobtra_notion_title_v2';

export const NotionHeader: React.FC<NotionHeaderProps> = ({
  applications,
  onOpenEmailSync,
  onOpenNewModal,
}) => {
  // Load initial states from localStorage with safe fallbacks
  const [selectedCover, setSelectedCover] = useState<CoverConfig | null>(() => {
    return loadCoverFromLocalStorage() || GRADIENT_COVERS[0];
  });

  const [pageIcon, setPageIcon] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ICON) || '💼';
    } catch {
      return '💼';
    }
  });

  const [pageTitle, setPageTitle] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TITLE) || 'Job Application Tracker';
    } catch {
      return 'Job Application Tracker';
    }
  });

  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [coverTab, setCoverTab] = useState<'gallery' | 'gradients' | 'link' | 'upload'>('gradients');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [urlInputError, setUrlInputError] = useState('');
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const coverPickerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read persisted cover from IndexedDB on initial mount for high-capacity reliability
  useEffect(() => {
    let isMounted = true;
    loadCoverFromDB().then((dbCover) => {
      if (isMounted && dbCover) {
        setSelectedCover(dbCover);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync cover changes to dual-layer storage (IndexedDB + localStorage)
  useEffect(() => {
    saveCoverToLocalStorage(selectedCover);
    saveCoverToDB(selectedCover);
  }, [selectedCover]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ICON, pageIcon);
    } catch {}
  }, [pageIcon]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TITLE, pageTitle);
    } catch {}
  }, [pageTitle]);

  // Click outside listener for modals/popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (coverPickerRef.current && !coverPickerRef.current.contains(event.target as Node)) {
        setShowCoverPicker(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showCoverPicker || showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCoverPicker, showEmojiPicker]);

  // Compute key stats
  const totalApps = applications.length;
  const interviewingCount = applications.filter((a) => a.status === 'Interviewing' || a.status === 'Screening').length;
  const offersCount = applications.filter((a) => a.status === 'Offer').length;
  const wishlistCount = applications.filter((a) => a.status === 'Wishlist').length;
  const appliedCount = applications.filter((a) => a.status === 'Applied').length;
  const totalSubmitted = totalApps - wishlistCount;
  const responseRate = totalSubmitted > 0 ? Math.round(((totalSubmitted - appliedCount) / totalSubmitted) * 100) : 0;

  const handleApplyCustomUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customImageUrl.trim()) {
      setUrlInputError('Please enter a valid image URL');
      return;
    }
    setUrlInputError('');
    const newCover: CoverConfig = {
      id: `custom-${Date.now()}`,
      name: 'Custom URL',
      type: 'image',
      value: customImageUrl.trim(),
      accent: 'border-blue-400/40'
    };
    setSelectedCover(newCover);
    setShowCoverPicker(false);
  };

  const processAndSaveImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image (PNG, JPG, WebP, GIF).');
      return;
    }

    setIsProcessingUpload(true);
    setUploadError(null);

    try {
      // Compress and optimize image to high-fidelity header resolution
      const optimizedDataUrl = await compressAndOptimizeImage(file, 1600, 600, 0.85);

      const newCover: CoverConfig = {
        id: `upload-${Date.now()}`,
        name: file.name || 'Uploaded Cover',
        type: 'image',
        value: optimizedDataUrl,
        accent: 'border-emerald-400/40'
      };

      setSelectedCover(newCover);
      await saveCoverToDB(newCover);
      saveCoverToLocalStorage(newCover);
      setShowCoverPicker(false);
    } catch (err: any) {
      console.error('Failed to process cover upload:', err);
      setUploadError(err.message || 'Failed to process and optimize image.');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processAndSaveImage(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processAndSaveImage(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleRandomIcon = () => {
    const randomIndex = Math.floor(Math.random() * ALL_EMOJIS.length);
    setPageIcon(ALL_EMOJIS[randomIndex]);
  };

  return (
    <header className="relative w-full z-40">
      {/* Background Cover that encompasses everything above the tabs */}
      <div
        className={`relative w-full ${
          selectedCover?.type === 'gradient' ? selectedCover.value : 'bg-neutral-900'
        } text-white transition-all duration-300`}
        style={
          selectedCover?.type === 'image'
            ? {
                backgroundImage: `url(${selectedCover.value})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {/* Darkening & Frosted backdrop overlay for contrast */}
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[0.5px] pointer-events-none" />
        <div className="absolute inset-0 bg-radial-at-t from-white/10 to-transparent pointer-events-none" />

        {/* Top Cover Action Bar */}
        <div className="relative z-30 w-full max-w-[1440px] mx-auto px-4 sm:px-8 pt-3 sm:pt-4 flex justify-end items-center">
          <div className="relative" ref={coverPickerRef}>
            <div className="flex items-center gap-2">
              {/* Change Cover Button */}
              <button
                type="button"
                id="change-cover-button"
                onClick={() => {
                  setShowCoverPicker((prev) => !prev);
                  setShowEmojiPicker(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-black/60 hover:bg-black/80 active:scale-95 border border-white/20 hover:border-white/40 backdrop-blur-md rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md select-none"
                title="Change cover style or upload custom image"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-300" />
                <span>Change Cover</span>
                <ChevronDown className={`w-3 h-3 text-white/70 transition-transform ${showCoverPicker ? 'rotate-180' : ''}`} />
              </button>

              {/* Remove cover button if active */}
              {selectedCover && (
                <button
                  type="button"
                  onClick={() => setSelectedCover(null)}
                  className="p-1.5 text-white/80 hover:text-white bg-black/50 hover:bg-red-500/80 border border-white/15 backdrop-blur-md rounded-lg transition cursor-pointer"
                  title="Remove cover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Complete Notion-Style Cover Picker Popover */}
            {showCoverPicker && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-[#1e1e24] text-white rounded-2xl shadow-2xl border border-neutral-700/90 p-4 w-80 sm:w-96 text-xs animate-in fade-in zoom-in-95 backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-neutral-100 text-sm">Cover Artwork</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCoverPicker(false)}
                    className="p-1 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-neutral-900/80 rounded-xl border border-neutral-800 mb-3.5">
                  <button
                    type="button"
                    onClick={() => setCoverTab('gradients')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition cursor-pointer text-[11px] ${
                      coverTab === 'gradients'
                        ? 'bg-neutral-800 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Gradients
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverTab('gallery')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition cursor-pointer text-[11px] ${
                      coverTab === 'gallery'
                        ? 'bg-neutral-800 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Photos
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverTab('link')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition cursor-pointer text-[11px] ${
                      coverTab === 'link'
                        ? 'bg-neutral-800 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverTab('upload')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition cursor-pointer text-[11px] ${
                      coverTab === 'upload'
                        ? 'bg-neutral-800 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Upload
                  </button>
                </div>

                {/* Tab Content: Gradients */}
                {coverTab === 'gradients' && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-neutral-400 font-medium">Select a theme palette:</div>
                    <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                      {GRADIENT_COVERS.map((opt) => {
                        const isSelected = selectedCover?.id === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSelectedCover(opt);
                              setShowCoverPicker(false);
                            }}
                            className={`h-16 rounded-xl border ${opt.accent} ${opt.value} hover:scale-[1.03] transition-all relative overflow-hidden flex flex-col justify-end p-1.5 cursor-pointer shadow-md group ${
                              isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-neutral-900' : ''
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            <span className="text-[9px] text-white/90 font-semibold drop-shadow leading-tight truncate">
                              {opt.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab Content: High-Res Photos */}
                {coverTab === 'gallery' && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-neutral-400 font-medium">Curated Unsplash Landscapes:</div>
                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                      {PHOTO_COVERS.map((opt) => {
                        const isSelected = selectedCover?.id === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSelectedCover(opt);
                              setShowCoverPicker(false);
                            }}
                            className={`h-20 rounded-xl border border-neutral-700 relative overflow-hidden flex flex-col justify-end p-2 cursor-pointer shadow-md group hover:scale-[1.02] transition-transform ${
                              isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-neutral-900' : ''
                            }`}
                            style={{
                              backgroundImage: `url(${opt.value})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm z-10">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            <span className="relative z-10 text-[10px] text-white font-semibold drop-shadow leading-tight">
                              {opt.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab Content: Link / URL */}
                {coverTab === 'link' && (
                  <form onSubmit={handleApplyCustomUrl} className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                        Paste any public image link:
                      </label>
                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={customImageUrl}
                          onChange={(e) => {
                            setCustomImageUrl(e.target.value);
                            setUrlInputError('');
                          }}
                          className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition"
                        />
                      </div>
                      {urlInputError && (
                        <p className="text-red-400 text-[10px] mt-1">{urlInputError}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Image URL</span>
                    </button>
                  </form>
                )}

                {/* Tab Content: Upload File */}
                {coverTab === 'upload' && (
                  <div className="space-y-3 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFileUpload}
                      disabled={isProcessingUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => !isProcessingUpload && fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleFileDrop}
                      className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition select-none ${
                        isDragOver
                          ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                          : isProcessingUpload
                          ? 'border-neutral-700 bg-neutral-900/40 opacity-75 cursor-wait'
                          : 'border-neutral-700 hover:border-blue-500/70 hover:bg-neutral-900/60'
                      }`}
                    >
                      {isProcessingUpload ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-blue-400 shadow-inner animate-spin">
                            <Loader2 className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-semibold text-neutral-200">
                            Optimizing & Saving Cover...
                          </div>
                          <p className="text-[10px] text-neutral-400">
                            Compressing and persisting to database
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-blue-400 shadow-inner">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-semibold text-neutral-200">
                            Click to upload or drag & drop
                          </div>
                          <p className="text-[10px] text-neutral-400">
                            Supports PNG, JPG, WebP, GIF (Auto-optimized & Persisted)
                          </p>
                        </>
                      )}
                    </div>

                    {uploadError && (
                      <div className="p-2 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-[11px] flex items-center gap-2 text-left">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cover Main Content Area */}
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-8 pt-1 pb-5 sm:pb-7">
          {/* Top Row: Page Icon + Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            {/* Notion Page Icon Picker */}
            <div className="relative inline-block" ref={emojiPickerRef}>
              <button
                type="button"
                id="page-icon-button"
                onClick={() => {
                  setShowEmojiPicker((prev) => !prev);
                  setShowCoverPicker(false);
                }}
                className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-white/95 text-neutral-900 border border-white/40 shadow-xl backdrop-blur-md flex items-center justify-center text-2xl sm:text-4xl hover:scale-105 hover:shadow-2xl transition-all cursor-pointer select-none group"
                title="Click to customize page icon"
              >
                <span>{pageIcon}</span>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-neutral-900/80 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                  <Smile className="w-3 h-3" />
                </span>
              </button>

              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-[#1e1e24] rounded-2xl shadow-2xl border border-neutral-700/90 p-3.5 w-72 sm:w-80 text-white animate-in fade-in zoom-in-95 backdrop-blur-xl">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
                    <span className="font-bold text-neutral-200 text-xs">Choose Workspace Icon</span>
                    <button
                      type="button"
                      onClick={handleRandomIcon}
                      className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer"
                      title="Random icon"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>Random</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                      <div key={category}>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mb-1">
                          {category}
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setPageIcon(emoji);
                                setShowEmojiPicker(false);
                              }}
                              className={`w-9 h-9 rounded-xl hover:bg-neutral-800 flex items-center justify-center text-lg sm:text-xl transition cursor-pointer ${
                                pageIcon === emoji ? 'bg-blue-600/30 border border-blue-500/50' : ''
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions On Cover */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={onOpenEmailSync}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 active:scale-95 border border-white/25 text-white rounded-lg font-semibold text-xs backdrop-blur-md shadow-sm transition cursor-pointer"
              >
                <MailCheck className="w-3.5 h-3.5 text-blue-300" />
                <span>Fetch Updates</span>
              </button>

              <button
                type="button"
                onClick={onOpenNewModal}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg font-semibold text-xs shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Job</span>
              </button>
            </div>
          </div>

          {/* Page Title & Subtitle On Cover */}
          <div className="mb-4 sm:mb-5 max-w-3xl">
            <input
              type="text"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              className="w-full text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white bg-transparent border-none outline-none focus:ring-0 placeholder-white/40 drop-shadow-sm font-sans"
              placeholder="Untitled"
            />
            <p className="text-[11px] sm:text-xs md:text-sm text-white/85 mt-0.5 font-medium leading-relaxed drop-shadow-xs">
              Track job applications, tailored CVs, interview stages, and auto-sync updates from Gmail & Indeed.
            </p>
          </div>

          {/* Frosted Glass Callout & Key Pipeline Metrics Bar On Cover */}
          <div className="bg-black/35 backdrop-blur-md border border-white/20 rounded-xl p-3 sm:p-3.5 text-xs text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
              {/* Quick Metrics Pills */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/15 backdrop-blur-sm transition">
                  <Layers className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span className="text-white/70 text-[11px]">Total:</span>
                  <span className="font-bold text-white text-xs sm:text-sm">{totalApps}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 px-2.5 sm:px-3 py-1.5 rounded-lg border border-purple-400/30 backdrop-blur-sm transition">
                  <Calendar className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                  <span className="text-purple-200 text-[11px] truncate">Interviews:</span>
                  <span className="font-bold text-purple-100 text-xs sm:text-sm">{interviewingCount}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 sm:px-3 py-1.5 rounded-lg border border-emerald-400/30 backdrop-blur-sm transition">
                  <Award className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span className="text-emerald-200 text-[11px]">Offers:</span>
                  <span className="font-bold text-emerald-100 text-xs sm:text-sm">{offersCount}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 px-2.5 sm:px-3 py-1.5 rounded-lg border border-blue-400/30 backdrop-blur-sm transition">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span className="text-blue-200 text-[11px] truncate">Response:</span>
                  <span className="font-bold text-blue-100 text-xs sm:text-sm">{responseRate}%</span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-white/80">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">Cloud Synced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
