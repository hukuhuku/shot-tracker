# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shot Tracker is a basketball shot practice tracking web app. Users log in via Google (Firebase Auth), record makes/attempts by court zone, and view heatmaps/statistics.

- **Frontend**: Deployed on Vercel (https://shot-tracker-theta.vercel.app/)
- **Backend**: Deployed on Railway (Docker-based)
- **Database**: MySQL (Railway hosted)

## Commands

### Frontend (`/frontend`)

```bash
npm run dev       # Dev server with HMR (proxies /api to localhost:8080)
npm run build     # tsc -b && vite build → dist/
npm run lint      # ESLint
npm run preview   # Preview production build
```

### Backend (`/backend`)

```bash
./mvnw spring-boot:run              # Run locally (port 8080)
./mvnw clean package -DskipTests    # Build JAR
./mvnw test                         # Run tests
docker build -t shot-tracker .      # Docker build (multi-stage)
```

### Environment Variables

**Frontend** (`frontend/.env.local`):
- `VITE_API_BASE_URL` — backend API base URL
- Firebase config vars (`VITE_FIREBASE_API_KEY`, etc.)

**Backend** (`application.properties` / Railway env):
- `spring.datasource.url/username/password` — MySQL connection
- Firebase service account JSON (via `FIREBASE_SERVICE_ACCOUNT_JSON` env var)

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Charts | Recharts |
| Auth (client) | Firebase SDK (Google OAuth) |
| HTTP | Axios |
| Backend | Spring Boot 4.0, Java 17, Maven |
| Auth (server) | Firebase Admin SDK |
| ORM | Spring Data JPA |
| Database | MySQL |

### Authentication Flow

1. Client: `signInWithPopup` (Google) → Firebase issues ID token
2. Client: Attaches `Authorization: Bearer <token>` to every API request
3. Server: `AuthService.verifyTokenAndGetUserId()` calls `FirebaseAuth.getInstance().verifyIdToken(token)` → returns Firebase UID
4. Server: All queries are scoped to that UID

### API

Backend exposes two endpoints under `/api/shots`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/shots` | Fetch all records for the authenticated user |
| POST | `/api/shots` | Create or update a shot record (upsert by userId + date + zoneId) |

CORS is restricted to the Vercel frontend URL (`@CrossOrigin` on `ShotController`).

### Data Model

```typescript
interface ShotRecord {
  id?: number;
  userId: string;      // Firebase UID
  date: string;        // YYYY-MM-DD
  zoneId: string;      // e.g. "Paint", "3PT-Top"
  category: "Paint" | "Mid" | "3PT";
  makes: number;
  attempts: number;
}
```

MySQL table `shot_records` has a unique constraint on `(user_id, date, zone_id)`. The backend upserts: if a record for that combination exists it updates makes/attempts, otherwise inserts.

### Frontend Structure

- `App.tsx` — root: auth state, data fetching, date selection, record submission
- `components/CourtMapInput.tsx` — interactive SVG court map for recording shots by zone
- `components/HeatMapCourt.tsx` — SVG heatmap visualization of shot percentages
- `components/InputModal.tsx` — modal for entering makes/attempts for a zone
- `components/LoginForm.tsx` — Google sign-in UI
- `constants.ts` — court zone definitions and `API_BASE_URL`
- `types.ts` — shared TypeScript interfaces
- `firebaseConfig.ts` — Firebase app initialization

### Backend Structure (`src/main/java/com/example/shot_tracker/`)

- `controller/ShotController.java` — REST endpoints, auth header extraction
- `service/AuthService.java` — Firebase token verification
- `model/ShotRecord.java` — JPA entity (Lombok)
- `repository/ShotRepository.java` — Spring Data JPA repo; custom query to find by userId+date+zoneId
- `config/FirebaseConfig.java` — Firebase Admin SDK initialization (reads service account from env var)

### Local Development

The Vite dev server proxies `/api/*` to `http://localhost:8080`, so both services must run simultaneously for local full-stack development. The backend requires a MySQL instance and Firebase credentials to function.
