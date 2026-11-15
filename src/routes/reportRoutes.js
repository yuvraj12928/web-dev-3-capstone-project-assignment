const express = require('express');
const { getEnrollmentReport, getLowAttendanceReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/enrollments', protect, authorize('admin', 'faculty'), getEnrollmentReport);
router.get('/low-attendance', protect, authorize('admin', 'faculty'), getLowAttendanceReport);

module.exports = router;
