const express = require('express');
const { body } = require('express-validator');
const { createCourse, listCourses, getCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/', listCourses);
router.get('/:id', getCourse);
router.post(
  '/',
  authorize('admin'),
  [
    body('code').trim().notEmpty().withMessage('Course code is required'),
    body('title').trim().notEmpty().withMessage('Course title is required'),
    body('department').trim().notEmpty().withMessage('Department is required'),
  ],
  validate,
  createCourse
);
router.patch('/:id', authorize('admin'), updateCourse);
router.delete('/:id', authorize('admin'), deleteCourse);

module.exports = router;
