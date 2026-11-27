const mongoose = require('mongoose');

// Audit trail for attendance corrections (advanced feature).
const auditSchema = new mongoose.Schema(
  {
    attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    oldStatus: { type: String, enum: ['present', 'absent', 'late'], required: true },
    newStatus: { type: String, enum: ['present', 'absent', 'late'], required: true },
    reason: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AttendanceAudit', auditSchema);
