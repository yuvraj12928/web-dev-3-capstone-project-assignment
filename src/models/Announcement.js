const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 140 },
    body: { type: String, required: [true, 'Body is required'], trim: true, maxlength: 2000 },
    scope: { type: String, enum: ['university', 'course', 'section'], default: 'university' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

announcementSchema.index({ scope: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
