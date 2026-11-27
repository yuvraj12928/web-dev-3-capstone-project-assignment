const express = require('express');
const { studentAttendanceSummary, belowThreshold, enrollmentSummary } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/attendance/student/:studentId', studentAttendanceSummary);
router.get('/attendance/below-threshold', authorize('admin', 'faculty'), belowThreshold);
router.get('/enrollments/summary', authorize('admin', 'faculty'), enrollmentSummary);

module.exports = router;
