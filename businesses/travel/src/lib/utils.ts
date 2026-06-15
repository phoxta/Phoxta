import { clsx, type ClassValue } from 'clsx'
import { subDays } from 'date-fns'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const excludeDateIntervals = [{ start: subDays(new Date(), 5000), end: subDays(new Date(), 1) }]
