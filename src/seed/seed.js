require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');
const Announcement = require('../models/Announcement');

/**
 * Seed script: creates demo users, courses, sections, enrolments,
 * one week of attendance and sample announcements.
 * Run: npm run seed
 * Demo logins (passwords): admin@campus.edu/Admin@123,
 * faculty@campus.edu/Faculty@123, student1@campus.edu/Student@123 ...
 */
const seed = async () => {
  await connectDB();
  await Promise.all([
    User.deleteMany({}), Course.deleteMany({}), Section.deleteMany({}),
    Enrollment.deleteMany({}), Attendance.deleteMany({}), Announcement.deleteMany({}),
  ]);

  const admin = await User.create({
    name: 'Campus Admin', email: 'admin@campus.edu', password: 'Admin@123',
    role: 'admin', department: 'Administration',
  });
  const faculty1 = await User.create({
    name: 'Dr. Meera Sharma', email: 'faculty@campus.edu', password: 'Faculty@123',
    role: 'faculty', department: 'CSE', designation: 'Associate Professor',
  });
  const faculty2 = await User.create({
    name: 'Prof. Arjun Nair', email: 'faculty2@campus.edu', password: 'Faculty@123',
    role: 'faculty', department: 'CSE', designation: 'Assistant Professor',
  });

  const studentData = [
    ['Yuvraj Singh', '2501730156'],
    ['Rohan Sharma', '2501730187'],
    ['Aman Karn', '2501730315'],
    ['Rudra Singh', '2501730339'],
    ['Priya Verma', '2501730401'],
    ['Neha Gupta', '2501730402'],
  ];
  const students = [];
  for (let i = 0; i < studentData.length; i++) {
    students.push(await User.create({
      name: studentData[i][0], email: `student${i + 1}@campus.edu`, password: 'Student@123',
      role: 'student', department: 'CSE', rollNumber: studentData[i][1],
    }));
  }

  const dbms = await Course.create({
    code: 'CSE-301', title: 'Database Management Systems', department: 'CSE',
    credits: 4, semester: 3, description: 'Relational and NoSQL databases, indexing and transactions.',
    createdBy: admin._id,
  });
  const os = await Course.create({
    code: 'CSE-302', title: 'Operating Systems', department: 'CSE',
    credits: 4, semester: 3, description: 'Processes, scheduling, memory management and file systems.',
    createdBy: admin._id,
  });

  const dbmsSection = await Section.create({ name: 'C', course: dbms._id, faculty: faculty1._id });
  const osSection = await Section.create({ name: 'C', course: os._id, faculty: faculty2._id });

  for (const s of students) {
    await Enrollment.create({ student: s._id, course: dbms._id, section: dbmsSection._id, enrolledBy: admin._id });
    await Enrollment.create({ student: s._id, course: os._id, section: osSection._id, enrolledBy: admin._id });
  }

  // Five DBMS classes. Student 6 (Neha Gupta) misses 3 -> 40% (below threshold demo).
  const days = [2, 4, 6, 8, 10].map((offset) => {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - offset); d.setUTCHours(0, 0, 0, 0); return d;
  });
  for (const date of days) {
    for (let i = 0; i < students.length; i++) {
      let status = 'present';
      if (i === 5 && [0, 1, 3].includes(days.indexOf(date))) status = 'absent';
      if (i === 2 && days.indexOf(date) === 2) status = 'late';
      await Attendance.create({
        student: students[i]._id, course: dbms._id, section: dbmsSection._id,
        date, session: 1, status, markedBy: faculty1._id,
      });
    }
  }

  await Announcement.create({
    title: 'Welcome to the new semester',
    body: 'Classes for Semester 3 begin this week. Please check your course sections.',
    scope: 'university', createdBy: admin._id,
  });
  await Announcement.create({
    title: 'DBMS Lab 4 submission',
    body: 'Submit the NoSQL lab report by Friday on the portal.',
    scope: 'course', course: dbms._id, createdBy: faculty1._id,
  });

  console.log('Seed complete.');
  console.log('Admin:   admin@campus.edu / Admin@123');
  console.log('Faculty: faculty@campus.edu / Faculty@123');
  console.log('Student: student1@campus.edu / Student@123 (Yuvraj Singh)');
  await mongoose.disconnect();
};

if (require.main === module) {
  seed().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = seed;
