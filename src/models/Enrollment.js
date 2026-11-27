const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Index 3: one enrolment per student per course (prevents duplicates at DB level).
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ section: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
