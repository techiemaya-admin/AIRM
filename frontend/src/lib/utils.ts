import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatHours(totalHours: number | null | undefined): string {
  if (totalHours === null || totalHours === undefined || isNaN(totalHours)) {
    return '0h 0m';
  }
  const isNegative = totalHours < 0;
  const absHours = Math.abs(totalHours);
  const totalMinutes = Math.round(absHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${isNegative ? '-' : ''}${hours}h ${minutes}m`;
}


