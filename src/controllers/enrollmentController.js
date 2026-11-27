const ApiError = require('../utils/ApiError');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const User = require('../models/User');
const { paginate } = require('../middleware/validate');

// POST /api/enrollments (admin) - validates references and duplicates.
const enrollStudent = async (req, res, next) => {
  try {
    const { student, course, section } = req.body;
    const studentUser = await User.findById(student);
    if (!studentUser || studentUser.role !== 'student') throw new ApiError(400, 'Invalid student reference');
    const sectionDoc = await Section.findById(section);
    if (!sectionDoc) throw new ApiError(400, 'Invalid section reference');
    if (sectionDoc.course.toString() !== course) throw new ApiError(400, 'Section does not belong to the given course');
    const duplicate = await Enrollment.findOne({ student, course });
    if (duplicate) throw new ApiError(409, 'Student is already enrolled in this course');
    const enrollment = await Enrollment.create({ student, course, section, enrolledBy: req.user._id });
    res.status(201).json({ success: true, data: enrollment });
  } catch (err) { next(err); }
};

// GET /api/enrollments - admin/faculty see lists; students see only their own.
const listEnrollments = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req);
    const filter = {};
    if (req.user.role === 'student') filter.student = req.user._id;
    else {
      if (req.query.student) filter.student = req.query.student;
      if (req.query.course) filter.course = req.query.course;
      if (req.query.section) filter.section = req.query.section;
    }
    const [items, total] = await Promise.all([
      Enrollment.find(filter)
        .populate('student', 'name email rollNumber')
        .populate('course', 'code title')
        .populate('section', 'name')
        .skip(skip).limit(limit),
      Enrollment.countDocuments(filter),
    ]);
    res.json({ success: true, page, limit, total, data: items });
  } catch (err) { next(err); }
};

// DELETE /api/enrollments/:id (admin)
const removeEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findByIdAndDelete(req.params.id);
    if (!enrollment) throw new ApiError(404, 'Enrollment not found');
    res.json({ success: true, message: 'Enrollment removed' });
  } catch (err) { next(err); }
};

module.exports = { enrollStudent, listEnrollments, removeEnrollment };
