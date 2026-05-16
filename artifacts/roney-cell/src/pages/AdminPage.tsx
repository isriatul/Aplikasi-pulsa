import { useState } from "react";
import { loadConfig, saveConfig } from "@/lib/config";
import {
  ALL_PRODUCTS,
  loadCustomPrices,
  saveCustomPrices,
  formatRupiah,
  CATEGORY_META,
  ProductCategory,
} from "@/lib/products";
import { getDailyReport, getWeeklyProfit, Transaction } from "@/lib/transactions";
import {
  loadMembers,
  addMember,
  updateMember,
  deleteMember,
  approveMember,
  rejectMember,
  transferBalance,
  Member,
  MemberStatus,
  MemberType,
  TYPE_LABELS,
  TYPE_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/members";

type AdminTab = "report" | "prices" | "members" | "settings";

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === loadConfig().adminPin) {
      onUnlock();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 0 30px rgba(124,58,237,0.4)" }}>
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="font-black text-xl text-foreground mb-1">Panel Owner</h2>
      <p className="text-sm text-muted-foreground mb-8 text-center">Masukkan PIN untuk akses panel owner</p>
      <form onSubmit={handleSubmit} className="w-full">
        <input type="password" inputMode="numeric" maxLength={8} value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="Masukkan PIN"
          className={`w-full px-4 py-4 rounded-xl text-center text-2xl tracking-[0.5em] font-bold
            bg-white/5 border transition-all duration-200 text-foreground mb-4 focus:outline-none focus:ring-1
            ${error ? "border-destructive/60 ring-destructive/40 bg-destructive/5" : "border-white/10 focus:border-purple-500/60 focus:ring-purple-500/40"}`}
        />
        {error && <p className="text-destructive text-sm text-center mb-4 font-semibold">PIN salah. Cuba lagi.</p>}
        <button type="submit" className="w-full py-4 rounded-xl font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}>
          Masuk
        </button>
      </form>
      <p className="text-xs text-muted-foreground mt-4">PIN lalai: 1234 (ubah di Tetapan)</p>
    </div>
  );
}

/* ─── REPORT ─── */
function ReportSection() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const report = getDailyReport(selectedDate);
  const weekly = getWeeklyProfit();
  const maxProfit = Math.max(...weekly.map((w) => w.profit), 1);

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4">
        <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">Pilih Tarikh</label>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={today}
          className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-purple-500/60 transition-all" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Jumlah Transaksi", value: report.count, sub: `${report.successCount} berjaya`, color: "#60A5FA" },
          { label: "Total Jualan", value: formatRupiah(report.totalSell), sub: "Harga jual", color: "#FBBF24" },
          { label: "Modal Keluar", value: formatRupiah(report.totalBase), sub: "Harga kos", color: "#F87171" },
          { label: "Keuntungan Bersih", value: formatRupiah(report.totalProfit), sub: "Profit hari ini", color: "#34D399" },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className="font-black text-lg leading-tight" style={{ color: item.color }}>{item.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-5">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-4">Grafik Keuntungan 7 Hari</p>
        <div className="flex items-end gap-2 h-28">
          {weekly.map((day) => {
            const height = maxProfit > 0 ? (day.profit / maxProfit) * 100 : 0;
            const isToday = day.date === today;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md transition-all duration-500 relative group"
                  style={{ height: `${Math.max(height, 4)}%`, background: isToday ? "linear-gradient(to top, #7C3AED, #A78BFA)" : "linear-gradient(to top, #1E3A5F, #2D5A8E)", minHeight: "4px", boxShadow: isToday ? "0 0 10px rgba(124,58,237,0.4)" : undefined }}>
                  {day.profit > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-muted-foreground hidden group-hover:block">{formatRupiah(day.profit)}</div>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground">{new Date(day.date).toLocaleDateString("id-ID", { weekday: "short" })}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-3">Riwayat Transaksi ({report.transactions.length})</p>
        {report.transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Tiada transaksi pada tarikh ini</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {report.transactions.map((txn: Transaction) => (
              <div key={txn.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-semibold text-foreground truncate">{txn.phone}</p>
                  <p className="text-xs text-muted-foreground truncate">{txn.product}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(txn.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold" style={{ color: txn.status === "success" ? "#34D399" : "#F87171" }}>
                    {txn.status === "success" ? `+${formatRupiah(txn.profit)}` : "GAGAL"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{formatRupiah(txn.sellPrice)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── PRICES ─── */
function PriceSection() {
  const [prices, setPrices] = useState<Record<string, { retail?: number; member?: number; reseller?: number }>>(() => loadCustomPrices());
  const [saved, setSaved] = useState(false);

  function handleChange(id: string, tier: "retail" | "member" | "reseller", val: string) {
    const num = Number(val.replace(/\D/g, ""));
    setPrices((prev) => ({ ...prev, [id]: { ...prev[id], [tier]: num } }));
  }

  function handleSave() {
    saveCustomPrices(prices);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/8">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Atur harga untuk 3 tier: <span className="text-foreground font-semibold">Retail</span> (umum),{" "}
          <span className="text-blue-300 font-semibold">Member</span> (grosir), dan{" "}
          <span className="text-yellow-300 font-semibold">Reseller</span> (harga terendah).
        </p>
      </div>

      {(["pulsa", "data", "pln", "game"] as ProductCategory[]).map((cat) => {
        const meta = CATEGORY_META[cat];
        const products = ALL_PRODUCTS.filter((p) => p.category === cat);
        return (
          <div key={cat} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{meta.icon}</span>
              <p className="font-bold text-foreground">{meta.label}</p>
            </div>
            <div className="space-y-4">
              {products.map((product) => {
                const c = prices[product.id] ?? {};
                return (
                  <div key={product.id} className="p-3 rounded-xl bg-white/3 border border-white/6">
                    <p className="text-sm font-semibold text-foreground mb-3">{product.name}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([["retail", "#94A3B8", product.price], ["member", "#60A5FA", product.memberPrice], ["reseller", "#FBBF24", product.resellerPrice]] as [string, string, number][]).map(([tier, color, def]) => (
                        <div key={tier}>
                          <p className="text-[10px] font-bold mb-1 tracking-wide" style={{ color }}>{tier.toUpperCase()}</p>
                          <div className="relative">
                            <input
                              type="number"
                              value={(c as Record<string, number>)[tier] ?? def}
                              onChange={(e) => handleChange(product.id, tier as "retail" | "member" | "reseller", e.target.value)}
                              className="w-full px-2 py-2 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-purple-500/60 transition-all text-center"
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground text-center mt-1">
                            +{formatRupiah(Math.max(0, ((c as Record<string, number>)[tier] ?? def) - product.basePrice))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button onClick={handleSave} className="w-full py-4 rounded-2xl font-bold text-white transition-all"
        style={saved
          ? { background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }
          : { background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }
        }>
        {saved ? "✓ Harga Disimpan!" : "Simpan Semua Harga"}
      </button>
    </div>
  );
}

/* ─── MEMBERS ─── */
type MemberView = "list" | "add" | "transfer";

function MembersSection({ onMemberChange }: { onMemberChange?: () => void }) {
  const [view, setView] = useState<MemberView>("list");
  const [members, setMembers] = useState<Member[]>(() => loadMembers());
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);
  const [filterStatus, setFilterStatus] = useState<MemberStatus | "all">("all");
  const [search, setSearch] = useState("");

  function refresh() { setMembers(loadMembers()); }

  function handleApprove(id: string) { approveMember(id); refresh(); onMemberChange?.(); }
  function handleReject(id: string) { rejectMember(id); refresh(); onMemberChange?.(); }
  function handleDelete(id: string) {
    if (confirm("Hapus member ini?")) { deleteMember(id); refresh(); }
  }
  function handleTypeChange(id: string, type: MemberType) {
    updateMember(id, { type });
    refresh();
  }

  const filtered = members.filter((m) => {
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.phone.includes(search)) return false;
    return true;
  });

  const pending = members.filter((m) => m.status === "pending").length;

  if (view === "add") return <AddMemberForm onDone={() => { refresh(); setView("list"); }} onBack={() => setView("list")} />;
  if (view === "transfer" && transferTarget) return (
    <TransferBalanceForm member={transferTarget} onDone={() => { refresh(); setView("list"); }} onBack={() => setView("list")} />
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-foreground">Daftar Member</p>
          <p className="text-xs text-muted-foreground">{members.length} total, {pending} menunggu</p>
        </div>
        <button onClick={() => setView("add")}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", color: "white" }}>
          + Tambah
        </button>
      </div>

      {/* Pending alert */}
      {pending > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/8">
          <div className="w-2 h-2 rounded-full bg-yellow-400 pulse-dot" />
          <p className="text-sm text-yellow-300 font-semibold">{pending} member menunggu persetujuan</p>
          <button onClick={() => setFilterStatus("pending")} className="ml-auto text-xs text-yellow-400 underline">Lihat</button>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / nomor..."
          className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/60 transition-all" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as MemberStatus | "all")}
          className="px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-foreground focus:outline-none transition-all">
          <option value="all">Semua</option>
          <option value="pending">Menunggu</option>
          <option value="approved">Diluluskan</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      {/* Member list */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm text-muted-foreground">Tiada member ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className="glass-card rounded-2xl p-4 border"
              style={{ borderColor: m.status === "pending" ? "#FBBF2440" : "rgba(255,255,255,0.06)" }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground">{m.name}</p>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ background: `${STATUS_COLORS[m.status]}20`, color: STATUS_COLORS[m.status] }}>
                      {STATUS_LABELS[m.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: TYPE_COLORS[m.type] }}>{TYPE_LABELS[m.type]}</p>
                  <p className="text-xs text-muted-foreground">{formatRupiah(m.balance)}</p>
                </div>
              </div>

              {/* Type selector */}
              {m.status === "approved" && (
                <div className="flex gap-1.5 mb-3">
                  {(["retail", "member", "reseller"] as MemberType[]).map((t) => (
                    <button key={t} onClick={() => handleTypeChange(m.id, t)}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                      style={m.type === t
                        ? { background: `${TYPE_COLORS[t]}20`, borderColor: `${TYPE_COLORS[t]}50`, color: TYPE_COLORS[t] }
                        : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }
                      }>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {m.status === "pending" && (
                  <>
                    <button onClick={() => handleApprove(m.id)} className="flex-1 py-2 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 transition-all hover:bg-emerald-500/25">✓ Setujui</button>
                    <button onClick={() => handleReject(m.id)} className="flex-1 py-2 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 transition-all hover:bg-red-500/25">✕ Tolak</button>
                  </>
                )}
                {m.status === "approved" && (
                  <button onClick={() => { setTransferTarget(m); setView("transfer"); }}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25 transition-all hover:bg-blue-500/25">
                    💸 Transfer Saldo
                  </button>
                )}
                <button onClick={() => handleDelete(m.id)} className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center text-xs transition-all hover:bg-red-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMemberForm({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", pin: "1234", type: "member" as MemberType, balance: "0", notes: "" });
  const [error, setError] = useState("");

  function handleChange(key: string, val: string) { setForm((f) => ({ ...f, [key]: val })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) { setError("Nama dan nomor HP diperlukan."); return; }
    const existing = loadMembers().find((m) => m.phone.replace(/\D/g, "") === form.phone.replace(/\D/g, ""));
    if (existing) { setError("Nomor HP sudah terdaftar."); return; }
    addMember({
      name: form.name,
      phone: form.phone,
      whatsapp: form.whatsapp || form.phone,
      pin: form.pin,
      type: form.type,
      status: "approved",
      balance: Number(form.balance),
      notes: form.notes,
      loginMethod: "phone",
      approvedAt: new Date().toISOString(),
    });
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="font-bold text-foreground">Tambah Member Manual</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: "name", label: "Nama Lengkap", placeholder: "Nama member", type: "text" },
          { key: "phone", label: "Nomor HP", placeholder: "08xxxxxxxxxx", type: "tel" },
          { key: "whatsapp", label: "WhatsApp (opsional)", placeholder: "Sama dengan HP", type: "tel" },
          { key: "pin", label: "PIN Awal", placeholder: "1234", type: "text" },
          { key: "balance", label: "Saldo Awal (Rp)", placeholder: "0", type: "number" },
          { key: "notes", label: "Catatan (opsional)", placeholder: "...", type: "text" },
        ].map((f) => (
          <div key={f.key} className="glass-card rounded-xl p-4">
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">{f.label}</label>
            <input type={f.type} value={(form as Record<string, string>)[f.key]}
              onChange={(e) => handleChange(f.key, f.type === "tel" ? e.target.value.replace(/\D/g, "") : e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/60 transition-all" />
          </div>
        ))}

        <div className="glass-card rounded-xl p-4">
          <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">Tipe Member</label>
          <div className="flex gap-2">
            {(["retail", "member", "reseller"] as MemberType[]).map((t) => (
              <button type="button" key={t} onClick={() => handleChange("type", t)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border"
                style={form.type === t
                  ? { background: `${TYPE_COLORS[t]}20`, borderColor: `${TYPE_COLORS[t]}50`, color: TYPE_COLORS[t] }
                  : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }
                }>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20"><p className="text-sm text-destructive font-medium">{error}</p></div>}

        <button type="submit" className="w-full py-4 rounded-2xl font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}>
          Tambah Member
        </button>
      </form>
    </div>
  );
}

function TransferBalanceForm({ member, onDone, onBack }: { member: Member; onDone: () => void; onBack: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const PRESETS = [10000, 25000, 50000, 100000, 200000, 500000];

  function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return;
    transferBalance(member.id, num);
    setDone(true);
    setTimeout(onDone, 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="font-bold text-foreground">Transfer Saldo</p>
      </div>

      {done ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4" style={{ boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-bold text-lg text-emerald-400">Transfer Berjaya!</p>
          <p className="text-sm text-muted-foreground mt-1">{formatRupiah(Number(amount))} dikirim ke {member.name}</p>
        </div>
      ) : (
        <>
          <div className="glass-card rounded-2xl p-4 border border-blue-500/20">
            <p className="text-xs text-muted-foreground mb-2">Transfer ke:</p>
            <p className="font-bold text-foreground">{member.name}</p>
            <p className="text-xs text-muted-foreground">{member.phone} · Saldo: {formatRupiah(member.balance)}</p>
          </div>

          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="glass-card rounded-2xl p-4">
              <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-3">Jumlah Transfer</label>
              <div className="relative mb-3">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Rp</span>
                <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="0"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 transition-all" />
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button type="button" key={p} onClick={() => setAmount(String(p))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                    style={Number(amount) === p
                      ? { borderColor: "#60A5FA", background: "rgba(59,130,246,0.1)", color: "#60A5FA" }
                      : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
                    }>
                    {formatRupiah(p)}
                  </button>
                ))}
              </div>
            </div>

            {Number(amount) > 0 && (
              <div className="px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                <p className="text-sm text-muted-foreground">Saldo setelah transfer:</p>
                <p className="text-lg font-black text-emerald-400">{formatRupiah(member.balance + Number(amount))}</p>
              </div>
            )}

            <button type="submit" disabled={!amount || Number(amount) <= 0}
              className="w-full py-4 rounded-2xl font-bold text-white transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}>
              Kirim {amount ? formatRupiah(Number(amount)) : "Saldo"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

/* ─── SETTINGS ─── */
function SettingsSection({ onLogout }: { onLogout: () => void }) {
  const [cfg, setCfg] = useState(loadConfig());
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const fields: { key: keyof typeof cfg; label: string; placeholder: string; type?: string }[] = [
    { key: "username", label: "Username Digiflazz", placeholder: "username digiflazz" },
    { key: "apiKey", label: "API Key Digiflazz", placeholder: "api key digiflazz", type: "password" },
    { key: "whatsappNumber", label: "WhatsApp Owner", placeholder: "081288080752" },
    { key: "gopayNumber", label: "Nomor GoPay", placeholder: "08xxxxxxxxxx" },
    { key: "gopayName", label: "Nama GoPay", placeholder: "Nama Anda" },
    { key: "danaNumber", label: "Nomor DANA", placeholder: "08xxxxxxxxxx" },
    { key: "danaName", label: "Nama DANA", placeholder: "Nama Anda" },
    { key: "bcaAccountNumber", label: "Rekening BCA", placeholder: "7255211277" },
    { key: "bcaAccountName", label: "Nama BCA", placeholder: "Isriatul Bahroni" },
    { key: "briAccountNumber", label: "Rekening BRI (opsional)", placeholder: "-" },
    { key: "briAccountName", label: "Nama BRI", placeholder: "Nama Anda" },
    { key: "adminPin", label: "PIN Admin", placeholder: "1234" },
  ];

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5 space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">{field.label}</label>
            <div className="relative">
              <input
                type={field.type === "password" && !showApiKey ? "password" : "text"}
                value={cfg[field.key] as string}
                onChange={(e) => setCfg({ ...cfg, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 transition-all"
              />
              {field.type === "password" && (
                <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={showApiKey ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      } />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => { saveConfig(cfg); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
        className="w-full py-4 rounded-2xl font-bold text-white transition-all"
        style={saved
          ? { background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }
          : { background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }
        }>
        {saved ? "✓ Tetapan Disimpan!" : "Simpan Tetapan"}
      </button>
      <button onClick={onLogout} className="w-full py-3 rounded-2xl font-semibold text-sm text-muted-foreground border border-white/10 hover:bg-white/5 transition-all">
        Log Keluar dari Panel Owner
      </button>
    </div>
  );
}

/* ─── MAIN ─── */
export default function AdminPage({ onMemberChange }: { onMemberChange?: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("report");

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: "report", label: "Laporan", icon: "📊" },
    { id: "prices", label: "Harga", icon: "💲" },
    { id: "members", label: "Member", icon: "👥" },
    { id: "settings", label: "Tetapan", icon: "⚙️" },
  ];

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-28">
      <div className="py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 0 16px rgba(124,58,237,0.3)" }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="font-black text-lg leading-none" style={{ color: "#A78BFA" }}>PANEL ADMIN</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest">AKSES OWNER SAHAJA</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-5 p-1 rounded-2xl bg-white/3 border border-white/6">
        {tabs.map((tab) => {
          const pendingCount = tab.id === "members" ? loadMembers().filter(m => m.status === "pending").length : 0;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative py-2 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1"
              style={activeTab === tab.id
                ? { background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", color: "white", boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }
                : { color: "rgba(255,255,255,0.4)" }
              }>
              <span>{tab.icon}</span>
              {tab.label}
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 text-gray-900 text-[9px] font-black flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "report" && <ReportSection />}
      {activeTab === "prices" && <PriceSection />}
      {activeTab === "members" && <MembersSection onMemberChange={onMemberChange} />}
      {activeTab === "settings" && <SettingsSection onLogout={() => setUnlocked(false)} />}
    </div>
  );
}
