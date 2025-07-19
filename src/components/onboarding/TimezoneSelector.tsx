import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
  className?: string;
}

// Common timezones organized by region
const TIMEZONES = {
  'North America': [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  ],
  'Europe': [
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris/Berlin (CET)' },
    { value: 'Europe/Istanbul', label: 'Istanbul (TRT)' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  ],
  'Asia': [
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Shanghai', label: 'China/Singapore (CST)' },
    { value: 'Asia/Tokyo', label: 'Japan/Korea (JST)' },
  ],
  'Pacific': [
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
    { value: 'Australia/Perth', label: 'Perth (AWST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZDT)' },
  ],
  'Other': [
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
    { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
    { value: 'America/Toronto', label: 'Toronto (EST)' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
  ],
};

export function TimezoneSelector({ value, onChange, className }: TimezoneSelectorProps) {
  // Try to detect user's timezone
  React.useEffect(() => {
    if (!value) {
      try {
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Check if detected timezone is in our list
        const isSupported = Object.values(TIMEZONES).some(region =>
          region.some(tz => tz.value === detectedTimezone)
        );
        if (isSupported) {
          onChange(detectedTimezone);
        } else {
          // Default to LA if not found
          onChange('America/Los_Angeles');
        }
      } catch (e) {
        // Fallback to LA
        onChange('America/Los_Angeles');
      }
    }
  }, [value, onChange]);

  return (
    <div className={className}>
      <Label htmlFor="timezone" className="text-terminal-green font-mono mb-2 block">
        Your Timezone
      </Label>
      <p className="text-terminal-text-muted text-sm mb-3 font-mono">
        Your agent will have conversations at midnight in your timezone
      </p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger 
          id="timezone"
          className="w-full bg-terminal-bg border-terminal-green/30 text-terminal-text font-mono"
        >
          <SelectValue placeholder="Select your timezone" />
        </SelectTrigger>
        <SelectContent className="bg-terminal-bg border-terminal-green/30">
          {Object.entries(TIMEZONES).map(([region, timezones]) => (
            <div key={region}>
              <div className="px-2 py-1.5 text-xs font-semibold text-terminal-green/70 font-mono">
                {region}
              </div>
              {timezones.map((tz) => (
                <SelectItem
                  key={tz.value}
                  value={tz.value}
                  className="text-terminal-text hover:bg-terminal-green/10 font-mono cursor-pointer"
                >
                  {tz.label}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <p className="text-terminal-text-muted text-xs mt-2 font-mono">
          Current time in {value}: {new Date().toLocaleString('en-US', { 
            timeZone: value, 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })}
        </p>
      )}
    </div>
  );
}