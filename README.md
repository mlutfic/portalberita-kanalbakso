# portalberita-kanalbakso

## Setup Supabase

1. Buka Supabase Dashboard, masuk ke SQL Editor.
2. Jalankan isi file `supabase-schema.sql`.
3. Buka Project Settings > API, copy `anon public key`.
4. Tempel anon key ke `supabase-config.js`:

```js
window.KAB_SUPABASE_ANON_KEY = "ISI_ANON_KEY_DI_SINI";
```

Login admin awal:

- Username: `admin`
- Password: `kab2026`

Catatan: jangan menaruh password Postgres di file frontend. Website statis ini memakai anon key dan fungsi database Supabase agar password database tidak bocor.
