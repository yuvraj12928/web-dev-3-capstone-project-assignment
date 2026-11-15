const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  sectionName: {
    type: String,
    required: true,
    trim: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  semester: {
    type: String,
    required: true,
    trim: true,
  },
  room: {
    type: String,
    default: '',
  },
  schedule: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

sectionSchema.index({ course: 1, semester: 1, sectionName: 1 }, { unique: true });
sectionSchema.index({ faculty: 1 });

module.exports = mongoose.model('Section', sectionSchema);
