import { useState } from "react";
import { saveConfig } from "@/lib/config";
import { pingScript } from "@/lib/sheetsApi";

const APPS_SCRIPT_CODE = `// ╔══════════════════════════════════════════════════════════════╗
// ║          RoneyCell — Google Apps Script API                  ║
// ╠══════════════════════════════════════════════════════════════╣
// ║  Cara deploy:                                                ║
// ║  1. Buka spreadsheet → Extensions > Apps Script              ║
// ║  2. Hapus semua kode, tempel kode ini                        ║
// ║  3. Klik Deploy > New deployment > Web app                   ║
// ║  4. Execute as: Me  |  Who has access: Anyone                ║
// ║  5. Authorize → Copy URL → Paste di RoneyCell Setup          ║
// ╚══════════════════════════════════════════════════════════════╝

const SS_ID    = "1WiFiPeRn7luGimAC53WTC4zgR4Oc4_0gZ-mVi0J0-J8";
const U_SHEET  = "Users";
const T_SHEET  = "Transactions";
const ADMIN_HP = "081288080752";  // << HARDCODED ADMIN

/* ── Utilities ─────────────────────────────────── */

function sha256(str) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    str,
    Utilities.Charset.UTF_8
  );
  return raw.map(b => ("0" + (b & 0xFF).toString(16)).slice(-2)).join("");
}

function ok(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  return SpreadsheetApp.openById(SS_ID).getSheetByName(name);
}

function ensureSheets() {
  const ss = SpreadsheetApp.openById(SS_ID);
  if (!ss.getSheetByName(U_SHEET)) {
    const s = ss.insertSheet(U_SHEET);
    s.appendRow(["ID","Nama","Phone","Email","Password","TxPIN","Role",
                 "Status","Saldo","Type","LoginMethod","DaftarPada"]);
    s.setFrozenRows(1);
  }
  if (!ss.getSheetByName(T_SHEET)) {
    const s = ss.insertSheet(T_SHEET);
    s.appendRow(["RefID","Phone","Produk","Kategori","Harga","HargaDasar",
                 "Profit","Status","Tanggal","Catatan"]);
    s.setFrozenRows(1);
  }
}

/* ── Row finders ───────────────────────────────── */

function findByPhone(phone) {
  const c = String(phone).replace(/\\D/g, "");
  const rows = getSheet(U_SHEET).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++)
    if (String(rows[i][2]).replace(/\\D/g, "") === c) return { row: i + 1, data: rows[i] };
  return null;
}

function findByEmail(email) {
  const rows = getSheet(U_SHEET).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++)
    if (String(rows[i][3]).toLowerCase() === String(email).toLowerCase()) return { row: i + 1, data: rows[i] };
  return null;
}

function findById(id) {
  const rows = getSheet(U_SHEET).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++)
    if (rows[i][0] === id) return { row: i + 1, data: rows[i] };
  return null;
}

function toUser(d) {
  return { id: d[0], name: d[1], phone: d[2], email: d[3],
           role: d[6], status: d[7], balance: Number(d[8]),
           type: d[9], loginMethod: d[10], createdAt: d[11] };
}

/* ── doGet ─────────────────────────────────────── */

function doGet(e) {
  try {
    ensureSheets();
    const p = e.parameter;
    switch (p.action) {
      case "login":           return handleLogin(p);
      case "getBalance":      return handleGetBalance(p);
      case "getTransactions": return handleGetTxns(p);
      case "ping":            return ok({ ok: true, ts: new Date().toISOString() });
      default:                return ok({ ok: false, message: "Unknown: " + p.action });
    }
  } catch (err) { return ok({ ok: false, message: err.message }); }
}

/* ── doPost ────────────────────────────────────── */

function doPost(e) {
  try {
    ensureSheets();
    const b = JSON.parse(e.postData.contents);
    switch (b.action) {
      case "register":       return handleRegister(b);
      case "updateBalance":  return handleUpdateBalance(b);
      case "addTransaction": return handleAddTxn(b);
      case "refund":         return handleRefund(b);
      case "verifyTxPin":    return handleVerifyPin(b);
      default:               return ok({ ok: false, message: "Unknown: " + b.action });
    }
  } catch (err) { return ok({ ok: false, message: err.message }); }
}

/* ── Handler: Login ────────────────────────────── */

function handleLogin(p) {
  let found;
  if (p.method === "email") {
    if (!p.email) return ok({ ok: false, message: "Email diperlukan." });
    found = findByEmail(p.email);
  } else {
    const cp = String(p.phone || "").replace(/\\D/g, "");
    const isAdmin = cp === ADMIN_HP.replace(/\\D/g, "");
    found = findByPhone(cp);
    if (!found && isAdmin) {
      // Auto-create admin saat login pertama kali
      const sh = getSheet(U_SHEET);
      const id = "USR" + Date.now();
      sh.appendRow([id, "Admin RoneyCell", ADMIN_HP, "", p.passwordHash,
                    sha256("123456"), "admin", "active", 0,
                    "member", "phone", new Date().toISOString()]);
      found = findByPhone(ADMIN_HP);
    }
    if (!found) return ok({ ok: false, message: "Nomor HP tidak terdaftar." });
  }

  if (!found) return ok({ ok: false, message: "Akun tidak ditemukan." });

  // Bandingkan hash password
  if (String(found.data[4]) !== String(p.passwordHash))
    return ok({ ok: false, message: "Password salah." });

  const user = toUser(found.data);

  // Paksa admin untuk nomor hardcoded
  if (String(user.phone).replace(/\\D/g,"") === ADMIN_HP.replace(/\\D/g,"")) {
    user.role = "admin"; user.status = "active";
    const sh = getSheet(U_SHEET);
    sh.getRange(found.row, 7).setValue("admin");
    sh.getRange(found.row, 8).setValue("active");
  }

  if (user.status !== "active") {
    if (user.status === "pending")
      return ok({ ok: false, message: "Akun menunggu persetujuan admin." });
    return ok({ ok: false, message: "Akun ditolak. Hubungi admin." });
  }

  return ok({ ok: true, user });
}

/* ── Handler: Register ─────────────────────────── */

function handleRegister(b) {
  const method = b.loginMethod || "phone";
  const phone  = b.phone ? String(b.phone).replace(/\\D/g,"") : "";
  const email  = b.email || "";

  if (phone && findByPhone(phone))
    return ok({ ok: false, message: "Nomor HP sudah terdaftar." });
  if (email && email !== "" && findByEmail(email))
    return ok({ ok: false, message: "Email sudah terdaftar." });

  const isAdmin = phone === ADMIN_HP.replace(/\\D/g,"");
  const status  = (isAdmin || method === "email" || method === "facebook")
                  ? "active" : "pending";
  const role    = isAdmin ? "admin" : "member";
  const txPin   = b.txPinHash || sha256("123456");

  const sh = getSheet(U_SHEET);
  const id = "USR" + Date.now();
  sh.appendRow([id, b.name || "Pengguna", phone, email,
                b.passwordHash || "", txPin, role, status,
                0, "member", method, new Date().toISOString()]);

  const newRow = phone ? findByPhone(phone) : findByEmail(email);
  const user   = toUser(newRow.data);
  if (isAdmin) { user.role = "admin"; user.status = "active"; }

  return ok({
    ok: true, user,
    message: status === "pending"
      ? "Pendaftaran berhasil! Menunggu persetujuan admin."
      : "Akun berhasil dibuat!"
  });
}

/* ── Handler: Balance ──────────────────────────── */

function handleGetBalance(p) {
  const row = (p.userId ? findById(p.userId) : null)
           || (p.phone  ? findByPhone(p.phone) : null);
  if (!row) return ok({ ok: false, message: "User tidak ditemukan." });
  return ok({ ok: true, balance: Number(row.data[8]) });
}

function handleUpdateBalance(b) {
  const row = (b.userId ? findById(b.userId) : null)
           || (b.phone  ? findByPhone(b.phone)  : null);
  if (!row) return ok({ ok: false, message: "User tidak ditemukan." });
  const sh      = getSheet(U_SHEET);
  const current = Number(row.data[8]);
  const newBal  = current + Number(b.delta);
  sh.getRange(row.row, 9).setValue(newBal);
  return ok({ ok: true, balance: newBal });
}

/* ── Handler: Transactions ─────────────────────── */

function handleAddTxn(b) {
  getSheet(T_SHEET).appendRow([
    b.refId, b.phone, b.product, b.category,
    Number(b.amount), Number(b.basePrice), Number(b.profit),
    b.status, b.date, b.note || ""
  ]);
  return ok({ ok: true });
}

function handleRefund(b) {
  const row = (b.userId ? findById(b.userId) : null)
           || (b.phone  ? findByPhone(b.phone)  : null);
  if (row) {
    const sh = getSheet(U_SHEET);
    sh.getRange(row.row, 9).setValue(Number(row.data[8]) + Number(b.amount));
  }
  const tsh  = getSheet(T_SHEET);
  const rows = tsh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === b.refId) {
      tsh.getRange(i + 1, 8).setValue("refunded"); break;
    }
  }
  return ok({ ok: true });
}

function handleVerifyPin(b) {
  const row = (b.userId ? findById(b.userId) : null)
           || (b.phone  ? findByPhone(b.phone)  : null);
  if (!row) return ok({ ok: false, message: "User tidak ditemukan." });
  if (String(row.data[5]) !== String(b.pinHash))
    return ok({ ok: false, message: "PIN Transaksi salah." });
  return ok({ ok: true });
}

function handleGetTxns(p) {
  const phone = String(p.phone || "").replace(/\\D/g,"");
  const limit = Number(p.limit || 20);
  const rows  = getSheet(T_SHEET).getDataRange().getValues();
  const txns  = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]).replace(/\\D/g,"") === phone) {
      txns.push({ refId: rows[i][0], phone: rows[i][1], product: rows[i][2],
                  category: rows[i][3], amount: Number(rows[i][4]),
                  basePrice: Number(rows[i][5]), profit: Number(rows[i][6]),
                  status: rows[i][7], date: rows[i][8], note: rows[i][9] });
      if (txns.length >= limit) break;
    }
  }
  return ok({ ok: true, transactions: txns });
}`;

interface SetupPageProps {
  onDone: () => void;
}

export default function SetupPage({ onDone }: SetupPageProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  async function handleCopy() {
    await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleTest() {
    if (!url.trim()) return;
    setTesting(true);
    setTestResult(null);
    saveConfig({ scriptsUrl: url.trim() });
    const ok = await pingScript();
    setTestResult(ok ? "ok" : "fail");
    setTesting(false);
  }

  function handleSave() {
    saveConfig({ scriptsUrl: url.trim() });
    onDone();
  }

  return (
    <div className="min-h-dvh max-w-md mx-auto px-4 py-8 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#3B82F6 0%,#6366F1 100%)", boxShadow: "0 0 20px rgba(59,130,246,0.4)" }}>
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
          </svg>
        </div>
        <div>
          <h1 className="font-black text-xl leading-none"
            style={{ background: "linear-gradient(135deg,#60A5FA 0%,#A78BFA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            RoneyCell Setup
          </h1>
          <p className="text-[10px] text-muted-foreground tracking-widest">KONFIGURASI DATABASE</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-3 mb-6">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
              style={step >= s
                ? { background: "linear-gradient(135deg,#3B82F6 0%,#6366F1 100%)", color: "white" }
                : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }
              }
            >
              {s < step ? "✓" : s}
            </div>
            <span className="text-xs font-semibold" style={{ color: step >= s ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)" }}>
              {s === 1 ? "Pasang Script" : "Masukkan URL"}
            </span>
            {s < 2 && <div className="w-8 h-px bg-white/10 ml-1" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Show code ── */}
      {step === 1 && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="glass-card rounded-2xl p-4 border border-blue-500/20">
            <p className="text-sm font-black text-foreground mb-1">Langkah 1: Pasang kode ke Google Apps Script</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Buka Google Spreadsheet Anda → klik <span className="font-bold text-foreground/80">Extensions</span> → <span className="font-bold text-foreground/80">Apps Script</span> → hapus kode lama → tempel kode di bawah ini.
            </p>
          </div>

          {/* Steps detail */}
          <div className="space-y-2">
            {[
              { n: "1", text: "Buka spreadsheet RoneyCell Anda" },
              { n: "2", text: "Klik menu Extensions → Apps Script" },
              { n: "3", text: "Hapus semua isi editor, tempel kode di bawah" },
              { n: "4", text: "Klik tombol Simpan (ikon disk / Ctrl+S)" },
              { n: "5", text: "Klik Deploy → New deployment → Web app" },
              { n: "6", text: "Execute as: Me | Who has access: Anyone" },
              { n: "7", text: "Klik Deploy → Authorize → Copy URL" },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white/3 border border-white/6">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: "rgba(99,102,241,0.3)", color: "#A78BFA" }}>
                  {n}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* Code block */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                  <span className="text-xs text-muted-foreground ml-1 font-mono">Code.gs</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                  style={copied
                    ? { background: "rgba(52,211,153,0.2)", color: "#34D399" }
                    : { background: "rgba(99,102,241,0.2)", color: "#A78BFA" }
                  }
                >
                  {copied ? "✓ Tersalin!" : "📋 Salin Kode"}
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-64 font-mono text-[10px] leading-relaxed text-green-300/80"
                style={{ background: "rgba(0,0,0,0.4)" }}>
                <pre className="whitespace-pre-wrap break-words">{APPS_SCRIPT_CODE.slice(0, 800)}...</pre>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              Kode terlalu panjang untuk ditampilkan penuh — klik "Salin Kode" untuk mendapatkan kode lengkap
            </p>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-4 rounded-2xl font-black text-base text-white mt-auto"
            style={{ background: "linear-gradient(135deg,#3B82F6 0%,#6366F1 100%)", boxShadow: "0 6px 20px rgba(59,130,246,0.35)" }}
          >
            Sudah Deploy → Lanjut ke Langkah 2 →
          </button>
        </div>
      )}

      {/* ── Step 2: Enter URL ── */}
      {step === 2 && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="glass-card rounded-2xl p-4 border border-blue-500/20">
            <p className="text-sm font-black text-foreground mb-1">Langkah 2: Masukkan URL Deployment</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Setelah deploy berhasil, Google akan memberikan URL seperti:
              <span className="font-mono block mt-1 text-blue-300/80 text-[9px] break-all">
                https://script.google.com/macros/s/AKfy...xxx/exec
              </span>
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">
              URL Apps Script
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setTestResult(null); }}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono text-xs"
            />
          </div>

          {/* Test result */}
          {testResult === "ok" && (
            <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <p className="text-xs text-emerald-300 font-semibold">✅ Koneksi berhasil! URL valid.</p>
            </div>
          )}
          {testResult === "fail" && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25">
              <p className="text-xs text-red-300 font-semibold">⚠️ Tidak bisa terhubung. Periksa URL atau pastikan deployment sudah diakses oleh Anyone.</p>
            </div>
          )}

          <div className="flex gap-3 mt-auto">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold border border-white/10 text-muted-foreground hover:bg-white/5 transition-all"
            >
              ← Kembali
            </button>
            <button
              onClick={handleTest}
              disabled={!url.trim() || testing}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: "rgba(99,102,241,0.25)", color: "#A78BFA", border: "1px solid rgba(99,102,241,0.3)" }}
            >
              {testing ? "⏳ Testing..." : "🔌 Test Koneksi"}
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={!url.trim()}
            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#10B981 0%,#059669 100%)", boxShadow: "0 6px 20px rgba(16,185,129,0.35)" }}
          >
            ✅ Simpan & Mulai Aplikasi
          </button>
        </div>
      )}
    </div>
  );
}
