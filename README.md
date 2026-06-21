# Student Management System

Full-stack Student Management System for iOS and Android, connected to the **MySQL `Sneo_final`** database.

## Projects

| Folder | Stack |
|--------|-------|
| `student-management-api` | **Node.js + Express + MySQL** (REST API) |
| `student-management-mobile` | **React Native (Expo + TypeScript)** mobile app |
| `student-management-admin` | **React (Vite + TypeScript)** web admin SPA |
| `StudentManagementAPI` | *(legacy)* ASP.NET Core API — replaced by Node.js API |

## Quick start

### 1. Backend API (Node.js)

```powershell
cd student-management-api
npm install
copy .env.example .env
# Edit .env with your MySQL password
npm run dev
```

- Health: http://localhost:5103/health → `Healthy`
- Listens on `0.0.0.0:5103` for mobile emulator/device access

**`.env` settings:**

```env
PORT=5103
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=Sneo_final
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=YourSuperSecretKeyThatIsAtLeast32CharactersLong!
```

### 2. React Native mobile app

```powershell
cd student-management-mobile
npm install
npm start
```

Then press `a` for Android emulator or scan the QR code with Expo Go on a physical device.

**API URL (login → Server settings or Profile):**

Use the **host only** — do **not** add `/api` at the end.

| Target | Base URL |
|--------|----------|
| Android emulator | `http://10.0.2.2:5103` |
| iOS simulator / Windows | `http://localhost:5103` |
| Physical device | `http://<your-pc-ip>:5103` |

### 3. Login

Sign in with your **Laravel web app email and password** from the `users` table in Sneo_final (e.g. `admin@sneo.gov`).

### 4. Web admin (full admin only)

```powershell
cd student-management-admin
npm install
copy .env.example .env
npm run dev
```

Open http://localhost:5173 — dashboard + staff user management (`/api/users`). See `student-management-admin/README.md`.

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (email + password) |
| GET | `/api/auth/profile` | Current user |
| GET | `/api/students` | List students (paged, search) |
| GET | `/api/students/{studentNo}` | Student detail |
| GET | `/api/students/{studentNo}/transcript` | Student transcript |
| GET | `/api/schools` | Schools |
| GET | `/api/schools/{id}/classes` | School classes |
| GET | `/api/teachers` | Head teachers (paged) |
| GET | `/api/attendance` | Attendance |
| GET | `/api/dashboard/stats` | Dashboard stats |
| GET | `/api/users` | Staff users (full admin) |
| POST | `/api/users` | Create staff user |
| PUT | `/api/users/{id}` | Update staff user |
| GET | `/api/regions` | Regions |
| GET | `/api/regions/{id}/districts` | Districts by region |
| GET | `/health` | Health check |

## Mobile app features

- JWT authentication with persisted session
- Dashboard with student/teacher/school stats
- Student list, search, admin cross-school search by unique ID
- Student detail and transcript (enrollment history)
- Head teacher list and search
- Profile, API URL config, sign out
- Bottom tab navigation for iOS and Android

## Requirements

- Node.js 18+
- MySQL 8 with `Sneo_final` database running
- For Android: Android Studio + emulator, or Expo Go on device
- For iOS: macOS + Xcode, or Expo Go on device

## Production deployment (CI/CD)

**Start here (GitHub first, before MySQL):** [docs/GITHUB-SETUP.md](docs/GITHUB-SETUP.md)

**Full deploy guide (after MySQL + Render):** [docs/DEPLOY-CICD.md](docs/DEPLOY-CICD.md)

| Doc | Purpose |
|-----|---------|
| [DEPLOYMENT-CHECKLIST.md](docs/DEPLOYMENT-CHECKLIST.md) | Pre/post deploy checklist |
| [BACKUP-STRATEGY.md](docs/BACKUP-STRATEGY.md) | MySQL backup & restore |
| [MONITORING.md](docs/MONITORING.md) | Health checks & alerts |

**Stack:** GitHub Actions → **Render** (Docker API + static admin) + **external MySQL** (Aiven/Railway)  
**Blueprint:** [render.yaml](render.yaml)  
**Render setup:** [infra/render/README.md](infra/render/README.md)  
**Domain:** https://portal.slnecb.org
