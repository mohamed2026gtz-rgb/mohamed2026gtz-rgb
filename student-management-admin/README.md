# Student Management Admin (Web)

React SPA matching the **mobile administration** experience — scoped staff and full admins use the same API with JWT.

## Requirements

- Node.js 18+
- `student-management-api` on port **5103**
- Login with an **administration** account (system admin, manager, admin, administrator, data entry staff, center, district, region, university)

**Users** tab is **full admin only** (system admin / manager).

## Development

```powershell
cd C:\Users\Mohamed\Desktop\MOBILEAPPFORFLUTTER\student-management-admin
npm install
copy .env.example .env
npm run dev
```

Open http://localhost:5173 (Vite proxies `/api` to the API).

### Access from another computer (same Wi‑Fi)

1. Start API on the server PC: `student-management-api\run.ps1`
2. Start admin with network access:
   ```powershell
   npm run dev -- --host
   ```
   Or production preview after build:
   ```powershell
   npm run build
   npm run preview
   ```
3. On the other device open `http://YOUR_PC_IP:5173` (dev) or `:4173` (preview).
4. The login page auto-uses `http://YOUR_PC_IP:5103` for the API. If login fails, edit **API server** on the sign-in form.
5. Allow Windows Firewall for ports **5103** and **5173** / **4173** if needed.

Do **not** set `VITE_API_BASE_URL` to a fixed IP unless the API runs on a different machine.

## Features (mobile parity)

| Area | Routes |
|------|--------|
| Dashboard | `/` — stats + exam attendance overview |
| Schools | `/schools` — region/level/search, link to students |
| Students | `/students` — scope filters, paginated list, detail + transcript |
| Photo lookup | `/students/photos` |
| Teachers | `/teachers` |
| Attendance | `/attendance` — exam session bulk mark/save |
| Exams | `/exams` — subjects + timetable tabs |
| Cheating | `/cheating`, `/cheating/new`, `/cheating/:id/edit` |
| Supervisors | `/supervisors` — list, form, assignments, center detail |
| Staff users | `/users` (full admin only) |
| Profile | `/profile` |

Scoped access (region/district/school level/school) is enforced the same way as mobile via `accessScope` on the logged-in user.

## Production build

```powershell
$env:VITE_API_BASE_URL="http://your-server:5103"
npm run build
```

Serve `dist/` and set API `CORS_ORIGIN` to your admin URL.