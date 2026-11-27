const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    date: { type: Date, required: true }, // date part only (normalised to UTC midnight)
    session: { type: Number, default: 1, min: 1, max: 6 }, // which class of the day
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Index 4: one record per student per course session; also speeds date-wise queries.
attendanceSchema.index({ student: 1, course: 1, date: 1, session: 1 }, { unique: true });
attendanceSchema.index({ section: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
