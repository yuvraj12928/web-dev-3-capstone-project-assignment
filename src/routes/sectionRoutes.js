const express = require('express');
const { getSections, createSection, updateSection, deleteSection } = require('../controllers/sectionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getSections);
router.post('/', protect, authorize('admin', 'faculty'), createSection);
router.put('/:id', protect, authorize('admin', 'faculty'), updateSection);
router.delete('/:id', protect, authorize('admin'), deleteSection);

module.exports = router;
