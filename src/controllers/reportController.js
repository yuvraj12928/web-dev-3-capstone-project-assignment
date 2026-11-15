const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');

const getEnrollmentReport = async (req, res, next) => {
  try {
    const report = await Enrollment.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
      { $project: { _id: 0, course: { $arrayElemAt: ['$course.title', 0] }, courseCode: { $arrayElemAt: ['$course.code', 0] }, count: 1 } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

const getLowAttendanceReport = async (req, res, next) => {
  try {
    const { threshold = 75 } = req.query;

    const report = await Attendance.aggregate([
      { $group: { _id: '$student', totalClasses: { $sum: 1 }, attended: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } } } },
      { $project: { _id: 1, totalClasses: 1, attended: 1, percentage: { $multiply: [{ $divide: ['$attended', '$totalClasses'] }, 100] } } },
      { $match: { percentage: { $lt: Number(threshold) } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' } },
      { $project: { _id: 0, student: { $arrayElemAt: ['$student.name', 0] }, email: { $arrayElemAt: ['$student.email', 0] }, totalClasses: 1, attended: 1, percentage: { $round: ['$percentage', 2] } } },
    ]);

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEnrollmentReport, getLowAttendanceReport };
