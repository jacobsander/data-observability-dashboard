import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { CalendarRange } from "lucide-react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "./ui/utils";

export interface DateRangeValue {
  from: string;
  to: string;
}

/** Dark-themed date range picker matching the dashboard slate palette */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range",
  disabled,
  className,
}: {
  value: DateRangeValue | null;
  onChange: (range: DateRangeValue | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectionCount = useRef(0);
  const pendingStartRef = useRef<Date | null>(null);
  const handledByDayClickRef = useRef(false);

  useEffect(() => {
    if (open) {
      selectionCount.current = 0;
      pendingStartRef.current = null;
    }
  }, [open]);

  const selected: DateRange | undefined = value
    ? {
        from: new Date(value.from + "T12:00:00"),
        to: new Date(value.to + "T12:00:00"),
      }
    : undefined;
  const today = format(new Date(), "yyyy-MM-dd");

  const darkCalendarClassNames = {
    months: "flex flex-col sm:flex-row gap-2",
    month: "flex flex-col gap-4",
    caption: "flex justify-center pt-1 relative items-center w-full",
    caption_label: "text-sm font-medium text-slate-200",
    nav: "flex items-center gap-1",
    nav_button:
      "absolute size-7 inline-flex items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white p-0 opacity-70 hover:opacity-100",
    nav_button_previous: "left-1",
    nav_button_next: "right-1",
    table: "w-full border-collapse",
    head_row: "flex",
    head_cell: "text-slate-400 rounded-md w-8 font-normal text-[0.8rem]",
    row: "flex w-full mt-2",
    cell: "relative p-0 text-center text-sm [&:has([aria-selected])]:bg-slate-700 [&:has([aria-selected])]:rounded-md",
    day: "size-8 p-0 font-normal rounded-md text-slate-200 hover:bg-slate-700 hover:text-white aria-selected:opacity-100",
    day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white",
    day_range_start: "bg-blue-600 text-white rounded-l-md",
    day_range_end: "bg-blue-600 text-white rounded-r-md",
    day_range_middle: "bg-blue-600/50 text-white rounded-none",
    day_today: "bg-slate-600 text-slate-100 border border-slate-500",
    day_outside: "text-slate-500 opacity-50",
    day_disabled: "text-slate-600 opacity-50",
    day_hidden: "invisible",
  };

  const displayText = value
    ? `${format(selected!.from, "MM/dd/yyyy")} – ${format(selected!.to, "MM/dd/yyyy")}`
    : placeholder;

  const handleDayClick = (day: Date) => {
    selectionCount.current += 1;
    const isFirstClick = selectionCount.current === 1;
    const dayStr = format(day, "yyyy-MM-dd");

    if (isFirstClick) {
      // First click: always the start date, resets any existing range
      pendingStartRef.current = day;
      onChange({ from: dayStr, to: dayStr });
    } else {
      // Second click: end date
      const startDate = pendingStartRef.current ?? day;
      const startStr = format(startDate, "yyyy-MM-dd");
      const [from, to] =
        startStr <= dayStr ? [startStr, dayStr] : [dayStr, startStr];
      onChange({ from, to });
      setOpen(false);
    }
    handledByDayClickRef.current = true;
  };

  const handleSelect = (range: DateRange | undefined) => {
    // Ignore onSelect when we've already handled the click via onDayClick
    if (handledByDayClickRef.current) {
      handledByDayClickRef.current = false;
      return;
    }
    // Fallback for programmatic changes (e.g. "Last 7 days" button)
    if (!range?.from) return;
    const fromStr = format(range.from, "yyyy-MM-dd");
    const toStr = format(range.to ?? range.from, "yyyy-MM-dd");
    onChange({ from: fromStr, to: toStr });
  };

  const setLast7Days = () => {
    const end = new Date(today + "T12:00:00");
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    onChange({
      from: format(start, "yyyy-MM-dd"),
      to: today,
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-left text-sm text-white",
            "focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-slate-400",
            className
          )}
        >
          <CalendarRange className="h-4 w-4 text-slate-400" />
          {displayText}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto p-0 border-slate-600 bg-slate-800"
      >
        <DayPicker
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          onDayClick={handleDayClick}
          numberOfMonths={2}
          classNames={darkCalendarClassNames}
        />
        <div className="flex justify-between border-t border-slate-600 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={setLast7Days}
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            Last 7 days
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
