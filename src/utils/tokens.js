const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });

const signRefreshToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });

const hashToken = async (token) => bcrypt.hash(token, 10);
const compareTokenHash = async (token, hash) => (hash ? bcrypt.compare(token, hash) : false);

module.exports = { signAccessToken, signRefreshToken, hashToken, compareTokenHash };
