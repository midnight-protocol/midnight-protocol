import React from 'react';
import { cn } from '@/lib/utils';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export const FadeIn = ({ 
  children, 
  className,
  delay = 0,
  duration = 300
}: FadeInProps) => {
  return (
    <div
      className={cn(
        "animate-in fade-in",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        animationFillMode: 'both'
      }}
    >
      {children}
    </div>
  );
};