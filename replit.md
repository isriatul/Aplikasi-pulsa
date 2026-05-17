# RoneyCell

Sistem jualan pulsa & PPOB professional berbasis web (PWA). Database utama: **PostgreSQL v2**. Google Sheets sudah di-deprecated — hanya tersimpan sebagai referensi backup.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — jalankan API server (port 8080)
- `pnpm --filter @workspace/roney-cell run dev` — jalankan frontend (port 21418)
- `pnpm run typecheck` — full typecheck semua packages
- `pnpm run build` — typecheck + build semua packages
- `pnpm --filter @workspace/db run push` — push DB schema ke PostgreSQL (dev only)
- `pnpm run typecheck:libs` — build composite libs (wajib sebelum typecheck api-server jika schema DB berubah)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React + Vite, Tailwind CSS, PWA mobile-first
- **API**: Express 5, pino logger
- **DB**: PostgreSQL + Drizzle ORM (lib/db)
- **Validation**: Zod, drizzle-zod
- **Auth**: JWT (access 8h) + refresh token (30 hari), bcrypt
- **Security**: helmet, CORS, rate-limit, requireRole middleware
- **Build**: esbuild (CJS bundle)

## Where things live

```
artifacts/
  api-server/src/
    routes/
      v2/           ← Endpoint baru (PostgreSQL)
        auth.ts     ← Register, login, refresh, logout, profile, change-pwd, forgot-pwd
        transactions.ts ← POST beli, GET history, GET detail, POST retry
        balance.ts  ← GET saldo, GET mutasi
        deposits.ts ← POST ajukan, GET riwayat
        admin/
          dashboard.ts   ← Statistik ringkasan
          users.ts       ← CRUD + suspend + topup + role
          products.ts    ← CRUD produk + provider
          transactions.ts ← All txs + reset pending + konfirmasi deposit
          audit.ts       ← Audit log
        monitoring.ts  ← Health check + provider status
      auth.ts      ← v1: tukar session GSheets → JWT
      digiflazz.ts ← v1: proxy ke Digiflazz API
      callback.ts  ← Webhook Digiflazz (signature verified)
    lib/
      v2/
        userService.ts    ← User CRUD, password hash, refresh token, reset token
        balanceService.ts ← Atomic debit/credit dengan row-level lock
        auditService.ts   ← Tulis dan baca audit log
        notificationService.ts ← Telegram / Discord / WhatsApp hooks
      jwt.ts       ← sign/verify JWT (support 4 role)
      env.ts       ← Validasi env startup + isAllowedAdminPhone()
      sanitize.ts  ← Strip field sensitif dari response
    middlewares/
      requireRole.ts  ← requireAuthV2, requireRole(minRole), requireAdminV2
      auth.ts         ← v1: requireAuth, requireAdmin
      rateLimiter.ts  ← globalLimiter, authLimiter, topupLimiter, readLimiter

  roney-cell/src/
    lib/
      apiV2.ts     ← Client API v2 (auto-refresh token, typed)
    components/admin/
      AdminDashboardV2.tsx ← Panel admin lengkap (dasbor, users, tx, deposit, audit, monitoring)
      StatCard.tsx
    pages/
      AdminPage.tsx ← Tab "Panel DB" → AdminDashboardV2 (lazy loaded)

lib/db/src/schema/
  users.ts            ← role: superadmin/admin/reseller/member, balance, status
  refreshTokens.ts    ← Token hash + TTL 30 hari
  transactions.ts     ← Status: pending/success/failed, category, sn
  balanceMutations.ts ← Setiap perubahan saldo tercatat (7 tipe mutasi)
  deposits.ts         ← QRIS/VA/transfer/manual, status lifecycle
  products.ts         ← Harga per role (base/member/reseller/admin)
  providers.ts        ← Status provider (digiflazz dll)
  auditLogs.ts        ← Semua aksi penting tercatat
  passwordResets.ts   ← Token reset hash + TTL 30 menit
  notifications.ts    ← Queue notif (telegram/discord/whatsapp)
```

## Architecture decisions

- **Dual backend**: v1 (Google Sheets via Apps Script) dan v2 (PostgreSQL) berjalan bersamaan. v1 tidak diubah agar tidak memutus layanan existing.
- **Prefix /api/v2/**: Semua endpoint baru di bawah prefix ini agar tidak ada konflik dengan v1.
- **Role hierarchy**: superadmin(4) > admin(3) > reseller(2) > member(1). `requireRole("admin")` otomatis mengizinkan superadmin juga.
- **Atomic balance**: Semua operasi saldo menggunakan `SELECT ... FOR UPDATE` di dalam transaksi DB untuk mencegah race condition dan saldo minus.
- **Refresh token rotation**: Setiap refresh menghasilkan token baru dan merevoke yang lama (one-time use).
- **Sanitize response**: Semua response Digiflazz di-strip field sensitif (username, sign, api_key) sebelum dikirim ke client.
- **Soft delete**: Users menggunakan `deleted_at` timestamp, bukan hapus fisik.

## Product

- Reseller pulsa/PPOB mobile-first PWA untuk pasar Lombok, Indonesia
- Kategori: Pulsa, Paket Data, PLN, Pascabayar, E-wallet, Game, TV, Voucher, International
- Auth via Google Sheets (v1) atau PostgreSQL (v2)
- Admin panel terintegrasi di tab "Panel DB" di halaman Owner

## User preferences

- Bahasa Indonesia untuk semua teks UI dan komentar kode
- Jangan ubah/hapus sistem Google Sheets yang sudah ada
- Semua fitur baru di prefix `/api/v2/` agar tidak konflik
- PIN admin default bisa diubah di halaman Tetapan
- Super admin: phone `081288080752`, pass `311296`

## Gotchas

- **Wajib** `pnpm run typecheck:libs` sebelum `typecheck` api-server jika ada perubahan di `lib/db/src/schema/`
- PORT api-server = 8080, frontend = 21418 — keduanya di-route via shared proxy di port 80
- Jangan gunakan `pnpm run dev` di root workspace — jalankan via workflow per artifact
- `zod` di api-server: import dari `"zod"` (bukan `"zod/v4"`). Di lib/db: `"zod/v4"` ✓
- Rate limit topup: 3 req/menit per IP — normal untuk production
- TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID + DISCORD_WEBHOOK_URL bersifat opsional (notif hanya aktif jika diset)

## Required Env (Secrets)

| Key | Wajib | Keterangan |
|-----|-------|------------|
| DATABASE_URL | ✅ | PostgreSQL connection string (auto-set oleh Replit DB) |
| SESSION_SECRET | ✅ | JWT signing secret |
| DIGIFLAZZ_USERNAME | ✅ | Username akun Digiflazz |
| DIGIFLAZZ_KEY | ✅ | API key Digiflazz |
| VITE_FONNTE_TOKEN | ⚪ | WhatsApp via Fonnte (opsional) |
| ADMIN_PHONES | ⚪ | Tambahan nomor admin, comma-separated |
| TELEGRAM_BOT_TOKEN | ⚪ | Notif Telegram (opsional) |
| TELEGRAM_CHAT_ID | ⚪ | Chat ID Telegram (opsional) |
| DISCORD_WEBHOOK_URL | ⚪ | Notif Discord (opsional) |
