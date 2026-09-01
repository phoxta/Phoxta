import { CVTemplateId, CVTemplateInfo, CVThemeSettings } from '../types';

export const DEFAULT_CV_THEME: CVThemeSettings = {
  fontFamily: 'Inter',
  primaryColor: '#2563eb',
  fontScale: 'standard',
  lineHeight: 'normal',
  marginSize: 'normal',
  headerLayout: 'centered',
  showSectionDividers: true,
  bulletStyle: 'disc',
};

export const CV_TEMPLATES: CVTemplateInfo[] = [
  {
    id: 'modern-executive',
    name: 'Modern Executive',
    badge: 'Popular',
    description: 'Clean high-contrast layout with royal blue section dividers and impactful bullet typography.',
    accentColor: '#2563eb',
    bestFor: 'Senior ICs, Tech Leads, Engineering Managers & Executives',
    defaultTheme: {
      fontFamily: 'Inter',
      primaryColor: '#2563eb',
      fontScale: 'standard',
      lineHeight: 'normal',
      marginSize: 'normal',
      headerLayout: 'centered',
      showSectionDividers: true,
      bulletStyle: 'disc',
    },
  },
  {
    id: 'minimalist-ats',
    name: 'Minimalist ATS',
    badge: '100% ATS Safe',
    description: 'Ultra-clean single column format optimized for Greenhouse, Lever, Workday & Taleo scanners.',
    accentColor: '#0f172a',
    bestFor: 'High-volume ATS submissions, Enterprise roles & Consulting',
    defaultTheme: {
      fontFamily: 'Calibri',
      primaryColor: '#0f172a',
      fontScale: 'standard',
      lineHeight: 'normal',
      marginSize: 'normal',
      headerLayout: 'left',
      showSectionDividers: true,
      bulletStyle: 'hyphen',
    },
  },
  {
    id: 'tech-engineer',
    name: 'Tech & Cloud Stack',
    badge: 'Engineering',
    description: 'Prominent technical skills matrix, GitHub repository highlights, and system architecture metrics.',
    accentColor: '#059669',
    bestFor: 'Full-Stack, DevOps, Cloud Architects, Backend & AI Engineers',
    defaultTheme: {
      fontFamily: 'JetBrains Mono',
      primaryColor: '#059669',
      fontScale: 'compact',
      lineHeight: 'normal',
      marginSize: 'narrow',
      headerLayout: 'split',
      showSectionDividers: true,
      bulletStyle: 'accent-dot',
    },
  },
  {
    id: 'contemporary',
    name: 'Contemporary Clean',
    badge: 'Sleek Design',
    description: 'Sophisticated typography, violet-indigo accents, and clear milestone summaries.',
    accentColor: '#7c3aed',
    bestFor: 'Product Managers, UX/UI Designers, Marketing & Startup roles',
    defaultTheme: {
      fontFamily: 'Outfit',
      primaryColor: '#7c3aed',
      fontScale: 'standard',
      lineHeight: 'relaxed',
      marginSize: 'normal',
      headerLayout: 'centered',
      showSectionDividers: true,
      bulletStyle: 'square',
    },
  },
  {
    id: 'compact-onepage',
    name: 'Compact 1-Pager',
    badge: 'High Density',
    description: 'Tight, balanced whitespace and multi-line skill tags to fit comprehensive experience onto one page.',
    accentColor: '#d97706',
    bestFor: 'Early career, career pivoters, or recruiters demanding a strict 1-page resume',
    defaultTheme: {
      fontFamily: 'Inter',
      primaryColor: '#d97706',
      fontScale: 'compact',
      lineHeight: 'tight',
      marginSize: 'narrow',
      headerLayout: 'centered',
      showSectionDividers: true,
      bulletStyle: 'disc',
    },
  },
];

export function getTemplateById(id?: CVTemplateId): CVTemplateInfo {
  return CV_TEMPLATES.find((t) => t.id === id) || CV_TEMPLATES[0];
}

export function resolveCVTheme(
  templateId?: CVTemplateId,
  customTheme?: Partial<CVThemeSettings>
): CVThemeSettings {
  const template = getTemplateById(templateId);
  return {
    ...DEFAULT_CV_THEME,
    ...(template.defaultTheme || {}),
    ...(customTheme || {}),
  };
}
