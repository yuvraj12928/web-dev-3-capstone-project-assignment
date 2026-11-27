const mongoose = require('mongoose');

const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI is not set');
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  // Make sure all declared indexes (unique email, unique course code,
  // compound attendance/enrollment indexes, ...) actually exist before
  // the app starts serving requests.
  const results = await Promise.allSettled(Object.values(mongoose.models).map((m) => m.init()));
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    console.warn(`Warning: ${failed.length} model index build(s) failed: ${failed[0].reason.message}`);
  } else {
    console.log('All model indexes are ready');
  }
  return conn;
};

module.exports = connectDB;
