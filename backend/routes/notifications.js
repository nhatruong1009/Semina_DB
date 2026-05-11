const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const NotificationQuery = require('../query/notification');

/**
 * Get notifications for the logged-in user
 */
router.get('/', [verifyToken], async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor || null;
        const notifications = await NotificationQuery.getNotifications(req.userId, limit, cursor);
        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get unread notification count
 */
router.get('/unread-count', [verifyToken], async (req, res) => {
    try {
        const count = await NotificationQuery.getUnreadCount(req.userId);
        res.json({ unread_count: count });
    } catch (err) {
        console.error('Error fetching unread count:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Mark all notifications as read
 */
router.put('/read-all', [verifyToken], async (req, res) => {
    try {
        const modifiedCount = await NotificationQuery.markAllAsRead(req.userId);
        res.json({ success: true, modifiedCount });
    } catch (err) {
        console.error('Error marking all notifications as read:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Mark a specific notification as read
 */
router.put('/:id/read', [verifyToken], async (req, res) => {
    try {
        const notification = await NotificationQuery.markAsRead(req.params.id, req.userId);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json(notification);
    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
