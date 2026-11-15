const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Course = require('./models/Course');
const Section = require('./models/Section');
const Enrollment = require('./models/Enrollment');
const Attendance = require('./models/Attendance');
const Announcement = require('./models/Announcement');
const { connectDB } = require('./config/db');

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    await User.deleteMany({});
    await Course.deleteMany({});
    await Section.deleteMany({});
    await Enrollment.deleteMany({});
    await Attendance.deleteMany({});
    await Announcement.deleteMany({});

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@campus.com',
      password: 'admin123',
      role: 'admin',
    });

    const faculty = await User.create({
      name: 'Faculty User',
      email: 'faculty@campus.com',
      password: 'faculty123',
      role: 'faculty',
      department: 'Computer Science',
    });

    const student1 = await User.create({
      name: 'Student One',
      email: 'student1@campus.com',
      password: 'student123',
      role: 'student',
      studentId: 'STU-1001',
      department: 'Computer Science',
    });

    const student2 = await User.create({
      name: 'Student Two',
      email: 'student2@campus.com',
      password: 'student123',
      role: 'student',
      studentId: 'STU-1002',
      department: 'Computer Science',
    });

    const course1 = await Course.create({
      code: 'CS101',
      title: 'Introduction to Programming',
      credits: 3,
      department: 'Computer Science',
      description: 'Foundations of programming and problem solving.'
    });

    const course2 = await Course.create({
      code: 'CS201',
      title: 'Data Structures',
      credits: 4,
      department: 'Computer Science',
      description: 'Algorithms and data structure fundamentals.'
    });

    const sectionA = await Section.create({
      course: course1._id,
      faculty: faculty._id,
      sectionName: 'A',
      semester: '2026 Fall',
      room: 'LAB-101',
      schedule: 'Mon/Wed 10:00 AM',
    });

    const sectionB = await Section.create({
      course: course2._id,
      faculty: faculty._id,
      sectionName: 'B',
      semester: '2026 Fall',
      room: 'LAB-102',
      schedule: 'Tue/Thu 12:00 PM',
    });

    await Enrollment.create({ student: student1._id, course: course1._id, section: sectionA._id });
    await Enrollment.create({ student: student2._id, course: course1._id, section: sectionA._id });
    await Enrollment.create({ student: student1._id, course: course2._id, section: sectionB._id });

    await Attendance.create({
      student: student1._id,
      course: course1._id,
      section: sectionA._id,
      sessionDate: new Date('2026-11-01'),
      status: 'present',
      markedBy: faculty._id,
    });

    await Attendance.create({
      student: student1._id,
      course: course1._id,
      section: sectionA._id,
      sessionDate: new Date('2026-11-03'),
      status: 'absent',
      markedBy: faculty._id,
    });

    await Announcement.create({
      title: 'Welcome',
      message: 'Welcome to the new semester.',
      audience: 'all',
      createdBy: admin._id,
    });

    console.log('Seed completed');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

seed();
