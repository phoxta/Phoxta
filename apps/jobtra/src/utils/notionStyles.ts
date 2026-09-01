import { ApplicationStatus, JobSource, PriorityLevel, WorkType } from '../types';
import confetti from 'canvas-confetti';

export interface NotionTagStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export function getStatusStyle(status: ApplicationStatus): NotionTagStyle {
  switch (status) {
    case 'Wishlist':
      return {
        bg: 'bg-[#EBECED]',
        text: 'text-[#37352F]',
        border: 'border-[#D3D3D3]',
        dot: 'bg-[#9B9A97]',
      };
    case 'Applied':
      return {
        bg: 'bg-[#D3E5EF]',
        text: 'text-[#183B56]',
        border: 'border-[#B8D5E5]',
        dot: 'bg-[#2383E2]',
      };
    case 'Screening':
      return {
        bg: 'bg-[#FDECC8]',
        text: 'text-[#714D16]',
        border: 'border-[#F2DA9B]',
        dot: 'bg-[#D9730D]',
      };
    case 'Interviewing':
      return {
        bg: 'bg-[#E8DEEE]',
        text: 'text-[#49296A]',
        border: 'border-[#D5C2DF]',
        dot: 'bg-[#9065B0]',
      };
    case 'Offer':
      return {
        bg: 'bg-[#DBEDDB]',
        text: 'text-[#1C4D2E]',
        border: 'border-[#C2E0C2]',
        dot: 'bg-[#0F7B6C]',
      };
    case 'Rejected':
      return {
        bg: 'bg-[#FFE2DD]',
        text: 'text-[#5D1F1A]',
        border: 'border-[#F8C8C1]',
        dot: 'bg-[#EB5757]',
      };
    case 'Withdrawn':
      return {
        bg: 'bg-[#EEE0DA]',
        text: 'text-[#442A1E]',
        border: 'border-[#DDC6BD]',
        dot: 'bg-[#937264]',
      };
    default:
      return {
        bg: 'bg-[#EBECED]',
        text: 'text-[#37352F]',
        border: 'border-[#D3D3D3]',
        dot: 'bg-[#9B9A97]',
      };
  }
}

export function getSourceStyle(source: JobSource): { bg: string; text: string; iconBg: string } {
  switch (source) {
    case 'Indeed':
      return { bg: 'bg-[#E8F0FE]', text: 'text-[#1A73E8]', iconBg: 'bg-[#2164F3]' };
    case 'LinkedIn':
      return { bg: 'bg-[#E1F0F9]', text: 'text-[#0A66C2]', iconBg: 'bg-[#0A66C2]' };
    case 'Glassdoor':
      return { bg: 'bg-[#E8F5E9]', text: 'text-[#0CAA41]', iconBg: 'bg-[#0CAA41]' };
    case 'Referral':
      return { bg: 'bg-[#F3E8FD]', text: 'text-[#7B1FA2]', iconBg: 'bg-[#7B1FA2]' };
    case 'Company Site':
      return { bg: 'bg-[#FFF3E0]', text: 'text-[#E65100]', iconBg: 'bg-[#E65100]' };
    default:
      return { bg: 'bg-[#F1F3F4]', text: 'text-[#5F6368]', iconBg: 'bg-[#5F6368]' };
  }
}

export function getPriorityStyle(priority: PriorityLevel): { bg: string; text: string; dot: string } {
  switch (priority) {
    case 'High':
      return { bg: 'bg-[#FFE2DD]', text: 'text-[#D44C47]', dot: 'bg-[#EB5757]' };
    case 'Medium':
      return { bg: 'bg-[#FDECC8]', text: 'text-[#D9730D]', dot: 'bg-[#F2994A]' };
    case 'Low':
      return { bg: 'bg-[#EBECED]', text: 'text-[#787774]', dot: 'bg-[#9B9A97]' };
  }
}

export function triggerOfferConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#0F7B6C', '#2383E2', '#D9730D', '#9065B0', '#E03E3E'],
  });
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}
