const Announcement = require('../models/Announcement');
const { getSocket } = require('../config/socket');
const eventBus = require('../utils/eventBus');

const createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, audience, course, section } = req.body;

    const announcement = await Announcement.create({
      title,
      message,
      audience,
      course,
      section,
      createdBy: req.user._id,
    });

    const socket = getSocket();
    if (socket) {
      const room = audience === 'course' ? `course:${course}` : audience === 'section' ? `section:${section}` : 'all';
      socket.to(room).emit('announcement-created', announcement);
      socket.emit('announcement-created', announcement);
    }

    eventBus.emit('announcementCreated', {
      title: announcement.title,
      audience: announcement.audience,
      course: announcement.course,
      section: announcement.section,
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
};

const getAnnouncements = async (req, res, next) => {
  try {
    const { audience, course, section } = req.query;
    const filter = {};

    if (audience) filter.audience = audience;
    if (course) filter.course = course;
    if (section) filter.section = section;

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
};

module.exports = { createAnnouncement, getAnnouncements };
