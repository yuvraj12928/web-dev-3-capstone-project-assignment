const appEvents = require('./events');
const socketStore = require('../socket/io');

/**
 * Listeners for the application EventEmitter.
 * Decouples "something happened" (controllers) from "tell people about it"
 * (logging + real-time socket delivery).
 */
const registerEventListeners = () => {
  appEvents.on('announcement:created', (announcement) => {
    console.log(`[EVENT] announcement:created -> ${announcement.title} (${announcement.scope})`);
    const io = socketStore.getIO();
    if (!io) return;
    const payload = {
      id: announcement._id,
      title: announcement.title,
      body: announcement.body,
      scope: announcement.scope,
      createdAt: announcement.createdAt,
    };
    if (announcement.scope === 'university') io.to('university').emit('announcement:new', payload);
    if (announcement.scope === 'course') io.to(`course:${announcement.course}`).emit('announcement:new', payload);
    if (announcement.scope === 'section') io.to(`section:${announcement.section}`).emit('announcement:new', payload);
  });

  appEvents.on('attendance:marked', ({ sectionId, courseId, date, count }) => {
    console.log(`[EVENT] attendance:marked -> section ${sectionId}, ${count} records on ${date}`);
    const io = socketStore.getIO();
    if (io) io.to(`section:${sectionId}`).emit('attendance:updated', { sectionId, courseId, date, count });
  });

  appEvents.on('attendance:low', ({ studentId, courseId, percentage, threshold }) => {
    console.log(`[EVENT] attendance:low -> student ${studentId} at ${percentage}% (threshold ${threshold}%)`);
    const io = socketStore.getIO();
    if (io) {
      io.to(`user:${studentId}`).emit('attendance:low-alert', {
        courseId, percentage, threshold,
        message: `Your attendance is ${percentage}%, below the ${threshold}% threshold.`,
      });
    }
  });
};

module.exports = registerEventListeners;
