import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "./ui/utils";

/** Dark-themed date picker matching the dashboard slate palette */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  className,
}: {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value + "T12:00:00") : undefined;
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
    day_selected:
      "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
    day_today: "bg-slate-600 text-slate-100 border border-slate-500",
    day_outside: "text-slate-500 opacity-50",
    day_disabled: "text-slate-600 opacity-50",
    day_hidden: "invisible",
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
          <CalendarIcon className="h-4 w-4 text-slate-400" />
          {value ? format(date!, "MM/dd/yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto p-0 border-slate-600 bg-slate-800"
      >
        <DayPicker
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          classNames={darkCalendarClassNames}
        />
        <div className="flex justify-between border-t border-slate-600 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(today);
              setOpen(false);
            }}
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
