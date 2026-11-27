const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { paginate } = require('../middleware/validate');

// GET /api/users/me
const getMe = async (req, res) => {
  res.json({ success: true, data: req.user.toSafeJSON() });
};

// PATCH /api/users/me - only permitted profile fields.
const updateMe = async (req, res, next) => {
  try {
    const allowed = ['name', 'department', 'phone', 'rollNumber', 'designation'];
    allowed.forEach((field) => { if (req.body[field] !== undefined) req.user[field] = req.body[field]; });
    await req.user.save();
    res.json({ success: true, data: req.user.toSafeJSON() });
  } catch (err) { next(err); }
};

// GET /api/users (admin) - pagination + role/department filters.
const listUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, page, limit, total, data: users.map((u) => u.toSafeJSON()) });
  } catch (err) { next(err); }
};

// GET /api/users/:id (admin, or the user themself)
const getUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      throw new ApiError(403, 'You can only view your own profile');
    }
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ success: true, data: user.toSafeJSON() });
  } catch (err) { next(err); }
};

// PATCH /api/users/:id (admin) - role / activation changes.
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    ['name', 'department', 'phone', 'rollNumber', 'designation', 'role', 'isActive'].forEach((f) => {
      if (req.body[f] !== undefined) user[f] = req.body[f];
    });
    await user.save();
    res.json({ success: true, data: user.toSafeJSON() });
  } catch (err) { next(err); }
};

// DELETE /api/users/:id (admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { next(err); }
};

module.exports = { getMe, updateMe, listUsers, getUser, updateUser, deleteUser };
