const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const { getSocket } = require('../config/socket');
const eventBus = require('../utils/eventBus');

const markAttendance = async (req, res, next) => {
  try {
    const { student, course, section, sessionDate, status, notes } = req.body;

    const allowedRoles = ['faculty', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only faculty/admin can mark attendance' });
    }

    const sectionDoc = await Section.findById(section);
    if (!sectionDoc) return res.status(400).json({ success: false, message: 'Invalid section reference' });

    if (req.user.role === 'faculty' && sectionDoc.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Faculty is not assigned to this section' });
    }

    const enrollment = await Enrollment.findOne({ student, section, course });
    if (!enrollment) return res.status(400).json({ success: false, message: 'Student is not enrolled in this course section' });

    const attendance = await Attendance.findOneAndUpdate(
      { student, course, section, sessionDate: new Date(sessionDate) },
      { status, notes, markedBy: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );

    const socket = getSocket();
    if (socket) {
      socket.to(`course:${course}`).emit('attendance-updated', {
        student,
        course,
        section,
        sessionDate,
        status,
        markedBy: req.user._id,
      });
    }

    eventBus.emit('attendanceMarked', {
      student,
      course,
      section,
      sessionDate,
      status,
      markedBy: req.user._id,
    });

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

const getStudentAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { course, section, startDate, endDate } = req.query;

    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ success: false, message: 'Students can only view their own attendance' });
    }

    const filter = { student: studentId };
    if (course) filter.course = course;
    if (section) filter.section = section;
    if (startDate || endDate) {
      filter.sessionDate = {};
      if (startDate) filter.sessionDate.$gte = new Date(startDate);
      if (endDate) filter.sessionDate.$lte = new Date(endDate);
    }

    const records = await Attendance.find(filter)
      .populate('course', 'title code')
      .populate('section', 'sectionName semester')
      .sort({ sessionDate: 1 });

    const summary = await Attendance.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId), ...(course ? { course: new mongoose.Types.ObjectId(course) } : {}) } },
      { $group: { _id: '$course', totalClasses: { $sum: 1 }, attended: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } } } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'courseDetails' } },
      { $project: { _id: 0, course: { $arrayElemAt: ['$courseDetails.title', 0] }, totalClasses: 1, attended: 1, attendancePercentage: { $multiply: [{ $divide: ['$attended', '$totalClasses'] }, 100] } } },
    ]);

    res.status(200).json({ success: true, data: { records, summary } });
  } catch (error) {
    next(error);
  }
};

const getAttendanceSummary = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ success: false, message: 'Students can only view their own attendance summary' });
    }

    const aggregateResult = await Attendance.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId) } },
      { $group: { _id: '$course', totalClasses: { $sum: 1 }, classesAttended: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } } } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'courseInfo' } },
      { $project: { _id: 0, course: { $arrayElemAt: ['$courseInfo.title', 0] }, courseCode: { $arrayElemAt: ['$courseInfo.code', 0] }, totalClasses: 1, classesAttended: 1, attendancePercentage: { $multiply: [{ $divide: ['$classesAttended', '$totalClasses'] }, 100] } } },
    ]);

    res.status(200).json({ success: true, data: aggregateResult });
  } catch (error) {
    next(error);
  }
};

module.exports = { markAttendance, getStudentAttendance, getAttendanceSummary };
