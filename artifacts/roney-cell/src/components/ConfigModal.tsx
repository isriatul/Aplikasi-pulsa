import { useState } from "react";

interface Config {
  username: string;
  apiKey: string;
}

interface ConfigModalProps {
  config: Config;
  onSave: (config: Config) => void;
  onClose: () => void;
}

export default function ConfigModal({ config, onSave, onClose }: ConfigModalProps) {
  const [username, setUsername] = useState(config.username);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [showKey, setShowKey] = useState(false);

  function handleSave() {
    onSave({ username: username.trim(), apiKey: apiKey.trim() });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 modal-backdrop"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md modal-content glass-card rounded-2xl p-6 border border-blue-500/20">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-foreground">Tetapan Digiflazz</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">
              Username Digiflazz
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username anda"
              className="w-full px-4 py-3 rounded-xl text-sm font-medium
                bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40
                transition-all duration-200"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">
              API Key Digiflazz
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Masukkan API key anda"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm font-medium
                  bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40
                  transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/15 mb-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Maklumat ini disimpan secara tempatan di browser anda sahaja. Pastikan anda menggunakan API key Digiflazz yang sah.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-semibold text-muted-foreground hover:bg-white/5 transition-all"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all gradient-blue text-white"
            style={{ boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
