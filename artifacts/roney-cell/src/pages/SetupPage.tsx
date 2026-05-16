import { useState } from "react";
import { saveConfig } from "@/lib/config";
import { pingScript } from "@/lib/sheetsApi";

/* ─────────────────────────────────────────────────────────
   CATATAN PENTING:
   Semua request dari app ke Apps Script menggunakan GET
   (bukan POST), karena Apps Script melakukan redirect 302
   yang menyebabkan body POST hilang di browser.
   Kode di bawah menangani SEMUA aksi lewat doGet().
───────────────────────────────────────────────────────── */
const APPS_SCRIPT_CODE = `// ╔══════════════════════════════════════════════════════════════╗
// ║       RoneyCell — Google Apps Script API v4 (FINAL)          ║
// ╠══════════════════════════════════════════════════════════════╣
// ║  CARA DEPLOY YANG BENAR:                                     ║
// ║  1. Buka spreadsheet kamu di Google Sheets                   ║
// ║  2. Klik Extensions > Apps Script                            ║
// ║  3. Hapus semua kode lama, tempel kode ini                   ║
// ║  4. Ctrl+S untuk simpan                                      ║
// ║  5. Deploy > New deployment > Web app                        ║
// ║  6. Execute as: Me  |  Who has access: Anyone                ║
// ╚══════════════════════════════════════════════════════════════╝

const SS_ID    = "1M5aMxf1buxk8_HKBDml39uwdMdbRK-Pi4JqqsTycXJ8";
const U_SHEET  = "Users";
const T_SHEET  = "Transactions";
const ADMIN_HP = "081288080752";

function sha256(str) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return raw.map(b => ("0" + (b & 0xFF).toString(16)).slice(-2)).join("");
}
function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// PENTING: gunakan getActiveSpreadsheet() agar data masuk ke spreadsheet yang benar
// (spreadsheet tempat script ini dibuka dari Extensions > Apps Script)
function getSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch(e) {}
  return SpreadsheetApp.openById(SS_ID);
}
function getSheet(name) { return getSpreadsheet().getSheetByName(name); }

function ensureSheets() {
  const ss = getSpreadsheet();
  if (!ss.getSheetByName(U_SHEET)) {
    const s = ss.insertSheet(U_SHEET);
    s.appendRow(["ID","Nama","Phone","Email","Password","TxPIN","Role","Status","Saldo","Type","LoginMethod","DaftarPada"]);
    s.setFrozenRows(1);
  }
  if (!ss.getSheetByName(T_SHEET)) {
    const s = ss.insertSheet(T_SHEET);
    s.appendRow(["RefID","Phone","Produk","Kategori","Harga","HargaDasar","Profit","Status","Tanggal","Catatan"]);
    s.setFrozenRows(1);
  }
}

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
    if (String(rows[i][0]) === String(id)) return { row: i + 1, data: rows[i] };
  return null;
}
function toUser(d) {
  return { id:String(d[0]), name:String(d[1]), phone:String(d[2]), email:String(d[3]),
           role:String(d[6]), status:String(d[7]), balance:Number(d[8]),
           type:String(d[9]), loginMethod:String(d[10]), createdAt:String(d[11]) };
}

function doGet(e) {
  try {
    ensureSheets();
    const p = e.parameter, a = p.action || "";
    if (a === "ping")           return respond({ ok:true, ts:new Date().toISOString() });
    if (a === "debug")          return handleDebug();
    if (a === "login")          return handleLogin(p);
    if (a === "register")       return handleRegister(p);
    if (a === "getBalance")     return handleGetBalance(p);
    if (a === "updateBalance")  return handleUpdateBalance(p);
    if (a === "addTransaction") return handleAddTxn(p);
    if (a === "refund")         return handleRefund(p);
    if (a === "getTransactions")return handleGetTxns(p);
    if (a === "verifyTxPin")    return handleVerifyPin(p);
    return respond({ ok:false, message:"Unknown action: " + a });
  } catch(err) { return respond({ ok:false, message:String(err.message||err) }); }
}
function doPost(e) {
  try {
    ensureSheets();
    let p = Object.assign({}, e.parameter);
    if (e.postData && e.postData.contents) try { Object.assign(p, JSON.parse(e.postData.contents)); } catch(x) {}
    return doGet({ parameter: p });
  } catch(err) { return respond({ ok:false, message:String(err.message||err) }); }
}

/* ── Handler: Debug ─────────────────────────────── */

function handleDebug() {
  const ss = getSpreadsheet();
  const sheets = ss ? ss.getSheets().map(function(s) { return s.getName(); }) : [];
  const uSheet = getSheet(U_SHEET);
  const rows = uSheet ? uSheet.getDataRange().getValues() : [];
  return respond({
    ok: true,
    spreadsheetId: ss ? ss.getId() : null,
    spreadsheetName: ss ? ss.getName() : null,
    sheets: sheets,
    userRows: Math.max(0, rows.length - 1)
  });
}

/* ── Handler: Login ─────────────────────────────── */

function handleLogin(p) {
  let found;

  if (p.method === "email") {
    if (!p.email) return respond({ ok: false, message: "Email diperlukan." });
    found = findByEmail(p.email);
    if (!found) return respond({ ok: false, message: "Email tidak terdaftar." });
  } else {
    const cp = String(p.phone || "").replace(/\\D/g, "");
    if (!cp) return respond({ ok: false, message: "Nomor HP diperlukan." });
    const isAdmin = cp === ADMIN_HP.replace(/\\D/g, "");
    found = findByPhone(cp);

    // Auto-buat akun admin saat login pertama
    // FIX: setelah appendRow, gunakan SpreadsheetApp.flush() agar data
    // langsung tersimpan sebelum dibaca kembali (menghindari cache issue)
    if (!found && isAdmin) {
      const adminId = "USR" + Date.now();
      const adminCreated = new Date().toISOString();
      getSheet(U_SHEET).appendRow([
        adminId, "Admin RoneyCell", ADMIN_HP, "",
        p.passwordHash, sha256("123456"),
        "admin", "active", 0, "member", "phone", adminCreated
      ]);
      SpreadsheetApp.flush();
      found = findByPhone(ADMIN_HP);
      // Fallback: bangun objek langsung jika masih tidak ditemukan
      if (!found) {
        return respond({ ok: true, user: {
          id: adminId, name: "Admin RoneyCell", phone: ADMIN_HP, email: "",
          role: "admin", status: "active", balance: 0,
          type: "member", loginMethod: "phone", createdAt: adminCreated
        }});
      }
    }
    if (!found) return respond({ ok: false, message: "Nomor HP tidak terdaftar." });
  }

  // Bandingkan hash (React sudah hash sebelum kirim)
  if (String(found.data[4]) !== String(p.passwordHash))
    return respond({ ok: false, message: "Password salah." });

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
      return respond({ ok: false, message: "Akun menunggu persetujuan admin." });
    return respond({ ok: false, message: "Akun ditolak. Hubungi admin." });
  }

  return respond({ ok: true, user });
}

/* ── Handler: Register ──────────────────────────── */

function handleRegister(p) {
  const method = p.loginMethod || "phone";
  const phone  = p.phone ? String(p.phone).replace(/\\D/g,"") : "";
  const email  = p.email || "";
  const name   = p.name  || "Pengguna";

  if (phone && findByPhone(phone))
    return respond({ ok: false, message: "Nomor HP sudah terdaftar." });
  if (email && email !== "" && findByEmail(email))
    return respond({ ok: false, message: "Email sudah terdaftar." });

  const isAdmin = phone === ADMIN_HP.replace(/\\D/g,"");
  const status  = (isAdmin || method === "email" || method === "facebook")
                  ? "active" : "pending";
  const role    = isAdmin ? "admin" : "member";
  const txPin   = p.txPinHash || sha256("123456");
  const id      = "USR" + Date.now();
  const created = new Date().toISOString();

  getSheet(U_SHEET).appendRow([
    id, name, phone, email,
    p.passwordHash || "", txPin,
    role, status, 0, "member", method, created
  ]);
  // FIX: jangan re-read dari sheet setelah appendRow (Apps Script cache bug).
  // Bangun objek user langsung dari data yang sudah diketahui.
  const user = {
    id: id, name: name, phone: phone, email: email,
    role: isAdmin ? "admin" : role,
    status: isAdmin ? "active" : status,
    balance: 0, type: "member", loginMethod: method, createdAt: created
  };

  return respond({
    ok: true, user,
    message: status === "pending"
      ? "Pendaftaran berhasil! Menunggu persetujuan admin."
      : "Akun berhasil dibuat!"
  });
}

/* ── Handler: Balance ───────────────────────────── */

function handleGetBalance(p) {
  const row = (p.userId ? findById(p.userId) : null)
           || (p.phone  ? findByPhone(p.phone) : null);
  if (!row) return respond({ ok: false, message: "User tidak ditemukan." });
  return respond({ ok: true, balance: Number(row.data[8]) });
}

function handleUpdateBalance(p) {
  const row = (p.userId ? findById(p.userId) : null)
           || (p.phone  ? findByPhone(p.phone) : null);
  if (!row) return respond({ ok: false, message: "User tidak ditemukan." });
  const sh      = getSheet(U_SHEET);
  const current = Number(row.data[8]);
  const newBal  = current + Number(p.delta);
  sh.getRange(row.row, 9).setValue(newBal);
  return respond({ ok: true, balance: newBal });
}

/* ── Handler: Transactions ──────────────────────── */

function handleAddTxn(p) {
  getSheet(T_SHEET).appendRow([
    p.refId, p.phone, p.product, p.category,
    Number(p.amount), Number(p.basePrice), Number(p.profit),
    p.status, p.date, p.note || ""
  ]);
  return respond({ ok: true });
}

function handleRefund(p) {
  // Kembalikan saldo
  const row = (p.userId ? findById(p.userId) : null)
           || (p.phone  ? findByPhone(p.phone) : null);
  if (row) {
    const sh = getSheet(U_SHEET);
    sh.getRange(row.row, 9).setValue(Number(row.data[8]) + Number(p.amount));
  }
  // Update status transaksi
  const tsh  = getSheet(T_SHEET);
  const rows = tsh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.refId)) {
      tsh.getRange(i + 1, 8).setValue("refunded"); break;
    }
  }
  return respond({ ok: true });
}

function handleGetTxns(p) {
  const phone = String(p.phone || "").replace(/\\D/g,"");
  const limit = Number(p.limit || 20);
  const rows  = getSheet(T_SHEET).getDataRange().getValues();
  const txns  = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]).replace(/\\D/g,"") === phone) {
      txns.push({
        refId: rows[i][0], phone: rows[i][1], product: rows[i][2],
        category: rows[i][3], amount: Number(rows[i][4]),
        basePrice: Number(rows[i][5]), profit: Number(rows[i][6]),
        status: rows[i][7], date: rows[i][8], note: rows[i][9]
      });
      if (txns.length >= limit) break;
    }
  }
  return respond({ ok: true, transactions: txns });
}

/* ── Handler: Verify PIN ────────────────────────── */

function handleVerifyPin(p) {
  const row = (p.userId ? findById(p.userId) : null)
           || (p.phone  ? findByPhone(p.phone) : null);
  if (!row) return respond({ ok: false, message: "User tidak ditemukan." });
  if (String(row.data[5]) !== String(p.pinHash))
    return respond({ ok: false, message: "PIN Transaksi salah." });
  return respond({ ok: true });
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
  const [testMsg, setTestMsg] = useState("");

  async function handleCopy() {
    await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleTest() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setTesting(true);
    setTestResult(null);
    setTestMsg("");
    saveConfig({ scriptsUrl: trimmed });
    try {
      const ok = await pingScript();
      setTestResult(ok ? "ok" : "fail");
      setTestMsg(ok ? "" : "Respons tidak valid. Pastikan kode Apps Script sudah di-paste dan di-deploy ulang.");
    } catch (err: unknown) {
      setTestResult("fail");
      setTestMsg(err instanceof Error ? err.message : "Tidak bisa terhubung.");
    }
    setTesting(false);
  }

  function handleSave() {
    saveConfig({ scriptsUrl: url.trim() });
    onDone();
  }

  return (
    <div className="min-h-dvh max-w-md mx-auto px-4 py-8 flex flex-col"
      style={{ background: "linear-gradient(160deg, hsl(220 45% 5%) 0%, hsl(230 50% 8%) 100%)" }}>

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
      <div className="flex items-center gap-3 mb-6">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
              style={step >= s
                ? { background: "linear-gradient(135deg,#3B82F6 0%,#6366F1 100%)", color: "white" }
                : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }
              }>
              {s < step ? "✓" : s}
            </div>
            <span className="text-xs font-semibold"
              style={{ color: step >= s ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)" }}>
              {s === 1 ? "Pasang Script" : "Masukkan URL"}
            </span>
            {s < 2 && <div className="flex-1 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="glass-card rounded-2xl p-4 border border-blue-500/20">
            <p className="text-sm font-black text-foreground mb-1">Langkah 1: Pasang kode ke Apps Script</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Buka spreadsheet → klik <b className="text-foreground/80">Extensions</b> → <b className="text-foreground/80">Apps Script</b> → hapus kode lama → tempel kode ini.
            </p>
          </div>

          <div className="space-y-2">
            {[
              "Buka Google Spreadsheet RoneyCell Anda",
              "Klik menu Extensions → Apps Script",
              "Hapus semua isi editor (Ctrl+A, Delete)",
              "Klik tombol 📋 Salin Kode di bawah, lalu tempel (Ctrl+V)",
              "Klik ikon Simpan (💾) atau tekan Ctrl+S",
              "Klik Deploy → New deployment",
              "Type: Web app · Execute as: Me · Access: Anyone",
              "Klik Deploy → Authorize → Copy the deployment URL",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white/3 border border-white/6">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: "rgba(99,102,241,0.3)", color: "#A78BFA" }}>
                  {i + 1}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* Code preview + copy */}
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                <span className="text-xs text-muted-foreground ml-1 font-mono">Code.gs — RoneyCell API v2</span>
              </div>
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                style={copied
                  ? { background: "rgba(52,211,153,0.2)", color: "#34D399" }
                  : { background: "rgba(99,102,241,0.2)", color: "#A78BFA" }
                }>
                {copied ? "✓ Tersalin!" : "📋 Salin Kode"}
              </button>
            </div>
            <div className="p-4 font-mono text-[10px] leading-relaxed text-green-300/80 max-h-48 overflow-y-auto"
              style={{ background: "rgba(0,0,0,0.5)" }}>
              <pre className="whitespace-pre-wrap">{`// RoneyCell Apps Script API v2
// Semua request melalui doGet()
// ─────────────────────────────
const SS_ID = "1WiFiPeRn7luGimAC53WTC4zgR4Oc4_0gZ-mVi0J0-J8";
const ADMIN_HP = "081288080752";
// ... (klik Salin Kode untuk kode lengkap)`}</pre>
            </div>
          </div>

          <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20">
            <span className="text-base flex-shrink-0">⚠️</span>
            <p className="text-xs text-yellow-200/80 leading-relaxed">
              <b>Penting:</b> Jika sebelumnya sudah pernah deploy, Anda harus membuat <b>New deployment</b> (bukan "Manage deployments"). URL lama tidak akan menggunakan kode terbaru.
            </p>
          </div>

          <button onClick={() => setStep(2)}
            className="w-full py-4 rounded-2xl font-black text-base text-white mt-auto"
            style={{ background: "linear-gradient(135deg,#3B82F6 0%,#6366F1 100%)", boxShadow: "0 6px 20px rgba(59,130,246,0.35)" }}>
            Sudah Deploy → Lanjut ke Langkah 2 →
          </button>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="glass-card rounded-2xl p-4 border border-blue-500/20">
            <p className="text-sm font-black text-foreground mb-1">Langkah 2: Masukkan URL Deployment</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Setelah deploy, Google memberikan URL seperti:
              <span className="font-mono block mt-1.5 text-blue-300/80 text-[10px] break-all bg-black/30 px-2 py-1 rounded-lg">
                https://script.google.com/macros/s/AKfy...xxx/exec
              </span>
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">
              URL Apps Script Deployment
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setTestResult(null); setTestMsg(""); }}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full px-4 py-3.5 rounded-xl text-xs bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
            />
          </div>

          {testResult === "ok" && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <span className="text-base flex-shrink-0">✅</span>
              <div>
                <p className="text-xs text-emerald-300 font-bold">Koneksi berhasil!</p>
                <p className="text-[11px] text-emerald-200/70">Apps Script merespons dengan benar.</p>
              </div>
            </div>
          )}
          {testResult === "fail" && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25">
              <span className="text-base flex-shrink-0">⚠️</span>
              <div>
                <p className="text-xs text-red-300 font-bold">Koneksi gagal</p>
                <p className="text-[11px] text-red-200/70 mt-0.5 leading-relaxed">
                  {testMsg || "Periksa: (1) URL sudah benar, (2) Who has access: Anyone, (3) Kode terbaru sudah di-deploy ulang."}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold border border-white/10 text-muted-foreground hover:bg-white/5 transition-all">
              ← Kembali
            </button>
            <button onClick={handleTest} disabled={!url.trim() || testing}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: "rgba(99,102,241,0.25)", color: "#A78BFA", border: "1px solid rgba(99,102,241,0.3)" }}>
              {testing ? "⏳ Testing..." : "🔌 Test Koneksi"}
            </button>
          </div>

          <button onClick={handleSave} disabled={!url.trim()}
            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#10B981 0%,#059669 100%)", boxShadow: "0 6px 20px rgba(16,185,129,0.35)" }}>
            ✅ Simpan & Mulai Aplikasi
          </button>

          <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
            URL disimpan lokal di browser Anda. Tidak ada data yang dikirim ke server pihak ketiga.
          </p>
        </div>
      )}
    </div>
  );
}
