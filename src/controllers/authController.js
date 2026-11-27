const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, hashToken, compareTokenHash } = require('../utils/tokens');

const sendTokens = async (res, user, statusCode = 200) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.status(statusCode).json({
    success: true,
    data: { user: user.toSafeJSON(), accessToken, refreshToken },
  });
};

// POST /api/auth/register
// Public for students. Creating admin/faculty accounts requires an admin token.
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'student', department, phone, rollNumber, designation } = req.body;
    if (role !== 'student') {
      const header = req.headers.authorization || '';
      let isAdmin = false;
      if (header.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_ACCESS_SECRET);
          const requester = await User.findById(decoded.id);
          isAdmin = requester && requester.role === 'admin';
        } catch (_) { /* not an admin */ }
      }
      if (!isAdmin) throw new ApiError(403, 'Only an administrator can create admin or faculty accounts');
    }
    const exists = await User.findOne({ email });
    if (exists) throw new ApiError(409, 'An account with this email already exists');
    const user = await User.create({ name, email, password, role, department, phone, rollNumber, designation });
    await sendTokens(res, user, 201);
  } catch (err) { next(err); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) throw new ApiError(401, 'Invalid email or password');
    if (!user.isActive) throw new ApiError(403, 'This account has been deactivated');
    await sendTokens(res, user, 200);
  } catch (err) { next(err); }
};

// POST /api/auth/refresh  { refreshToken } or cookie
const refresh = async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (!token) throw new ApiError(401, 'Refresh token is required');
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshTokenHash');
    if (!user || !(await compareTokenHash(token, user.refreshTokenHash))) {
      throw new ApiError(401, 'Invalid refresh token');
    }
    await sendTokens(res, user, 200); // rotates the refresh token
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new ApiError(401, 'Refresh token expired, please log in again'));
    next(err);
  }
};

// POST /api/auth/logout (protected) - invalidates the refresh token.
const logout = async (req, res, next) => {
  try {
    req.user.refreshTokenHash = null;
    await req.user.save({ validateBeforeSave: false });
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

module.exports = { register, login, refresh, logout };
