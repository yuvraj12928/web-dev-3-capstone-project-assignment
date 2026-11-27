const express = require('express');
const { body } = require('express-validator');
const { enrollStudent, listEnrollments, removeEnrollment } = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/', listEnrollments);
router.post(
  '/',
  authorize('admin'),
  [
    body('student').isMongoId().withMessage('A valid student id is required'),
    body('course').isMongoId().withMessage('A valid course id is required'),
    body('section').isMongoId().withMessage('A valid section id is required'),
  ],
  validate,
  enrollStudent
);
router.delete('/:id', authorize('admin'), removeEnrollment);

module.exports = router;
