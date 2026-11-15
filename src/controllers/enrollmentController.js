const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const User = require('../models/User');

const enrollStudent = async (req, res, next) => {
  try {
    const { student, section } = req.body;

    const studentUser = await User.findOne({ _id: student, role: 'student' });
    const sectionExists = await Section.findById(section).populate('course');

    if (!studentUser) return res.status(400).json({ success: false, message: 'Invalid student reference' });
    if (!sectionExists) return res.status(400).json({ success: false, message: 'Invalid section reference' });

    const existing = await Enrollment.findOne({ student, section });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Student already enrolled in this section' });
    }

    const enrollment = await Enrollment.create({
      student,
      section,
      course: sectionExists.course._id,
    });

    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
};

const getEnrollments = async (req, res, next) => {
  try {
    const { student, course, section } = req.query;
    const filter = {};
    if (student) filter.student = student;
    if (course) filter.course = course;
    if (section) filter.section = section;

    const enrollments = await Enrollment.find(filter)
      .populate('student', 'name email studentId')
      .populate('section')
      .populate('course', 'title code');

    res.status(200).json({ success: true, data: enrollments });
  } catch (error) {
    next(error);
  }
};

module.exports = { enrollStudent, getEnrollments };
