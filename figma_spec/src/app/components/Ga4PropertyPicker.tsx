import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { cn } from "./ui/utils";

export const GA4_PROPERTY_OPTIONS = [
  { value: "moomin_client", label: "Moomin" },
  { value: "moomin_server", label: "Moomin S2S" },
] as const;

export type Ga4PropertyValue = (typeof GA4_PROPERTY_OPTIONS)[number]["value"];

/** Multi-select for GA4 property filter (moomin_client, moomin_server). */
export function Ga4PropertyPicker({
  value,
  onChange,
  placeholder = "GA4 property",
  disabled,
  className,
}: {
  value: Ga4PropertyValue[];
  onChange: (selected: Ga4PropertyValue[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const displayText =
    value.length === 0
      ? placeholder
      : value.length === GA4_PROPERTY_OPTIONS.length
        ? "All"
        : value
            .map(
              (v) => GA4_PROPERTY_OPTIONS.find((o) => o.value === v)?.label ?? v
            )
            .join(", ");

  const toggle = (optionValue: Ga4PropertyValue) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    // Keep at least one selected
    if (next.length > 0) {
      onChange(next);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-foreground shadow-sm",
            "focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            value.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="text-muted-foreground text-sm shrink-0">GA4 property:</span>
          {displayText}
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 p-3 border border-border bg-card shadow-lg"
      >
        <p className="text-xs text-muted-foreground mb-2">Show data from</p>
        <div className="flex flex-col gap-2">
          {GA4_PROPERTY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5",
                "text-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Checkbox
                checked={value.includes(option.value)}
                onCheckedChange={() => toggle(option.value)}
                className="border-border data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
