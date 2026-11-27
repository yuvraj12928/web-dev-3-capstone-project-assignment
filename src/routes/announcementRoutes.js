const express = require('express');
const { body } = require('express-validator');
const { createAnnouncement, listAnnouncements, deleteAnnouncement } = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/', listAnnouncements);
router.post(
  '/',
  authorize('admin', 'faculty'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('body').trim().notEmpty().withMessage('Body is required'),
    body('scope').optional().isIn(['university', 'course', 'section']).withMessage('Invalid scope'),
    body('course').optional().isMongoId().withMessage('Invalid course id'),
    body('section').optional().isMongoId().withMessage('Invalid section id'),
  ],
  validate,
  createAnnouncement
);
router.delete('/:id', deleteAnnouncement);

module.exports = router;
