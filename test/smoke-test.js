/**
 * End-to-end smoke test.
 * Boots an in-memory MongoDB, runs the real seed script, starts the real
 * server (server.js), then exercises the main API flows over HTTP and
 * Socket.IO. Run with: npm test
 */
process.env.NODE_ENV = 'test';
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 5055;
const BASE = `http://127.0.0.1:${PORT}`;

let passed = 0, failed = 0;
const check = (name, cond, extra = '') => {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
};

const run = (cmd, args, env) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}\n${out}`))));
  });

const api = async (method, url, { token, body } = {}) => {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, json };
};

const waitForHealth = async (tries = 60) => {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.ok) return true; } catch (_) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

(async () => {
  console.log('Starting in-memory MongoDB...');
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create({ instance: { storageEngine: 'ephemeralForTest' } });
  const uri = mongod.getUri('campus_management');
  const env = {
    MONGO_URI: uri, PORT: String(PORT), NODE_ENV: 'test',
    JWT_ACCESS_SECRET: 'test_access_secret', JWT_REFRESH_SECRET: 'test_refresh_secret',
    LOW_ATTENDANCE_THRESHOLD: '75',
  };

  console.log('Running seed script...');
  await run('node', ['src/seed/seed.js'], env);
  check('seed script completes', true);

  console.log('Starting server...');
  const server = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, ...env } });
  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stdout.write(`[server] ${d}`));

  try {
    check('server health endpoint responds', await waitForHealth());

    // --- Auth ---
    let r = await api('POST', '/api/auth/login', { body: { email: 'admin@campus.edu', password: 'WrongPass1' } });
    check('login with wrong password -> 401', r.status === 401, `got ${r.status}`);
    r = await api('POST', '/api/auth/register', { body: { name: 'Bad' } });
    check('register with missing fields -> 400', r.status === 400, `got ${r.status}`);
    r = await api('GET', '/api/users/me');
    check('protected route without token -> 401', r.status === 401, `got ${r.status}`);

    const adminLogin = await api('POST', '/api/auth/login', { body: { email: 'admin@campus.edu', password: 'Admin@123' } });
    check('admin login -> 200 with tokens', adminLogin.status === 200 && !!adminLogin.json.data.accessToken);
    const admin = adminLogin.json.data.accessToken;

    r = await api('GET', '/api/users/me', { token: admin });
    check('GET /users/me returns admin profile', r.status === 200 && r.json.data.role === 'admin');

    const studentLogin = await api('POST', '/api/auth/login', { body: { email: 'student1@campus.edu', password: 'Student@123' } });
    const student = studentLogin.json.data.accessToken;
    const studentRefresh = studentLogin.json.data.refreshToken;
    check('student login -> 200', studentLogin.status === 200);

    // --- RBAC ---
    r = await api('POST', '/api/courses', { token: student, body: { code: 'CSE-999', title: 'Hacking', department: 'CSE' } });
    check('student creating a course -> 403', r.status === 403, `got ${r.status}`);

    // --- Courses ---
    r = await api('POST', '/api/courses', { token: admin, body: { code: 'CSE-401', title: 'Cloud Computing', department: 'CSE', semester: 4 } });
    check('admin creates course -> 201', r.status === 201, `got ${r.status}`);
    r = await api('POST', '/api/courses', { token: admin, body: { code: 'CSE-401', title: 'Dup', department: 'CSE' } });
    check('duplicate course code -> 409', r.status === 409, `got ${r.status}`);
    r = await api('GET', '/api/courses', { token: student });
    check('course list works for student', r.status === 200 && r.json.total >= 3);
    const dbms = r.json.data.find((c) => c.code === 'CSE-301');

    // --- Sections & enrollments ---
    r = await api('GET', `/api/sections?course=${dbms._id}`, { token: admin });
    const dbmsSection = r.json.data[0];
    check('DBMS section found', !!dbmsSection);
    r = await api('GET', `/api/users?role=student&limit=50`, { token: admin });
    const students = r.json.data;
    const student1 = students.find((s) => s.email === 'student1@campus.edu');
    const student6 = students.find((s) => s.email === 'student6@campus.edu');
    r = await api('POST', '/api/enrollments', { token: admin, body: { student: student1._id, course: dbms._id, section: dbmsSection._id } });
    check('duplicate enrollment -> 409', r.status === 409, `got ${r.status}`);

    // --- Attendance ---
    const facultyLogin = await api('POST', '/api/auth/login', { body: { email: 'faculty@campus.edu', password: 'Faculty@123' } });
    const faculty = facultyLogin.json.data.accessToken;
    const faculty2Login = await api('POST', '/api/auth/login', { body: { email: 'faculty2@campus.edu', password: 'Faculty@123' } });
    const faculty2 = faculty2Login.json.data.accessToken;
    r = await api('GET', `/api/enrollments?section=${dbmsSection._id}&limit=50`, { token: admin });
    const records = r.json.data.map((e) => ({ student: e.student._id, status: 'present' }));
    const today = new Date().toISOString().slice(0, 10);
    r = await api('POST', '/api/attendance/mark', { token: faculty2, body: { course: dbms._id, section: dbmsSection._id, date: today, records } });
    check('unassigned faculty marking attendance -> 403', r.status === 403, `got ${r.status}`);
    r = await api('POST', '/api/attendance/mark', { token: faculty, body: { course: dbms._id, section: dbmsSection._id, date: today, records } });
    check('assigned faculty marks attendance -> 201', r.status === 201, `got ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
    const firstRecordId = r.json.data[0]._id;
    r = await api('POST', '/api/attendance/mark', { token: faculty, body: { course: dbms._id, section: dbmsSection._id, date: today, records } });
    check('duplicate attendance for same session -> 409', r.status === 409, `got ${r.status}`);
    r = await api('PATCH', `/api/attendance/${firstRecordId}`, { token: faculty, body: { status: 'late', reason: 'Student arrived 10 minutes late' } });
    check('attendance correction with audit -> 200', r.status === 200 && r.json.data.status === 'late' && !!r.json.audit, `got ${r.status}`);

    r = await api('GET', '/api/attendance/my', { token: student });
    check('student views own attendance', r.status === 200 && r.json.total >= 6, `total=${r.json.total}`);
    r = await api('GET', `/api/reports/attendance/student/${student6._id}`, { token: student });
    check("student viewing another student's summary -> 403", r.status === 403, `got ${r.status}`);
    r = await api('GET', `/api/reports/attendance/student/${student1._id}`, { token: student });
    const s1dbms = (r.json.data || []).find((x) => x.courseCode === 'CSE-301');
    check('student1 DBMS attendance is 100%', !!s1dbms && s1dbms.percentage === 100, JSON.stringify(s1dbms));
    r = await api('GET', '/api/reports/attendance/below-threshold?threshold=75', { token: faculty });
    const neha = (r.json.data || []).find((x) => x.studentId === student6._id);
    check('below-threshold report lists Neha Gupta', !!neha && neha.percentage < 75, JSON.stringify(neha));
    r = await api('GET', '/api/reports/enrollments/summary', { token: admin });
    const dbmsCount = (r.json.data.perCourse || []).find((x) => x.courseCode === 'CSE-301');
    check('enrollment summary: DBMS has 6 students', !!dbmsCount && dbmsCount.students === 6, JSON.stringify(dbmsCount));

    // --- Announcements + Socket.IO real-time ---
    const { io } = require('socket.io-client');
    const socket = io(BASE, { auth: { token: student }, transports: ['websocket'] });
    const gotConnected = await new Promise((res) => { socket.on('connected', () => res(true)); setTimeout(() => res(false), 5000); });
    check('socket connects with JWT and joins rooms', gotConnected);
    const gotAnnouncement = new Promise((res) => { socket.on('announcement:new', (a) => res(a)); setTimeout(() => res(null), 5000); });
    r = await api('POST', '/api/announcements', { token: admin, body: { title: 'Unit test announcement', body: 'Mid-semester exams start next Monday.', scope: 'university' } });
    check('admin creates announcement -> 201', r.status === 201, `got ${r.status}`);
    const liveAnnouncement = await gotAnnouncement;
    check('student receives announcement live on socket', !!liveAnnouncement && liveAnnouncement.title === 'Unit test announcement');
    socket.close();
    r = await api('GET', '/api/announcements', { token: student });
    check('student announcement feed includes university posts', r.status === 200 && r.json.total >= 2);

    // --- Refresh + logout ---
    r = await api('POST', '/api/auth/refresh', { body: { refreshToken: studentRefresh } });
    check('refresh token issues new tokens -> 200', r.status === 200 && !!r.json.data.accessToken, `got ${r.status}`);
    const rotatedRefresh = r.json.data.refreshToken;
    const newStudentToken = r.json.data.accessToken;
    r = await api('POST', '/api/auth/logout', { token: newStudentToken });
    check('logout -> 200', r.status === 200, `got ${r.status}`);
    r = await api('POST', '/api/auth/refresh', { body: { refreshToken: rotatedRefresh } });
    check('refresh after logout -> 401 (token invalidated)', r.status === 401, `got ${r.status}`);

    // --- 404 ---
    r = await api('GET', '/api/does-not-exist', { token: admin });
    check('unknown route -> 404 JSON', r.status === 404 && r.json.success === false, `got ${r.status}`);
  } finally {
    server.kill();
    await mongod.stop();
  }

  console.log(`\nSmoke test: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((err) => { console.error('Smoke test crashed:', err); process.exit(1); });
