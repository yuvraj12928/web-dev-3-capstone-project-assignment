const express = require('express');
const { createAnnouncement, getAnnouncements } = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getAnnouncements);
router.post('/', protect, authorize('admin', 'faculty'), createAnnouncement);

module.exports = router;
