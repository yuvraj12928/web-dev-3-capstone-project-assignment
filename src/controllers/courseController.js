const ApiError = require('../utils/ApiError');
const Course = require('../models/Course');
const { paginate } = require('../middleware/validate');

// POST /api/courses (admin)
const createCourse = async (req, res, next) => {
  try {
    const existing = await Course.findOne({ code: (req.body.code || '').toUpperCase() });
    if (existing) throw new ApiError(409, `A course with code ${existing.code} already exists`);
    const course = await Course.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: course });
  } catch (err) { next(err); }
};

// GET /api/courses - all roles, pagination + filters.
const listCourses = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req);
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.semester) filter.semester = Number(req.query.semester);
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };
    const [courses, total] = await Promise.all([
      Course.find(filter).sort({ code: 1 }).skip(skip).limit(limit),
      Course.countDocuments(filter),
    ]);
    res.json({ success: true, page, limit, total, data: courses });
  } catch (err) { next(err); }
};

// GET /api/courses/:id
const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) throw new ApiError(404, 'Course not found');
    res.json({ success: true, data: course });
  } catch (err) { next(err); }
};

// PATCH /api/courses/:id (admin)
const updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!course) throw new ApiError(404, 'Course not found');
    res.json({ success: true, data: course });
  } catch (err) { next(err); }
};

// DELETE /api/courses/:id (admin)
const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) throw new ApiError(404, 'Course not found');
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) { next(err); }
};

module.exports = { createCourse, listCourses, getCourse, updateCourse, deleteCourse };
