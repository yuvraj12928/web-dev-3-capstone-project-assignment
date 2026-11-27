const express = require('express');
const { getMe, updateMe, listUsers, getUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.get('/', authorize('admin'), listUsers);
router.get('/:id', getUser);
router.patch('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
