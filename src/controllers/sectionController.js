const ApiError = require('../utils/ApiError');
const Section = require('../models/Section');
const Course = require('../models/Course');
const User = require('../models/User');
const { paginate } = require('../middleware/validate');

const validateRefs = async ({ course, faculty }) => {
  if (course && !(await Course.findById(course))) throw new ApiError(400, 'Invalid course reference');
  if (faculty) {
    const f = await User.findById(faculty);
    if (!f || f.role !== 'faculty') throw new ApiError(400, 'Assigned user must be a faculty member');
  }
};

// POST /api/sections (admin)
const createSection = async (req, res, next) => {
  try {
    await validateRefs(req.body);
    const section = await Section.create(req.body);
    res.status(201).json({ success: true, data: section });
  } catch (err) { next(err); }
};

// GET /api/sections - filter by course / faculty.
const listSections = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req);
    const filter = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.faculty) filter.faculty = req.query.faculty;
    const [sections, total] = await Promise.all([
      Section.find(filter).populate('course', 'code title').populate('faculty', 'name email').skip(skip).limit(limit),
      Section.countDocuments(filter),
    ]);
    res.json({ success: true, page, limit, total, data: sections });
  } catch (err) { next(err); }
};

// GET /api/sections/:id
const getSection = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id).populate('course').populate('faculty', 'name email department');
    if (!section) throw new ApiError(404, 'Section not found');
    res.json({ success: true, data: section });
  } catch (err) { next(err); }
};

// PATCH /api/sections/:id (admin) - e.g. reassign faculty.
const updateSection = async (req, res, next) => {
  try {
    await validateRefs(req.body);
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!section) throw new ApiError(404, 'Section not found');
    res.json({ success: true, data: section });
  } catch (err) { next(err); }
};

// DELETE /api/sections/:id (admin)
const deleteSection = async (req, res, next) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) throw new ApiError(404, 'Section not found');
    res.json({ success: true, message: 'Section deleted' });
  } catch (err) { next(err); }
};

module.exports = { createSection, listSections, getSection, updateSection, deleteSection };
