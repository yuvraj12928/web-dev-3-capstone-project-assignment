const ApiError = require('../utils/ApiError');
const Announcement = require('../models/Announcement');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const appEvents = require('../utils/events');
const { paginate } = require('../middleware/validate');

// POST /api/announcements
// Admin: any scope. Faculty: only course/section announcements for their own sections.
const createAnnouncement = async (req, res, next) => {
  try {
    const { title, body, scope = 'university', course, section } = req.body;
    if (scope === 'course' && !course) throw new ApiError(400, 'Course is required for a course announcement');
    if (scope === 'section' && !section) throw new ApiError(400, 'Section is required for a section announcement');
    if (req.user.role === 'faculty') {
      if (scope === 'university') throw new ApiError(403, 'Faculty cannot publish university-wide announcements');
      const targetSection = section
        ? await Section.findById(section)
        : await Section.findOne({ course, faculty: req.user._id });
      if (!targetSection || targetSection.faculty.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You can only announce to your own courses/sections');
      }
    }
    const announcement = await Announcement.create({
      title, body, scope,
      course: scope === 'course' ? course : null,
      section: scope === 'section' ? section : null,
      createdBy: req.user._id,
    });
    appEvents.emit('announcement:created', announcement);
    res.status(201).json({ success: true, data: announcement });
  } catch (err) { next(err); }
};

// GET /api/announcements - only announcements visible to the caller.
const listAnnouncements = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req);
    const or = [{ scope: 'university' }];
    if (req.user.role === 'student') {
      const enrollments = await Enrollment.find({ student: req.user._id });
      or.push({ scope: 'course', course: { $in: enrollments.map((e) => e.course) } });
      or.push({ scope: 'section', section: { $in: enrollments.map((e) => e.section) } });
    } else if (req.user.role === 'faculty') {
      const sections = await Section.find({ faculty: req.user._id });
      or.push({ scope: 'course', course: { $in: sections.map((s) => s.course) } });
      or.push({ scope: 'section', section: { $in: sections.map((s) => s._id) } });
    } else {
      or.push({ scope: 'course' }, { scope: 'section' });
    }
    const [items, total] = await Promise.all([
      Announcement.find({ $or: or }).populate('createdBy', 'name role').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Announcement.countDocuments({ $or: or }),
    ]);
    res.json({ success: true, page, limit, total, data: items });
  } catch (err) { next(err); }
};

// DELETE /api/announcements/:id (creator or admin)
const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) throw new ApiError(404, 'Announcement not found');
    if (req.user.role !== 'admin' && announcement.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only delete your own announcements');
    }
    await announcement.deleteOne();
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) { next(err); }
};

module.exports = { createAnnouncement, listAnnouncements, deleteAnnouncement };
