const jwt = require('jsonwebtoken');

const generateToken = (user, type = 'access') => {
  const secret = type === 'refresh' ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
  const expiresIn = type === 'refresh' ? process.env.JWT_REFRESH_EXPIRES_IN || '7d' : process.env.JWT_EXPIRES_IN || '15m';

  return jwt.sign({ userId: user._id, role: user.role }, secret, { expiresIn });
};

module.exports = { generateToken };
