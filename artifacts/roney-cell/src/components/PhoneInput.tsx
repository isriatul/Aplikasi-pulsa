import { useRef } from "react";
import { detectOperator } from "@/lib/operator";

const COUNTRY_CODES = [
  { code: "+62",  flag: "🇮🇩", name: "Indonesia",    maxLen: 13 },
  { code: "+60",  flag: "🇲🇾", name: "Malaysia",     maxLen: 11 },
  { code: "+65",  flag: "🇸🇬", name: "Singapore",    maxLen: 10 },
  { code: "+66",  flag: "🇹🇭", name: "Thailand",     maxLen: 10 },
  { code: "+63",  flag: "🇵🇭", name: "Philippines",  maxLen: 11 },
  { code: "+84",  flag: "🇻🇳", name: "Vietnam",      maxLen: 10 },
  { code: "+95",  flag: "🇲🇲", name: "Myanmar",      maxLen: 10 },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh",   maxLen: 11 },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia", maxLen: 10 },
  { code: "+971", flag: "🇦🇪", name: "UAE",          maxLen: 9  },
  { code: "+91",  flag: "🇮🇳", name: "India",        maxLen: 11 },
  { code: "+92",  flag: "🇵🇰", name: "Pakistan",     maxLen: 11 },
  { code: "+1",   flag: "🇺🇸", name: "USA/Canada",   maxLen: 11 },
  { code: "+44",  flag: "🇬🇧", name: "UK",           maxLen: 11 },
  { code: "+61",  flag: "🇦🇺", name: "Australia",    maxLen: 10 },
  { code: "+81",  flag: "🇯🇵", name: "Japan",        maxLen: 11 },
  { code: "+82",  flag: "🇰🇷", name: "Korea",        maxLen: 11 },
  { code: "+86",  flag: "🇨🇳", name: "China",        maxLen: 12 },
  { code: "+49",  flag: "🇩🇪", name: "Germany",      maxLen: 12 },
];

export interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  label?: string;
  placeholder?: string;
  showCountryCode?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  countryCode = "+62",
  onCountryCodeChange,
  label = "Nomor Tujuan",
  placeholder = "08123456789",
  showCountryCode = true,
}: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0];
  const isIndonesian = countryCode === "+62";
  const operator = isIndonesian ? detectOperator(value) : null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw);
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-3">
        {label}
      </label>

      <div className={`flex gap-2 ${showCountryCode ? "" : ""}`}>
        {/* Country Code Selector */}
        {showCountryCode && (
          <div className="relative flex-shrink-0">
            <select
              value={countryCode}
              onChange={(e) => onCountryCodeChange?.(e.target.value)}
              className="h-full pl-2 pr-6 py-3.5 rounded-xl text-sm font-bold
                bg-white/5 border border-white/10 text-foreground
                focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40
                transition-all duration-200 appearance-none cursor-pointer"
              style={{ minWidth: "85px" }}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code} style={{ background: "#1a2035" }}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {/* Phone Number Input */}
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
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
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            maxLength={selectedCountry.maxLen}
            className="w-full pl-9 pr-3 py-3.5 rounded-xl text-sm font-medium tracking-wide
              bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40
              transition-all duration-200"
          />
        </div>
      </div>

      {/* Country name hint */}
      {showCountryCode && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{selectedCountry.flag}</span>
          <span className="text-xs text-muted-foreground">{selectedCountry.name}</span>
          {isIndonesian && value.length === 0 && (
            <span className="text-xs text-muted-foreground">· Masukkan nomor lokal (contoh: 0812...)</span>
          )}
        </div>
      )}

      {/* Operator Detection (Indonesia only) */}
      <div className="mt-2.5 min-h-[26px] flex items-center">
        {isIndonesian && operator ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{ backgroundColor: operator.bgColor, borderColor: operator.color + "40" }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: operator.color }} />
            <span className="operator-badge" style={{ color: operator.color }}>
              {operator.name} Terdeteksi ✓
            </span>
          </div>
        ) : isIndonesian && value.length >= 4 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <span className="operator-badge text-yellow-400">Operator Tidak Terdeteksi</span>
          </div>
        ) : !isIndonesian && value.length >= 4 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10">
            <span className="text-[11px] font-semibold text-blue-300">
              {COUNTRY_CODES.find(c => c.code === countryCode)?.flag} Nomor Internasional: {countryCode} {value}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {isIndonesian ? "Masukkan nomor untuk deteksi operator otomatis" : "Masukkan nomor tujuan"}
          </p>
        )}
      </div>
    </div>
  );
}

export { COUNTRY_CODES };
