const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');

/**
 * Socket.IO setup (Unit 4 - real-time).
 * - Sockets are authenticated with the same JWT access token as REST.
 * - Each user joins rooms: user:<id>, role:<role>, plus section:<id> and
 *   course:<id> rooms for their enrolments (students) or assigned
 *   sections (faculty), so announcements and attendance updates reach
 *   exactly the right people.
 */
const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) return next(new Error('User not found or inactive'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    socket.join(`user:${user._id}`);
    socket.join(`role:${user.role}`);
    socket.join('university');

    if (user.role === 'student') {
      const enrollments = await Enrollment.find({ student: user._id });
      enrollments.forEach((e) => {
        socket.join(`section:${e.section}`);
        socket.join(`course:${e.course}`);
      });
    }
    if (user.role === 'faculty') {
      const sections = await Section.find({ faculty: user._id });
      sections.forEach((s) => {
        socket.join(`section:${s._id}`);
        socket.join(`course:${s.course}`);
      });
    }

    console.log(`Socket connected: ${user.name} (${user.role})`);
    socket.emit('connected', { message: `Welcome ${user.name}`, userId: user._id, role: user.role });

    socket.on('disconnect', () => console.log(`Socket disconnected: ${user.name}`));
  });
};

module.exports = initSocket;
