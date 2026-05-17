const LANG_KEY = "roneycell_lang";

export type Lang = "id" | "en" | "ms" | "ar";

export const LANG_OPTIONS: { code: Lang; flag: string; label: string; nativeLabel: string }[] = [
  { code: "id", flag: "🇮🇩", label: "Indonesian", nativeLabel: "Bahasa Indonesia" },
  { code: "en", flag: "🇬🇧", label: "English",    nativeLabel: "English" },
  { code: "ms", flag: "🇲🇾", label: "Malay",      nativeLabel: "Bahasa Melayu" },
  { code: "ar", flag: "🇸🇦", label: "Arabic",     nativeLabel: "العربية" },
];

export function getLang(): Lang {
  return (localStorage.getItem(LANG_KEY) as Lang) || "id";
}
export function setLang(l: Lang) {
  localStorage.setItem(LANG_KEY, l);
  window.dispatchEvent(new Event("roneycell_lang_change"));
}

const T: Record<string, Record<Lang, string>> = {
  /* Nav */
  nav_home:        { id: "Transaksi",        en: "Transaction",       ms: "Transaksi",          ar: "المعاملات" },
  nav_deposit:     { id: "Isi Saldo",        en: "Top Up",            ms: "Tambah Kredit",      ar: "إضافة رصيد" },
  nav_member:      { id: "Member",           en: "Member",            ms: "Ahli",               ar: "عضو" },
  nav_owner:       { id: "Owner",            en: "Owner",             ms: "Pemilik",            ar: "المالك" },
  nav_help:        { id: "Bantuan",          en: "Help",              ms: "Bantuan",            ar: "مساعدة" },
  /* Home header */
  greeting:        { id: "Halo",             en: "Hi",                ms: "Helo",               ar: "مرحبا" },
  choose_service:  { id: "Pilih Layanan",    en: "Choose Service",    ms: "Pilih Perkhidmatan", ar: "اختر الخدمة" },
  /* Phone input */
  phone_label:     { id: "Nomor Tujuan",     en: "Destination Number",ms: "Nombor Tujuan",      ar: "رقم المستلم" },
  phone_hint:      { id: "Masukkan nomor untuk mendeteksi operator otomatis", en: "Enter number to auto-detect operator", ms: "Masukkan nombor untuk kesan operator", ar: "أدخل الرقم للكشف التلقائي" },
  detected:        { id: "Terdeteksi",       en: "Detected",          ms: "Dikesan",            ar: "تم الكشف" },
  not_detected:    { id: "Operator Tidak Terdeteksi", en: "Operator Not Detected", ms: "Operator Tidak Dikesan", ar: "المشغل غير معروف" },
  /* Products */
  choose_product:  { id: "Pilih Nominal / Paket", en: "Select Denomination / Package", ms: "Pilih Nominal / Pakej", ar: "اختر الفئة / الباقة" },
  products_count:  { id: "produk",           en: "products",          ms: "produk",             ar: "منتجات" },
  /* Order */
  order_summary:   { id: "Ringkasan Pesanan",en: "Order Summary",     ms: "Ringkasan Pesanan",  ar: "ملخص الطلب" },
  sell_price:      { id: "Harga Jual",       en: "Sell Price",        ms: "Harga Jualan",       ar: "سعر البيع" },
  balance_label:   { id: "Saldo",            en: "Balance",           ms: "Baki",               ar: "الرصيد" },
  /* Buttons */
  btn_process:     { id: "🔐 Masukkan PIN & Proses →", en: "🔐 Enter PIN & Process →", ms: "🔐 Masukkan PIN & Proses →", ar: "🔐 أدخل الرقم السري →" },
  btn_enter_phone: { id: "Masukkan Nomor Tujuan Dahulu", en: "Enter Destination Number First", ms: "Masukkan Nombor Tujuan Dahulu", ar: "أدخل رقم المستلم أولاً" },
  btn_choose_prod: { id: "Pilih Produk Dahulu", en: "Choose Product First", ms: "Pilih Produk Dahulu", ar: "اختر المنتج أولاً" },
  btn_close:       { id: "Tutup ✕",          en: "Close ✕",           ms: "Tutup ✕",            ar: "إغلاق ✕" },
  /* Balance card */
  active_balance:  { id: "Saldo Aktif",      en: "Active Balance",    ms: "Baki Aktif",         ar: "الرصيد النشط" },
  synced:          { id: "Sync Otomatis",    en: "Auto Sync",         ms: "Segerak Otomatik",   ar: "مزامنة تلقائية" },
  sync_info:       { id: "Diperbarui otomatis dari Google Sheets", en: "Auto-updated from Google Sheets", ms: "Dikemas kini dari Google Sheets", ar: "محدث تلقائياً" },
  /* Help */
  help_title:      { id: "Pusat Bantuan",    en: "Help Center",       ms: "Pusat Bantuan",      ar: "مركز المساعدة" },
  help_subtitle:   { id: "Hubungi kami melalui:", en: "Contact us via:", ms: "Hubungi kami melalui:", ar: "تواصل معنا عبر:" },
  help_wa:         { id: "Chat WhatsApp",    en: "WhatsApp Chat",     ms: "Chat WhatsApp",      ar: "واتساب" },
  help_wa_sub:     { id: "Respons cepat, aktif setiap hari", en: "Fast response, available daily", ms: "Respon cepat, aktif setiap hari", ar: "استجابة سريعة كل يوم" },
  help_email:      { id: "Kirim Email",      en: "Send Email",        ms: "Hantar E-mel",       ar: "إرسال بريد إلكتروني" },
  help_email_sub:  { id: "Kami balas dalam 1×24 jam", en: "We reply within 24 hours", ms: "Kami balas dalam 1×24 jam", ar: "نرد خلال 24 ساعة" },
  /* Settings */
  language:        { id: "Bahasa",           en: "Language",          ms: "Bahasa",             ar: "اللغة" },
  /* Status */
  pending_approval:{ id: "Menunggu persetujuan admin", en: "Awaiting admin approval", ms: "Menunggu kelulusan admin", ar: "في انتظار موافقة المسؤول" },
  powered_by:      { id: "Dikuasakan oleh",  en: "Powered by",        ms: "Dikuasakan oleh",    ar: "مدعوم من" },
  /* Sidebar */
  sidebar_cs:      { id: "Customer Service", en: "Customer Service",  ms: "Perkhidmatan Pelanggan", ar: "خدمة العملاء" },
  sidebar_topup:   { id: "Tambah Saldo",     en: "Add Balance",       ms: "Tambah Kredit",      ar: "إضافة رصيد" },
  sidebar_history: { id: "Riwayat Transaksi",en: "Transaction History",ms:"Sejarah Transaksi",  ar: "سجل المعاملات" },
  sidebar_account: { id: "Akun Saya",        en: "My Account",        ms: "Akaun Saya",         ar: "حسابي" },
  sidebar_admin:   { id: "Panel Admin",      en: "Admin Panel",       ms: "Panel Admin",        ar: "لوحة المسؤول" },
  sidebar_help:    { id: "Bantuan",          en: "Help",              ms: "Bantuan",            ar: "مساعدة" },
  sidebar_lang:    { id: "Pilih Bahasa",     en: "Choose Language",   ms: "Pilih Bahasa",       ar: "اختر اللغة" },
};

export function t(key: string, lang?: Lang): string {
  const l = lang ?? getLang();
  return T[key]?.[l] ?? T[key]?.["id"] ?? key;
}
