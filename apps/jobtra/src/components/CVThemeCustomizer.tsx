import React from 'react';
import {
  Palette,
  Type,
  Maximize2,
  Sliders,
  AlignLeft,
  AlignCenter,
  Columns,
  RotateCcw,
  Sparkles,
  Check
} from 'lucide-react';
import { CVThemeSettings, CVTemplateId } from '../types';
import { resolveCVTheme, CV_TEMPLATES } from '../data/cvTemplates';

interface CVThemeCustomizerProps {
  templateId: CVTemplateId;
  themeSettings: CVThemeSettings;
  onChangeTheme: (newTheme: CVThemeSettings) => void;
  onResetDefault: () => void;
}

const COLOR_PRESETS = [
  { name: 'Royal Blue', hex: '#2563eb', class: 'bg-blue-600' },
  { name: 'Executive Navy', hex: '#1e293b', class: 'bg-slate-800' },
  { name: 'Emerald Tech', hex: '#059669', class: 'bg-emerald-600' },
  { name: 'Violet Modern', hex: '#7c3aed', class: 'bg-purple-600' },
  { name: 'Minimal Slate', hex: '#0f172a', class: 'bg-slate-900' },
  { name: 'Amber Density', hex: '#d97706', class: 'bg-amber-600' },
  { name: 'Crimson Elite', hex: '#be123c', class: 'bg-rose-700' },
  { name: 'Cyan Architecture', hex: '#0891b2', class: 'bg-cyan-600' },
];

const FONT_OPTIONS: Array<{ id: CVThemeSettings['fontFamily']; label: string; preview: string }> = [
  { id: 'Inter', label: 'Inter', preview: 'Modern Clean Sans' },
  { id: 'Calibri', label: 'Calibri', preview: 'Standard ATS Corporate' },
  { id: 'JetBrains Mono', label: 'JetBrains Mono', preview: 'Technical / Engineering' },
  { id: 'Merriweather', label: 'Merriweather', preview: 'Executive Serif' },
  { id: 'Garamond', label: 'Garamond', preview: 'Classic Editorial' },
  { id: 'Playfair', label: 'Playfair', preview: 'Display High-Contrast' },
  { id: 'Outfit', label: 'Outfit', preview: 'Geometric Contemporary' },
  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta', preview: 'Sleek Tech UI' },
];

export const CVThemeCustomizer: React.FC<CVThemeCustomizerProps> = ({
  templateId,
  themeSettings,
  onChangeTheme,
  onResetDefault,
}) => {
  return (
    <div className="space-y-4 text-xs text-neutral-700 bg-neutral-50/80 p-4 rounded-xl border border-neutral-200">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-neutral-900 text-xs">Styling & Theme Engine</span>
        </div>
        <button
          type="button"
          onClick={onResetDefault}
          className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-medium hover:underline"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to Template Default
        </button>
      </div>

      {/* 1. Accent Color */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-neutral-500" />
          Accent & Section Color
        </label>
        <div className="flex items-center flex-wrap gap-2 pt-0.5">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.hex}
              type="button"
              onClick={() => onChangeTheme({ ...themeSettings, primaryColor: preset.hex })}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${preset.class} ${
                themeSettings.primaryColor.toLowerCase() === preset.hex.toLowerCase()
                  ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110 shadow-xs'
                  : 'hover:scale-105 opacity-90'
              }`}
              title={preset.name}
            >
              {themeSettings.primaryColor.toLowerCase() === preset.hex.toLowerCase() && (
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
              )}
            </button>
          ))}
          {/* Custom color input */}
          <div className="flex items-center gap-1 pl-1">
            <input
              type="color"
              value={themeSettings.primaryColor}
              onChange={(e) => onChangeTheme({ ...themeSettings, primaryColor: e.target.value })}
              className="w-6 h-6 rounded-md border border-neutral-300 cursor-pointer"
              title="Custom Hex Color"
            />
            <span className="font-mono text-[10px] text-neutral-500">{themeSettings.primaryColor}</span>
          </div>
        </div>
      </div>

      {/* 2. Typography Font Family */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-neutral-500" />
          Typography Pair
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onChangeTheme({ ...themeSettings, fontFamily: f.id })}
              className={`p-2 rounded-lg border text-left transition ${
                themeSettings.fontFamily === f.id
                  ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-semibold ring-1 ring-blue-500 shadow-2xs'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-700'
              }`}
            >
              <div className="text-xs truncate">{f.label}</div>
              <div className="text-[10px] text-neutral-400 truncate">{f.preview}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Density, Margins & Line Heights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Font Scaling */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-neutral-600">Font Scale</label>
          <div className="flex bg-white rounded-lg border border-neutral-200 p-0.5">
            {(['compact', 'standard', 'relaxed'] as const).map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => onChangeTheme({ ...themeSettings, fontScale: scale })}
                className={`flex-1 py-1 text-[11px] rounded-md capitalize font-medium transition ${
                  themeSettings.fontScale === scale
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {scale}
              </button>
            ))}
          </div>
        </div>

        {/* Line Spacing */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-neutral-600">Line Spacing</label>
          <div className="flex bg-white rounded-lg border border-neutral-200 p-0.5">
            {(['tight', 'normal', 'relaxed'] as const).map((lh) => (
              <button
                key={lh}
                type="button"
                onClick={() => onChangeTheme({ ...themeSettings, lineHeight: lh })}
                className={`flex-1 py-1 text-[11px] rounded-md capitalize font-medium transition ${
                  themeSettings.lineHeight === lh
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {lh}
              </button>
            ))}
          </div>
        </div>

        {/* Page Margins */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-neutral-600">Page Margins</label>
          <div className="flex bg-white rounded-lg border border-neutral-200 p-0.5">
            {(['narrow', 'normal', 'wide'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChangeTheme({ ...themeSettings, marginSize: m })}
                className={`flex-1 py-1 text-[11px] rounded-md capitalize font-medium transition ${
                  themeSettings.marginSize === m
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Header Layout & Bullet Symbols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-neutral-200/80">
        {/* Header Layout */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-neutral-600">Header Alignment</label>
          <div className="flex bg-white rounded-lg border border-neutral-200 p-0.5">
            <button
              type="button"
              onClick={() => onChangeTheme({ ...themeSettings, headerLayout: 'left' })}
              className={`flex-1 py-1 text-[11px] rounded-md flex items-center justify-center gap-1 font-medium transition ${
                themeSettings.headerLayout === 'left'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <AlignLeft className="w-3 h-3" />
              Left
            </button>
            <button
              type="button"
              onClick={() => onChangeTheme({ ...themeSettings, headerLayout: 'centered' })}
              className={`flex-1 py-1 text-[11px] rounded-md flex items-center justify-center gap-1 font-medium transition ${
                themeSettings.headerLayout === 'centered'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <AlignCenter className="w-3 h-3" />
              Centered
            </button>
            <button
              type="button"
              onClick={() => onChangeTheme({ ...themeSettings, headerLayout: 'split' })}
              className={`flex-1 py-1 text-[11px] rounded-md flex items-center justify-center gap-1 font-medium transition ${
                themeSettings.headerLayout === 'split'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Columns className="w-3 h-3" />
              Split
            </button>
          </div>
        </div>

        {/* Bullet Style */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-neutral-600">Bullet Symbol</label>
          <div className="flex bg-white rounded-lg border border-neutral-200 p-0.5">
            {(
              [
                { id: 'disc', label: '• Circle' },
                { id: 'hyphen', label: '- Dash' },
                { id: 'square', label: '▪ Square' },
                { id: 'accent-dot', label: '◈ Accent' },
              ] as const
            ).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onChangeTheme({ ...themeSettings, bulletStyle: b.id })}
                className={`flex-1 py-1 text-[11px] rounded-md font-medium transition ${
                  themeSettings.bulletStyle === b.id
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
