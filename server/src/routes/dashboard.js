const express = require('express');
const router = express.Router();
const { getDashboardStats, getNotifications, markNotificationRead, getActivityLogs } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, getDashboardStats);
router.get('/notifications', authenticate, getNotifications);
router.put('/notifications/read', authenticate, markNotificationRead);
router.get('/activity', authenticate, getActivityLogs);

module.exports = router;
