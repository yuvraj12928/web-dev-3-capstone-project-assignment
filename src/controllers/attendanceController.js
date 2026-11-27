const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const Attendance = require('../models/Attendance');
const AttendanceAudit = require('../models/AttendanceAudit');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const appEvents = require('../utils/events');
const { paginate } = require('../middleware/validate');

const dayStart = (d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; };
const THRESHOLD = () => Number(process.env.LOW_ATTENDANCE_THRESHOLD || 75);

// Faculty may only act on sections assigned to them; admins may act anywhere.
const assertSectionAccess = async (req, sectionId) => {
  const section = await Section.findById(sectionId);
  if (!section) throw new ApiError(400, 'Invalid section reference');
  if (req.user.role === 'faculty' && section.faculty.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not assigned to this section');
  }
  return section;
};

// After marking, check each student's course percentage and raise the
// 'attendance:low' event for anyone who dropped below the threshold.
const checkLowAttendance = async (courseId, studentIds) => {
  const stats = await Attendance.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(courseId), student: { $in: studentIds.map((s) => new mongoose.Types.ObjectId(s)) } } },
    { $group: { _id: '$student', total: { $sum: 1 }, attended: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
  ]);
  const threshold = THRESHOLD();
  stats.forEach((s) => {
    const pct = Math.round((s.attended / s.total) * 100);
    if (pct < threshold) appEvents.emit('attendance:low', { studentId: s._id, courseId, percentage: pct, threshold });
  });
};

// POST /api/attendance/mark (faculty assigned / admin)
// Body: { course, section, date, session?, records: [{ student, status }] }
const markAttendance = async (req, res, next) => {
  try {
    const { course, section, date, session = 1, records } = req.body;
    const sectionDoc = await assertSectionAccess(req, section);
    if (sectionDoc.course.toString() !== course) throw new ApiError(400, 'Section does not belong to the given course');
    const classDate = dayStart(date);

    // Every student in the records must be enrolled in this section.
    const enrolled = await Enrollment.find({ section, course }).select('student');
    const enrolledIds = new Set(enrolled.map((e) => e.student.toString()));
    const invalid = records.filter((r) => !enrolledIds.has(r.student));
    if (invalid.length) throw new ApiError(400, `${invalid.length} student(s) are not enrolled in this section`);

    // Business rule: no duplicate record for the same student/course/date/session.
    const existing = await Attendance.find({
      course, date: classDate, session,
      student: { $in: records.map((r) => r.student) },
    }).select('student');
    if (existing.length) {
      throw new ApiError(409, `Attendance already marked for ${existing.length} student(s) in this session. Use the correction endpoint to change a record.`);
    }

    const docs = records.map((r) => ({
      student: r.student, course, section, date: classDate, session,
      status: r.status, markedBy: req.user._id,
    }));
    const created = await Attendance.insertMany(docs);
    appEvents.emit('attendance:marked', { sectionId: section, courseId: course, date: classDate, count: created.length });
    await checkLowAttendance(course, records.map((r) => r.student));
    res.status(201).json({ success: true, message: `${created.length} attendance records saved`, data: created });
  } catch (err) { next(err); }
};

// PATCH /api/attendance/:id (faculty assigned / admin) - correction with audit trail.
const correctAttendance = async (req, res, next) => {
  try {
    const { status, reason = '' } = req.body;
    const record = await Attendance.findById(req.params.id);
    if (!record) throw new ApiError(404, 'Attendance record not found');
    await assertSectionAccess(req, record.section);
    if (record.status === status) return res.json({ success: true, message: 'No change', data: record });
    const audit = await AttendanceAudit.create({
      attendance: record._id, changedBy: req.user._id,
      oldStatus: record.status, newStatus: status, reason,
    });
    record.status = status;
    await record.save();
    res.json({ success: true, message: 'Attendance corrected', data: record, audit });
  } catch (err) { next(err); }
};

// GET /api/attendance - faculty/admin list with filters.
const listAttendance = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req);
    const filter = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.section) filter.section = req.query.section;
    if (req.query.student) filter.student = req.query.student;
    if (req.query.date) filter.date = dayStart(req.query.date);
    if (req.user.role === 'faculty') {
      const mySections = await Section.find({ faculty: req.user._id }).select('_id');
      filter.section = filter.section || { $in: mySections.map((s) => s._id) };
    }
    const [items, total] = await Promise.all([
      Attendance.find(filter).populate('student', 'name rollNumber').sort({ date: -1 }).skip(skip).limit(limit),
      Attendance.countDocuments(filter),
    ]);
    res.json({ success: true, page, limit, total, data: items });
  } catch (err) { next(err); }
};

// GET /api/attendance/my - a student's own records + summary per course.
const myAttendance = async (req, res, next) => {
  try {
    const filter = { student: req.user._id };
    if (req.query.course) filter.course = req.query.course;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = dayStart(req.query.from);
      if (req.query.to) filter.date.$lte = dayStart(req.query.to);
    }
    const records = await Attendance.find(filter).populate('course', 'code title').sort({ date: -1 });
    res.json({ success: true, total: records.length, data: records });
  } catch (err) { next(err); }
};

module.exports = { markAttendance, correctAttendance, listAttendance, myAttendance };
