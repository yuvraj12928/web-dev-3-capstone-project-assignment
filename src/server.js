const app = require('./app');
const { connectDB } = require('./config/db');
const dotenv = require('dotenv');
const eventBus = require('./utils/eventBus');

dotenv.config();

const PORT = process.env.PORT || 9090;

const startServer = async () => {
  try {
    await connectDB();

    eventBus.on('attendanceMarked', (payload) => {
      console.log(`Attendance event: ${payload.status} recorded for student ${payload.student}`);
    });

    eventBus.on('announcementCreated', (payload) => {
      console.log(`Announcement event: ${payload.title} created for ${payload.audience}`);
    });

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const { initSocket } = require('./config/socket');
    initSocket(server);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
