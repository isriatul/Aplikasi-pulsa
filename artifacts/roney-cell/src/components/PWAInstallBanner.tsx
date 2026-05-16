import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    /* Hide if already running as installed PWA */
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const dismissed = sessionStorage.getItem("pwa_banner_dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      /* small delay so banner doesn't pop immediately */
      setTimeout(() => setVisible(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setVisible(false);
  }

  function handleDismiss() {
    sessionStorage.setItem("pwa_banner_dismissed", "1");
    setVisible(false);
  }

  if (!visible || installed) return null;

  return (
    <div
      className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-50"
      style={{ animation: "fadeSlideIn 0.35s ease" }}>
      <div
        className="rounded-2xl p-4 flex items-center gap-3 border border-blue-500/30"
        style={{
          background: "linear-gradient(135deg, rgba(29,78,216,0.95) 0%, rgba(124,58,237,0.95) 100%)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(59,130,246,0.4), 0 2px 8px rgba(0,0,0,0.4)",
        }}>
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center bg-white/15">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white leading-tight">Instal Aplikasi RoneyCell</p>
          <p className="text-[11px] text-blue-200 mt-0.5">Akses cepat, tanpa buka browser</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-blue-200 bg-white/10 hover:bg-white/20 transition-all">
            Nanti
          </button>
          <button
            onClick={handleInstall}
            className="px-4 py-2 rounded-xl text-xs font-black text-blue-700 bg-white hover:bg-blue-50 transition-all"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
            Instal
          </button>
        </div>
      </div>
    </div>
  );
}
