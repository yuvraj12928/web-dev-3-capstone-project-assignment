const express = require('express');
const { markAttendance, getStudentAttendance, getAttendanceSummary } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/mark', protect, authorize('admin', 'faculty'), markAttendance);
router.get('/student/:studentId', protect, getStudentAttendance);
router.get('/summary/:studentId', protect, getAttendanceSummary);

module.exports = router;
