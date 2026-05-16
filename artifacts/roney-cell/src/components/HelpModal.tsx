import { t, getLang } from "@/lib/i18n";

interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  const lang = getLang();

  function openWhatsApp() {
    window.open("https://wa.me/6281288080752", "_blank");
  }
  function openEmail() {
    window.open("mailto:Isriatulbahroni@gmail.com", "_blank");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 space-y-5"
        style={{ background: "hsl(220 40% 8%)", border: "1px solid rgba(100,160,255,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-xl text-foreground">{t("help_title", lang)}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t("help_subtitle", lang)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* WhatsApp */}
        <button
          onClick={openWhatsApp}
          className="w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 hover:scale-[1.01]"
          style={{ background: "rgba(37,211,102,0.08)", borderColor: "rgba(37,211,102,0.25)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: "rgba(37,211,102,0.15)", border: "1.5px solid rgba(37,211,102,0.3)" }}
          >
            💬
          </div>
          <div className="flex-1">
            <p className="font-black text-base" style={{ color: "#25D366" }}>{t("help_wa", lang)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("help_wa_sub", lang)}</p>
            <p className="text-xs font-bold mt-1.5" style={{ color: "#25D366" }}>+62 812-8808-0752</p>
          </div>
          <svg className="w-5 h-5 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Email */}
        <button
          onClick={openEmail}
          className="w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 hover:scale-[1.01]"
          style={{ background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.25)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: "rgba(99,102,241,0.15)", border: "1.5px solid rgba(99,102,241,0.3)" }}
          >
            ✉️
          </div>
          <div className="flex-1">
            <p className="font-black text-base" style={{ color: "#818CF8" }}>{t("help_email", lang)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("help_email_sub", lang)}</p>
            <p className="text-xs font-bold mt-1.5" style={{ color: "#818CF8" }}>Isriatulbahroni@gmail.com</p>
          </div>
          <svg className="w-5 h-5 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <p className="text-center text-xs text-muted-foreground">RoneyCell © 2025 · Isriatul Bahroni</p>
      </div>
    </div>
  );
}
