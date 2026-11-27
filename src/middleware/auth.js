const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

// Verify JWT access token and attach the user to req.user.
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) throw new ApiError(401, 'Not authorized, no token provided');
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) throw new ApiError(401, 'Not authorized, user not found or inactive');
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new ApiError(401, 'Access token expired'));
    if (err.name === 'JsonWebTokenError') return next(new ApiError(401, 'Invalid access token'));
    next(err);
  }
};

// Role-based authorization: authorize('admin', 'faculty')
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, `Role '${req.user.role}' is not allowed to access this resource`));
  }
  next();
};

module.exports = { protect, authorize };
