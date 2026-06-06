const { pool } = require('../config/database');

const logActivity = async (userId, action, entityType = null, entityId = null) => {
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [userId, action, entityType, entityId]
    );
  } catch (error) {
    console.error('Log error:', error);
  }
};

const createNotification = async (userId, message, type) => {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [userId, message, type]
    );
  } catch (error) {
    console.error('Notification error:', error);
  }
};

module.exports = { logActivity, createNotification };
