const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    code: { type: String, required: [true, 'Course code is required'], unique: true, uppercase: true, trim: true },
    title: { type: String, required: [true, 'Course title is required'], trim: true },
    department: { type: String, required: [true, 'Department is required'], trim: true },
    credits: { type: Number, default: 4, min: 1, max: 10 },
    semester: { type: Number, min: 1, max: 8, default: 3 },
    description: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Index 2: department + semester lookups for course listing/filtering.
courseSchema.index({ department: 1, semester: 1 });

module.exports = mongoose.model('Course', courseSchema);
