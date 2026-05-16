const LANG_KEY = "roneycell_lang";

export type Lang = "id" | "en";

export function getLang(): Lang {
  return (localStorage.getItem(LANG_KEY) as Lang) || "id";
}
export function setLang(l: Lang) {
  localStorage.setItem(LANG_KEY, l);
  window.dispatchEvent(new Event("roneycell_lang_change"));
}

const T: Record<string, Record<Lang, string>> = {
  /* Nav */
  nav_home:        { id: "Transaksi",       en: "Transaction" },
  nav_deposit:     { id: "Isi Saldo",       en: "Top Up" },
  nav_member:      { id: "Member",          en: "Member" },
  nav_owner:       { id: "Owner",           en: "Owner" },
  nav_help:        { id: "Bantuan",         en: "Help" },
  /* Home header */
  greeting:        { id: "Halo",            en: "Hi" },
  choose_service:  { id: "Pilih Layanan",   en: "Choose Service" },
  /* Phone input */
  phone_label:     { id: "Nomor Tujuan",    en: "Destination Number" },
  phone_hint:      { id: "Masukkan nomor untuk mendeteksi operator otomatis", en: "Enter number to auto-detect operator" },
  detected:        { id: "Terdeteksi",      en: "Detected" },
  not_detected:    { id: "Operator Tidak Terdeteksi", en: "Operator Not Detected" },
  /* Products */
  choose_product:  { id: "Pilih Nominal / Paket", en: "Select Denomination / Package" },
  products_count:  { id: "produk",          en: "products" },
  /* Order */
  order_summary:   { id: "Ringkasan Pesanan", en: "Order Summary" },
  sell_price:      { id: "Harga Jual",      en: "Sell Price" },
  balance_label:   { id: "Saldo",           en: "Balance" },
  /* Buttons */
  btn_process:     { id: "🔐 Masukkan PIN & Proses →", en: "🔐 Enter PIN & Process →" },
  btn_enter_phone: { id: "Masukkan Nomor Tujuan Dahulu", en: "Enter Destination Number First" },
  btn_choose_prod: { id: "Pilih Produk Dahulu", en: "Choose Product First" },
  btn_close:       { id: "Tutup ✕",         en: "Close ✕" },
  /* Balance card */
  active_balance:  { id: "Saldo Aktif",     en: "Active Balance" },
  synced:          { id: "Sync Otomatis",   en: "Auto Sync" },
  sync_info:       { id: "Diperbarui otomatis dari Google Sheets", en: "Auto-updated from Google Sheets" },
  /* Help */
  help_title:      { id: "Pusat Bantuan",   en: "Help Center" },
  help_subtitle:   { id: "Hubungi kami melalui:", en: "Contact us via:" },
  help_wa:         { id: "Chat WhatsApp",   en: "WhatsApp Chat" },
  help_wa_sub:     { id: "Respons cepat, aktif setiap hari", en: "Fast response, available daily" },
  help_email:      { id: "Kirim Email",     en: "Send Email" },
  help_email_sub:  { id: "Kami balas dalam 1×24 jam", en: "We reply within 24 hours" },
  /* Settings */
  language:        { id: "Bahasa",          en: "Language" },
  /* Status */
  pending_approval:{ id: "Menunggu persetujuan admin", en: "Awaiting admin approval" },
  powered_by:      { id: "Dikuasakan oleh", en: "Powered by" },
};

export function t(key: string, lang?: Lang): string {
  const l = lang ?? getLang();
  return T[key]?.[l] ?? T[key]?.["id"] ?? key;
}
