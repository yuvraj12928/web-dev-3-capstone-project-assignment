const Section = require('../models/Section');
const Course = require('../models/Course');
const User = require('../models/User');

const getSections = async (req, res, next) => {
  try {
    const { course, faculty, semester, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (course) filter.course = course;
    if (faculty) filter.faculty = faculty;
    if (semester) filter.semester = semester;

    const sections = await Section.find(filter)
      .populate('course')
      .populate('faculty', 'name email role')
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Section.countDocuments(filter);

    res.status(200).json({ success: true, count: sections.length, total, page: Number(page), data: sections });
  } catch (error) {
    next(error);
  }
};

const createSection = async (req, res, next) => {
  try {
    const { course, faculty, sectionName, semester, room, schedule } = req.body;

    const courseExists = await Course.findById(course);
    const facultyExists = await User.findOne({ _id: faculty, role: 'faculty' });

    if (!courseExists) return res.status(400).json({ success: false, message: 'Invalid course reference' });
    if (!facultyExists) return res.status(400).json({ success: false, message: 'Invalid faculty reference' });

    const section = await Section.create({
      course,
      faculty,
      sectionName,
      semester,
      room,
      schedule,
    });

    res.status(201).json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
};

const updateSection = async (req, res, next) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    res.status(200).json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
};

const deleteSection = async (req, res, next) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    res.status(200).json({ success: true, message: 'Section removed', data: section });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSections, createSection, updateSection, deleteSection };
