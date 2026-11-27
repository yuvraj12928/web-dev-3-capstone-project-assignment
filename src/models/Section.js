const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Section name is required'], trim: true, uppercase: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    academicYear: { type: String, default: '2026-27' },
  },
  { timestamps: true }
);

// A course cannot have two sections with the same name.
sectionSchema.index({ course: 1, name: 1 }, { unique: true });
sectionSchema.index({ faculty: 1 });

module.exports = mongoose.model('Section', sectionSchema);
