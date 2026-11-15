const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServer;

const connectDB = async () => {
  const defaultMongoUri = 'mongodb://127.0.0.1:27017/campus_management';
  const mongoUri = process.env.MONGO_URI || defaultMongoUri;
  const shouldFallback = !process.env.MONGO_URI || process.env.MONGO_URI === defaultMongoUri;

  try {
    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    if (!shouldFallback) {
      console.error('MongoDB connection error:', error.message);
      throw error;
    }

    console.warn('Local MongoDB not available. Starting temporary in-memory MongoDB for development...');
    memoryServer = await MongoMemoryServer.create();
    const connection = await mongoose.connect(memoryServer.getUri(), {
      dbName: 'campus_management',
    });
    console.log(`In-memory MongoDB connected: ${connection.connection.host}`);
    return connection;
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};

module.exports = { connectDB, disconnectDB };
