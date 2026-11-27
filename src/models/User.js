const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
    role: { type: String, enum: ['admin', 'faculty', 'student'], default: 'student', index: true },
    department: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    rollNumber: { type: String, trim: true, default: '' }, // for students
    designation: { type: String, trim: true, default: '' }, // for faculty
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false, default: null },
  },
  { timestamps: true }
);

// Index 1: unique email (declared above) + role index for role-wise listing.
userSchema.index({ role: 1, department: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
