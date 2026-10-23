# Book My Ticket - Movie Ticket Booking Platform

A PostgreSQL-backed movie ticket booking backend developed as a follow-up assignment to the **Chai Aur SQL** class.

This project extends the official starter code (`chaicodehq/book-my-ticket`) with a Pure SQL authentication system and concurrency-safe, protected seat booking flows.

---

## Features Implemented

1. **Base Endpoints Preserved**:
   - `GET /`: Serves the visual seat map frontend (`index.html`).
   - `GET /seats`: Returns all seats and booking statuses.
   - `PUT /:id/:name`: Legacy booking endpoint from starter code maintained for backwards compatibility.

2. **Pure SQL Authentication**:
   - `POST /api/auth/register`: Creates new user account in PostgreSQL with bcrypt password hashing.
   - `POST /api/auth/login`: Authenticates credentials and returns a signed JWT access token.
   - `GET /api/auth/me`: Protected profile endpoint returning the authenticated user.

3. **Concurrency-Safe Seat Booking**:
   - `POST /api/bookings`: Protected with `authenticate` middleware.
   - Prevents race conditions and double-bookings using PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) within an ACID transaction (`BEGIN ... COMMIT / ROLLBACK`).
   - Associates every booked seat with the authenticated `user_id` inside a dedicated `bookings` relational table.

4. **User Booking History**:
   - `GET /api/bookings/my-bookings`: Returns all tickets booked by the logged-in user using SQL `JOIN`.

5. **Mock Movie Catalog**:
   - `GET /api/movies`: Returns mock movie data (titles, genres, showtimes, and poster URLs).

---

## Database Architecture

The system runs entirely on **PostgreSQL** without external ORMs or document databases:

- **`seats`**: `id` (PK), `name` (VARCHAR), `isbooked` (INT).
- **`users`**: `id` (PK), `name` (VARCHAR), `email` (VARCHAR UNIQUE), `password_hash` (TEXT), `created_at` (TIMESTAMP).
- **`bookings`**: `id` (PK), `user_id` (FK to `users`), `seat_id` (FK to `seats`), `movie_title` (VARCHAR), `booked_at` (TIMESTAMP).

*Tables and starter seats are automatically created on server startup via `initDB()` in `src/common/config/db.js`.*

---

## API Reference

### Public Routes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Visual seat map UI |
| `GET` | `/seats` | Get all seats and statuses |
| `GET` | `/api/movies` | Get mock movie list |
| `GET` | `/health` | Service health check |
| `POST` | `/api/auth/register` | Register new account (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Login and get Bearer token (`email`, `password`) |
| `PUT` | `/:id/:name` | Legacy booking route |

### Protected Routes (Requires Header: `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/bookings` | Book a seat (`seatId`, `movieTitle`) |
| `GET` | `/api/bookings/my-bookings` | View current user's booked tickets |

---

## Local Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL database (Local or free cloud database on [Neon.tech](https://neon.tech))

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd BookMyTicket
npm install
```

### 2. Environment Configuration
Copy `env.example` to `.env`:
```bash
cp env.example .env
```

Update your `DATABASE_URL` in `.env`:
```env
PORT=8080
NODE_ENV=development
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

### 3. Start the Server
```bash
npm run dev
```

The server will automatically connect to PostgreSQL, verify all tables, seed 20 seats if empty, and listen on `http://localhost:8080`.
