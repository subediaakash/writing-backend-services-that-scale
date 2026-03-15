# Auth Microservice

A production-grade authentication microservice built with **Express 5**, **Drizzle ORM**, **PostgreSQL**, and **Bun**. Handles user identity, session management, and secure token-based auth via httpOnly cookies.

## Architecture

```
Client (Browser / Mobile)
  │
  ├─ POST /api/auth/signup     ─┐
  ├─ POST /api/auth/login       │
  ├─ POST /api/auth/logout      ├──▶  Express Router
  ├─ POST /api/auth/refresh     │        │
  └─ GET  /api/auth/me         ─┘        ▼
                                  ┌──────────────┐
                                  │  Middleware   │
                                  │  - Helmet     │
                                  │  - CORS       │
                                  │  - Rate Limit │
                                  │  - Auth Guard │
                                  └──────┬───────┘
                                         ▼
                                  ┌──────────────┐
                                  │  Controller   │  ← Input validation, cookies
                                  └──────┬───────┘
                                         ▼
                                  ┌──────────────┐
                                  │   Service     │  ← Business logic
                                  └──────┬───────┘
                                         ▼
                                  ┌──────────────┐
                                  │  PostgreSQL   │  ← Users + Sessions tables
                                  │  (Drizzle)   │
                                  └──────────────┘
```

### Project Structure

```
auth/
├── index.ts                          # App entry point, server setup
├── src/
│   ├── config/
│   │   ├── env.ts                    # Env validation (fails fast on missing vars)
│   │   └── logger.ts                 # Pino logger (pretty in dev, JSON in prod)
│   ├── db/
│   │   ├── db.ts                     # Drizzle + postgres.js client
│   │   └── schema/
│   │       ├── schemas.ts            # Barrel export
│   │       ├── user.schema.ts        # Users table
│   │       └── session.schema.ts     # Sessions table (refresh token storage)
│   ├── middleware/
│   │   ├── auth.middleware.ts         # JWT access token verification
│   │   ├── error.middleware.ts        # Centralized error handler
│   │   ├── logger.middleware.ts       # Request logging (method, url, status, duration)
│   │   └── rateLimit.ts              # Rate limiter for auth endpoints
│   ├── modules/auth/
│   │   ├── auth.routes.ts            # Route definitions
│   │   ├── auth.controller.ts        # Request handling, validation, cookies
│   │   └── auth.service.ts           # Core auth logic, session management
│   └── utils/
│       ├── cookie.ts                 # httpOnly cookie helpers
│       ├── hash.ts                   # Argon2 password hashing
│       └── jwt.ts                    # JWT sign/verify for access + refresh tokens
├── drizzle.config.ts                 # Drizzle Kit migration config
├── docker-compose.yml                # PostgreSQL container
├── package.json
├── tsconfig.json
└── .env.example
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | **Bun** | Fast startup, native TypeScript, built-in test runner |
| Framework | **Express 5** | Mature, async error support, large ecosystem |
| Database | **PostgreSQL 15** | ACID, UUID support, battle-tested |
| ORM | **Drizzle** | Type-safe queries, zero overhead, SQL-like syntax |
| Password Hashing | **Argon2** | Winner of PHC, resistant to GPU/ASIC attacks |
| Tokens | **JWT** (jsonwebtoken) | Stateless access tokens, signed refresh tokens |
| Security | **Helmet** | Secure HTTP headers out of the box |
| Logging | **Pino** | Low-overhead structured JSON logging |

## Auth Flow

### Signup / Login
1. Validate input (email format, password length)
2. Hash password with Argon2 (signup) or verify hash (login)
3. Generate JWT access token (15 min) + refresh token (30 days)
4. Store refresh token in `sessions` table with IP + user agent
5. Set both tokens as **httpOnly** secure cookies
6. Return user profile (never the tokens in the response body)

### Token Refresh (Rotation)
1. Client hits `POST /api/auth/refresh` (refresh token sent automatically via cookie)
2. Verify JWT refresh token signature + expiry
3. Look up active session in DB
4. **If session not found** → token reuse detected → **revoke ALL user sessions** (security)
5. Revoke old session, create new session with fresh tokens
6. Set new cookies

### Logout
1. Revoke the session in DB (`is_active = false`, `revoked_at` set)
2. Clear both cookies

## Security Measures

- **httpOnly cookies** — tokens never exposed to JavaScript (XSS-safe)
- **Argon2 hashing** — memory-hard, resistant to brute force
- **Refresh token rotation** — each refresh invalidates the old token
- **Token reuse detection** — reuse of a revoked token revokes ALL user sessions
- **Rate limiting** — 5 requests per 15 minutes on signup/login (per IP)
- **Helmet** — sets security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Generic auth errors** — "Invalid email or password" prevents user enumeration
- **10kb body limit** — prevents payload-based DoS
- **Strict SameSite cookies** in production (lax in dev)
- **Graceful shutdown** — handles SIGTERM/SIGINT cleanly

## API Endpoints

| Method | Endpoint | Auth | Rate Limited | Description |
|--------|----------|------|-------------|-------------|
| `GET` | `/health` | No | No | Service health check |
| `POST` | `/api/auth/signup` | No | Yes | Register a new user |
| `POST` | `/api/auth/login` | No | Yes | Authenticate user |
| `POST` | `/api/auth/logout` | Yes | No | Revoke current session |
| `POST` | `/api/auth/refresh` | No | No | Rotate refresh token |
| `GET` | `/api/auth/me` | Yes | No | Get current user profile |

### Request / Response Examples

**Signup**
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com", "password": "securepass123"}'
```
```json
{ "success": true, "user": { "id": "uuid", "name": "John", "email": "john@example.com", "createdAt": "..." } }
```

**Login**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "securepass123"}'
```

**Get Current User**
```bash
curl http://localhost:3001/api/auth/me --cookie "access_token=<token>"
```

## Setup

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [Docker](https://docs.docker.com/get-docker/) (for PostgreSQL)

### 1. Install Dependencies

```bash
cd auth
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your secrets:

```env
NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://auth_user:auth_password@localhost:5432/auth_db

JWT_ACCESS_SECRET=generate-a-random-string-min-32-chars
JWT_REFRESH_SECRET=generate-a-different-random-string-min-32-chars

CORS_ORIGIN=http://localhost:3000
```

Generate secure secrets:
```bash
openssl rand -base64 48   # Run twice, one for each secret
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Run Database Migrations

```bash
bunx drizzle-kit push
```

### 5. Start the Service

```bash
# Development
bun run --watch index.ts

# Production
NODE_ENV=production bun run index.ts
```

The service will be running at `http://localhost:3001`.

### Verify

```bash
curl http://localhost:3001/health
# {"status":"up","service":"auth-service"}
```

## Database Schema

### Users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, auto-generated |
| name | TEXT | Required |
| email | TEXT | Unique, required |
| password_hash | TEXT | Argon2 hash |
| is_active | BOOLEAN | Default: true |
| created_at | TIMESTAMP | Auto-set |

### Sessions
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| user_id | UUID | FK → users.id |
| refresh_token | TEXT | JWT refresh token |
| is_active | BOOLEAN | Default: true |
| user_agent | TEXT | Client user agent |
| ip_address | TEXT | Client IP |
| revoked_at | TIMESTAMP | Set on logout/rotation |
| last_used_at | TIMESTAMP | Auto-set |
| created_at | TIMESTAMP | Auto-set |
| updated_at | TIMESTAMP | Auto-set |

## Responsibilities

**This service handles:**
- User registration (email + password)
- Login / Logout
- Access token generation (JWT)
- Refresh token rotation with reuse detection
- Session management and revocation
- User identity lookup

**This service does NOT handle:**
- User profile management (separate service)
- Authorization / permissions
- Business logic from other services
- OAuth (planned for future)
