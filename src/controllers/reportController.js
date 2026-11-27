const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

// Aggregation Pipeline 1: subject-wise attendance summary for one student.
// GET /api/reports/attendance/student/:studentId
const studentAttendanceSummary = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      throw new ApiError(403, "You cannot view another student's attendance summary");
    }
    const summary = await Attendance().aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId) } },
      {
        $group: {
          _id: '$course',
          totalClasses: { $sum: 1 },
          attended: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        },
      },
      {
        $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' },
      },
      { $unwind: '$course' },
      {
        $project: {
          _id: 0,
          courseId: '$course._id', courseCode: '$course.code', courseTitle: '$course.title',
          totalClasses: 1, attended: 1, present: 1, late: 1, absent: 1,
          percentage: { $round: [{ $multiply: [{ $divide: ['$attended', '$totalClasses'] }, 100] }, 2] },
        },
      },
      { $sort: { courseCode: 1 } },
    ]);
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
};

// Aggregation Pipeline 2: students below a configurable attendance threshold.
// GET /api/reports/attendance/below-threshold?threshold=75&course=<id>
const belowThreshold = async (req, res, next) => {
  try {
    const threshold = Number(req.query.threshold || process.env.LOW_ATTENDANCE_THRESHOLD || 75);
    const match = {};
    if (req.query.course) match.course = new mongoose.Types.ObjectId(req.query.course);
    const rows = await Attendance().aggregate([
      { $match: match },
      {
        $group: {
          _id: { student: '$student', course: '$course' },
          totalClasses: { $sum: 1 },
          attended: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
        },
      },
      {
        $project: {
          student: '$_id.student', course: '$_id.course', totalClasses: 1, attended: 1,
          percentage: { $round: [{ $multiply: [{ $divide: ['$attended', '$totalClasses'] }, 100] }, 2] },
        },
      },
      { $match: { percentage: { $lt: threshold } } },
      { $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'studentDoc' } },
      { $lookup: { from: 'courses', localField: 'course', foreignField: '_id', as: 'courseDoc' } },
      { $unwind: '$studentDoc' },
      { $unwind: '$courseDoc' },
      {
        $project: {
          _id: 0, studentId: '$studentDoc._id', studentName: '$studentDoc.name',
          rollNumber: '$studentDoc.rollNumber', courseCode: '$courseDoc.code',
          totalClasses: 1, attended: 1, percentage: 1,
        },
      },
      { $sort: { percentage: 1 } },
    ]);
    res.json({ success: true, threshold, total: rows.length, data: rows });
  } catch (err) { next(err); }
};

// Aggregation Pipeline 3: enrolment counts per course and per section.
// GET /api/reports/enrollments/summary
const enrollmentSummary = async (req, res, next) => {
  try {
    const perCourse = await Enrollment().aggregate([
      { $group: { _id: '$course', students: { $sum: 1 } } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
      { $unwind: '$course' },
      { $project: { _id: 0, courseId: '$course._id', courseCode: '$course.code', courseTitle: '$course.title', students: 1 } },
      { $sort: { students: -1 } },
    ]);
    const perSection = await Enrollment().aggregate([
      { $group: { _id: '$section', students: { $sum: 1 } } },
      { $lookup: { from: 'sections', localField: '_id', foreignField: '_id', as: 'section' } },
      { $unwind: '$section' },
      { $lookup: { from: 'courses', localField: 'section.course', foreignField: '_id', as: 'course' } },
      { $unwind: '$course' },
      { $project: { _id: 0, sectionId: '$section._id', sectionName: '$section.name', courseCode: '$course.code', students: 1 } },
      { $sort: { students: -1 } },
    ]);
    res.json({ success: true, data: { perCourse, perSection } });
  } catch (err) { next(err); }
};

// Lazy model getters (avoid circular import order issues at load time).
function Attendance() { return require('../models/Attendance'); }
function Enrollment() { return require('../models/Enrollment'); }

module.exports = { studentAttendanceSummary, belowThreshold, enrollmentSummary };
