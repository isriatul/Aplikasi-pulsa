import { useRef } from "react";
import { detectOperator, formatPhone } from "@/lib/operator";

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
}

export default function PhoneInput({ value, onChange }: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const operator = detectOperator(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw);
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-3">
        Nombor Telefon Pelanggan
      </label>

      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"
            />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          placeholder="Contoh: 08123456789"
          value={value}
          onChange={handleChange}
          maxLength={14}
          className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm font-medium tracking-wide
            bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40
            transition-all duration-200"
        />
      </div>

      <div className="mt-3 min-h-[28px] flex items-center">
        {operator ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{ backgroundColor: operator.bgColor, borderColor: operator.color + "40" }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: operator.color }} />
            <span className="operator-badge" style={{ color: operator.color }}>
              {operator.name} Terkesan
            </span>
          </div>
        ) : value.length >= 4 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <span className="operator-badge text-yellow-400">Operator Tidak Dikesan</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Masukkan nombor untuk mengesan operator automatik
          </p>
        )}
      </div>
    </div>
  );
}
