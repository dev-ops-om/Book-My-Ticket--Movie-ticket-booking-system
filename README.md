# Book My Ticket - Movie Ticket Booking Platform

A pure PostgreSQL movie ticket booking full-stack application developed as a follow-up assignment to the **Chai Aur SQL** class.

Built upon the official starter code (`chaicodehq/book-my-ticket`), this project implements a complete relational schema, pure SQL authentication, concurrency-safe seat booking using row-level locking, and a modern, responsive light-theme UI.

---

## 🏛️ Database Schema (ER Diagram)

The relational schema matches the architecture designed for this platform:

```mermaid
erDiagram
    users ||--o{ seats : "books"
    users ||--o{ bookings : "has"
    seats ||--o{ bookings : "referenced in"
    movies ||--o{ bookings : "featured in"

    users {
        serial id PK
        varchar name
        varchar email UK
        varchar password
        varchar reset_token
        timestamp reset_token_expires_at
        timestamp created_at
        timestamp updated_at
    }

    movies {
        serial id PK
        varchar title UK
        varchar language
        int duration
        varchar poster_url
        timestamp created_at
    }

    seats {
        serial id PK
        varchar name
        int isbooked
        int user_id FK
        timestamp booked_at
        timestamp updated_at
    }

    bookings {
        serial id PK
        int user_id FK
        int seat_id FK
        int movie_id FK
        varchar status
        timestamp booked_at
    }
```

---

## ✨ Features Implemented

1. **Light-Theme Frontend Interface**:
   - Modern, clean aesthetic with Plus Jakarta Sans typography and indigo accents.
   - **Authentication Modal**: Tabbed interface for Sign In, Registration, and Password Reset.
   - **Movie Selection**: Interactive movie cards displaying posters, languages, and durations.
   - **Live Seat Map**: Visual screen orientation, interactive 20-seat matrix with real-time status (Available, Selected, Booked).
   - **Ticket Drawer ("My Bookings")**: Displays user's booked tickets with movie details, seat numbers, and timestamps.

2. **Pure SQL Authentication**:
   - `POST /api/auth/register`: Creates new account in PostgreSQL with bcrypt password hashing.
   - `POST /api/auth/login`: Authenticates user credentials and returns signed JWT access token.
   - `POST /api/auth/forgot-password`: Generates timed reset token (15-minute expiry).
   - `POST /api/auth/reset-password`: Validates reset token and updates password.
   - `GET /api/auth/me`: Protected profile endpoint.

3. **Concurrency-Safe Seat Booking**:
   - `POST /api/bookings`: Protected with `authenticate` middleware.
   - Prevents race conditions and double-booking using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) inside an ACID transaction (`BEGIN ... COMMIT / ROLLBACK`).
   - Associates every booked seat with `user_id` and `movie_id`.

4. **Preserved Starter Endpoints**:
   - `GET /`: Serves the frontend application.
   - `GET /seats`: Returns all seats and statuses.
   - `PUT /:id/:name`: Legacy starter route maintained for backwards compatibility.

---

## 📡 API Reference

### Public Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves web interface |
| `GET` | `/seats` | Get all seats and booking statuses |
| `GET` | `/api/movies` | Fetch list of available movies |
| `GET` | `/health` | Service uptime and health check |
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Login and obtain JWT token |
| `POST` | `/api/auth/forgot-password`| Generate password reset token |
| `POST` | `/api/auth/reset-password` | Set new password with valid token |
| `PUT` | `/:id/:name` | Starter legacy booking route |

### Protected Endpoints (Requires `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/me` | Current authenticated user profile |
| `POST` | `/api/bookings` | Book a seat (`seatId`, `movieId`) |
| `GET` | `/api/bookings/my-bookings` | Fetch user's booking history |

---

## 🚀 Local Setup

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd BookMyTicket
npm install
```

### 2. Environment Variables
Create `.env` from `env.example`:
```env
PORT=8080
NODE_ENV=development
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@YOUR_NEON_HOST/neondb?sslmode=require
JWT_SECRET=super_secret_jwt_key_chai_code_sql_hackathon
JWT_EXPIRES_IN=7d
```

### 3. Run Development Server
```bash
npm run dev
```

The database tables and starter seats/movies are verified and seeded automatically on first boot. Open `http://localhost:8080` in your browser.
