# University Campus Management System

A complete backend for managing university academic workflows: users (admin, faculty, students), courses, sections, enrolments, attendance with audit-backed corrections, announcements, and attendance/enrolment analytics — with JWT authentication, role-based access control, real-time updates over Socket.IO, and MongoDB aggregation reports.

Built as a Backend Development capstone project.

**Tech stack:** Node.js · Express.js · MongoDB · Mongoose · JWT (access + refresh tokens) · bcrypt · Socket.IO · EventEmitter · express-validator

The responsive CampusOS dashboard is served by the Express app at the same origin as the API. Sign in with a seeded account to open the role-aware workspace for administrators, faculty, or students.

## Features

- **Authentication & security** — bcrypt password hashing (cost 12), JWT access tokens (15 min) + rotating refresh tokens (7 days, stored hashed, invalidated on logout), protected routes, RBAC for `admin` / `faculty` / `student`.
- **MVC architecture** — routes → middleware → controllers → models, with centralized error handling and a consistent JSON response format.
- **Full CRUD** — users, courses, sections, enrolments, announcements; attendance marking + corrections.
- **Business rules enforced on the server** — faculty can only mark attendance for sections assigned to them; no duplicate enrolment per student+course; no duplicate attendance per student/course/date/session; students can only see their own attendance; attendance corrections create an audit record.
- **Aggregation reports** — subject-wise attendance percentage per student, students below a configurable threshold, course/section enrolment counts.
- **Indexes** — unique email, unique course code, unique (student, course) enrolment, unique (student, course, date, session) attendance, plus role/department and section/date lookup indexes.
- **Real-time (Socket.IO)** — authenticated sockets; users join rooms for their role, courses and sections; new announcements are pushed live (`announcement:new`), attendance updates (`attendance:updated`) and low-attendance alerts (`attendance:low-alert`).
- **Browser dashboard** — responsive sign-in and role-aware overview, course catalog, campus announcements, attendance history, and (for administrators) people directory. Administrators can add courses and administrators/faculty can publish announcements.
- **EventEmitter** — internal events `announcement:created`, `attendance:marked`, `attendance:low` decouple business logic from logging and socket delivery.
- **Seed data & tests** — one-command seed with demo accounts, and an end-to-end smoke test (31 checks) plus a Postman collection.

## Prerequisites

- Node.js 18+ and npm
- MongoDB running locally (or a MongoDB Atlas connection string)

## Installation & running

```bash
npm install
cp .env.example .env      # then edit secrets if needed
npm run seed              # load demo data
npm start                 # or: npm run dev  (auto-restart on changes)
```

The API and dashboard run at the same origin (see `PORT` in `.env`), for example `http://localhost:5000`.

### Demo accounts (created by the seed script)

| Role    | Email                | Password    |
| ------- | -------------------- | ----------- |
| Admin   | admin@campus.edu     | Admin@123   |
| Faculty | faculty@campus.edu   | Faculty@123 |
| Faculty | faculty2@campus.edu  | Faculty@123 |
| Student | student1@campus.edu  | Student@123 |
| Student | student2–6@campus.edu| Student@123 |

`student1` is Yuvraj Singh; `student6` (Neha Gupta) is seeded with low attendance so the below-threshold report and low-attendance alert can be demonstrated immediately.

## Environment variables

| Variable                 | Meaning                                   | Example                                  |
| ------------------------ | ----------------------------------------- | ---------------------------------------- |
| `PORT`                   | HTTP port                                 | `5000`                                   |
| `MONGO_URI`              | MongoDB connection string                 | `mongodb://127.0.0.1:27017/campus_management` |
| `JWT_ACCESS_SECRET`      | Secret for access tokens                  | long random string                       |
| `JWT_REFRESH_SECRET`     | Secret for refresh tokens                 | long random string                       |
| `JWT_ACCESS_EXPIRES`     | Access token lifetime                     | `15m`                                    |
| `JWT_REFRESH_EXPIRES`    | Refresh token lifetime                    | `7d`                                     |
| `LOW_ATTENDANCE_THRESHOLD` | Low-attendance alert threshold (%)      | `75`                                     |

Never commit a real `.env` file — it is listed in `.gitignore`.

## API overview

Base URL: `/api`. All responses are JSON: `{ success, data }` or `{ success: false, message, errors? }`.

| Group         | Endpoints |
| ------------- | --------- |
| Auth          | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` |
| Users         | `GET /users/me` · `PATCH /users/me` · `GET /users` (admin) · `GET/PATCH/DELETE /users/:id` |
| Courses       | `GET /courses` · `GET /courses/:id` · `POST/PATCH/DELETE /courses` (admin) |
| Sections      | `GET /sections` · `GET /sections/:id` · `POST/PATCH/DELETE /sections` (admin) |
| Enrolments    | `GET /enrollments` · `POST /enrollments` (admin) · `DELETE /enrollments/:id` (admin) |
| Attendance    | `POST /attendance/mark` (faculty/admin) · `PATCH /attendance/:id` (correction + audit) · `GET /attendance` (faculty/admin) · `GET /attendance/my` (student) |
| Announcements | `GET /announcements` · `POST /announcements` (admin/faculty) · `DELETE /announcements/:id` |
| Reports       | `GET /reports/attendance/student/:studentId` · `GET /reports/attendance/below-threshold?threshold=75` · `GET /reports/enrollments/summary` |

Full request/response documentation is in the project report and the Postman collection (`docs/Campus_Management_API.postman_collection.json`).

## Socket.IO

Connect with the access token: `io('http://localhost:5000', { auth: { token } })`.
The server places each user into rooms `user:<id>`, `role:<role>`, `university`, plus `course:<id>` / `section:<id>` rooms for their enrolments or assigned sections.

| Event                  | Direction | Payload |
| ---------------------- | --------- | ------- |
| `connected`            | server → client | `{ message, userId, role }` |
| `announcement:new`     | server → room   | `{ id, title, body, scope, createdAt }` |
| `attendance:updated`   | server → section room | `{ sectionId, courseId, date, count }` |
| `attendance:low-alert` | server → student    | `{ courseId, percentage, threshold, message }` |

## Testing

```bash
npm test
```

Runs an end-to-end smoke test: it starts an in-memory MongoDB, runs the real seed script and server, and checks 31 cases — login/refresh/logout, validation failures (400), unauthenticated (401), forbidden roles (403), missing routes (404), duplicates (409), attendance rules, aggregation reports, and live Socket.IO announcement delivery.

The Postman collection in `docs/` covers the same scenarios for manual demonstration.

## Project structure

```
server.js                 # entry point: HTTP server + Socket.IO
src/
  app.js                  # Express app, middleware chain, route mounting
  config/db.js            # MongoDB connection + index initialisation
  models/                 # Mongoose schemas (User, Course, Section, Enrollment, Attendance, AttendanceAudit, Announcement)
  middleware/             # auth (JWT + RBAC), validation, centralized error handling
  controllers/            # business logic per module
  routes/                 # REST route definitions + request validators
  socket/                 # Socket.IO authentication, rooms, shared io instance
  utils/                  # ApiError, token helpers, EventEmitter bus + listeners
  seed/seed.js            # demo data
public/                   # responsive CampusOS browser dashboard
test/smoke-test.js        # end-to-end API tests
docs/                     # Postman collection
```

## Author

Yuvraj Singh — B.Tech CSE (AI & ML), Semester 3, Section C, Roll No. 2501730156.
