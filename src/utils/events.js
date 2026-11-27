const { EventEmitter } = require('events');

/**
 * Central application event bus (Unit 4 - EventEmitter).
 * Meaningful application events:
 *  - 'announcement:created'  -> a new announcement was published
 *  - 'attendance:marked'     -> attendance was recorded for a session
 *  - 'attendance:low'        -> a student's attendance fell below the threshold
 */
class AppEvents extends EventEmitter {}
const appEvents = new AppEvents();
appEvents.setMaxListeners(25);
module.exports = appEvents;
