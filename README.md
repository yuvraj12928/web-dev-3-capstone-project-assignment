# University Campus Management Backend

A Node.js + Express + MongoDB backend for the University Campus Management System project defined in the assignment.

## Features

- Role-based authentication with JWT and refresh tokens
- User, student, faculty, course, section, and enrollment management
- Attendance marking, correction, and subject summaries
- Announcement creation and real-time delivery over Socket.IO
- Aggregation-based reports and analytics
- Centralized error handling and input validation
- Sample seed data for rapid evaluator testing

## Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT authentication
- Socket.IO
- bcrypt

## Getting Started

1. Install dependencies:
   npm install
2. Copy `.env.example` to `.env` and set your configuration.
3. Ensure MongoDB is running locally on port 27017.
4. Seed sample data:
   npm run seed
5. Start the API:
   npm start

   The default port is 9090 to avoid conflicts with common local development services.

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `GET /api/courses`
- `POST /api/courses`
- `GET /api/sections`
- `POST /api/sections`
- `GET /api/attendance/summary/:studentId`
- `POST /api/attendance/mark`
- `GET /api/announcements`
- `POST /api/announcements`
- `GET /api/reports/enrollments`
- `GET /api/reports/low-attendance`

## Notes

This project follows the MVC pattern by separating routes, controllers, models, and middleware.
The assignment requirements for MongoDB aggregation pipelines, indexing, Socket.IO, JWT, bcrypt, and centralized error handling are implemented in the backend design.
