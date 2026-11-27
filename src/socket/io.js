// Holds the Socket.IO server instance so controllers/event listeners can emit.
let io = null;
module.exports = {
  setIO: (instance) => { io = instance; },
  getIO: () => io,
};
