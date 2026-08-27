import { useEffect, useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateFieldITProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
  className?: string;
}

/** Converte "12/03/2027", "12032027", "12-3-27" in Date valida (o undefined). */
export function parseDateIT(raw: string): Date | undefined {
  const digits = raw.replace(/\D/g, "");
  let d: number, m: number, y: number;
  if (digits.length === 8) {
    d = Number(digits.slice(0, 2)); m = Number(digits.slice(2, 4)); y = Number(digits.slice(4, 8));
  } else if (digits.length === 6) {
    d = Number(digits.slice(0, 2)); m = Number(digits.slice(2, 4)); y = 2000 + Number(digits.slice(4, 6));
  } else {
    const parts = raw.split(/[^\d]+/).filter(Boolean);
    if (parts.length !== 3) return undefined;
    d = Number(parts[0]); m = Number(parts[1]); y = Number(parts[2]);
    if (y < 100) y += 2000;
  }
  if (!d || !m || !y || m > 12 || d > 31) return undefined;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return undefined;
  return date;
}

/**
 * Campo data italiano: si può DIGITARE (gg/mm/aaaa, anche solo cifre) oppure
 * scegliere dal calendario con tendine mese/anno.
 */
export function DateFieldIT({ value, onChange, placeholder = "gg/mm/aaaa", fromYear, toYear, className }: DateFieldITProps) {
  const [text, setText] = useState(value ? format(value, "dd/MM/yyyy") : "");
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    setText(value ? format(value, "dd/MM/yyyy") : "");
  }, [value]);

  const commit = (raw: string) => {
    if (!raw.trim()) { onChange(undefined); return; }
    const parsed = parseDateIT(raw);
    if (parsed) onChange(parsed);
    else setText(value ? format(value, "dd/MM/yyyy") : "");
  };

  const invalid = text.trim().length > 0 && !parseDateIT(text);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Input
        value={text}
        inputMode="numeric"
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(text); } }}
        className={cn("font-mono", invalid && "border-rose-500 focus-visible:ring-rose-500")}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="shrink-0" title="Apri calendario">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value}
            onSelect={(d) => { onChange(d ?? undefined); setOpen(false); }}
            locale={it}
            captionLayout="dropdown-buttons"
            fromYear={fromYear ?? currentYear - 30}
            toYear={toYear ?? currentYear + 30}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button type="button" variant="ghost" size="icon" className="shrink-0" title="Cancella data" onClick={() => onChange(undefined)}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
