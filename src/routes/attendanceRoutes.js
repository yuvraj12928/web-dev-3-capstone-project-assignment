const express = require('express');
const { body } = require('express-validator');
const { markAttendance, correctAttendance, listAttendance, myAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/my', authorize('student'), myAttendance);
router.get('/', authorize('admin', 'faculty'), listAttendance);
router.post(
  '/mark',
  authorize('admin', 'faculty'),
  [
    body('course').isMongoId().withMessage('A valid course id is required'),
    body('section').isMongoId().withMessage('A valid section id is required'),
    body('date').isISO8601().withMessage('A valid date is required'),
    body('session').optional().isInt({ min: 1, max: 6 }).withMessage('Session must be between 1 and 6'),
    body('records').isArray({ min: 1 }).withMessage('At least one attendance record is required'),
    body('records.*.student').isMongoId().withMessage('Each record needs a valid student id'),
    body('records.*.status').isIn(['present', 'absent', 'late']).withMessage('Status must be present, absent or late'),
  ],
  validate,
  markAttendance
);
router.patch(
  '/:id',
  authorize('admin', 'faculty'),
  [body('status').isIn(['present', 'absent', 'late']).withMessage('Status must be present, absent or late')],
  validate,
  correctAttendance
);

module.exports = router;
