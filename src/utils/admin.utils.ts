import { format } from 'date-fns';

export const formatDate = (date: string | Date): string => {
  return format(new Date(date), 'MMM d, yyyy');
};

export const formatDateTime = (date: string | Date): string => {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
};

export const getStoryScoreColor = (score: number): string => {
  if (score >= 0.8) return 'text-terminal-green';
  if (score >= 0.5) return 'text-terminal-yellow';
  return 'text-red-400';
};

export const getStoryScoreLabel = (score: number): string => {
  return `${Math.round(score * 100)}%`;
};