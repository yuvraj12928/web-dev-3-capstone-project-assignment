const express = require('express');
const { enrollStudent, getEnrollments } = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, authorize('admin', 'faculty'), enrollStudent);
router.get('/', protect, getEnrollments);

module.exports = router;
