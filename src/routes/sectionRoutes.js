const express = require('express');
const { body } = require('express-validator');
const { createSection, listSections, getSection, updateSection, deleteSection } = require('../controllers/sectionController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/', listSections);
router.get('/:id', getSection);
router.post(
  '/',
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Section name is required'),
    body('course').isMongoId().withMessage('A valid course id is required'),
    body('faculty').isMongoId().withMessage('A valid faculty id is required'),
  ],
  validate,
  createSection
);
router.patch('/:id', authorize('admin'), updateSection);
router.delete('/:id', authorize('admin'), deleteSection);

module.exports = router;
