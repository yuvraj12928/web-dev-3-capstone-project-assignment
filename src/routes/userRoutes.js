const express = require('express');
const { getProfile, updateProfile, listUsers } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);
router.get('/', protect, authorize('admin'), listUsers);

module.exports = router;
