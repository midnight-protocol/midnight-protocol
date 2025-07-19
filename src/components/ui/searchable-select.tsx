import React, { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultOption?: { value: string; label: string };
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  defaultOption,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(lowerSearch) ||
        option.value.toLowerCase().includes(lowerSearch)
    );
  }, [options, searchTerm]);

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        onValueChange(val);
        setSearchTerm("");
        setIsOpen(false);
      }}
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        <div className="flex items-center px-3 pb-2 sticky top-0 bg-popover">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 w-full bg-transparent border-0 p-0 placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {defaultOption && (
            <>
              <SelectItem value={defaultOption.value}>
                {defaultOption.label}
              </SelectItem>
              <div className="h-px bg-border my-1" />
            </>
          )}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No models found
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};