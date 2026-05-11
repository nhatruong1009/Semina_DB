const mongosh = require('../init_db').mongosh;

const createNotification = async (userId, actor, type, target) => {
    try {
        // Idempotency check: Don't create if a similar unread notification exists
        // or if it was created very recently (e.g., within 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const existing = await mongosh.Notification.findOne({
            user_id: userId,
            'actor.id': actor.id,
            type: type,
            'target.id': target ? target.id : null,
            created_at: { $gte: oneHourAgo }
        });
        
        if (existing) {
            console.log('Duplicate notification detected, skipping creation.');
            return existing;
        }

        const newNotification = new mongosh.Notification({
            user_id: userId,
            actor: actor,
            type: type,
            target: target
        });
        const saved = await newNotification.save();
        return saved;
    } catch (err) {
        if (err.code === 11000) {
            console.log('Duplicate notification blocked by database index.');
            return null; // or return the existing one if needed
        }
        console.error('Error creating notification:', err);
        throw err;
    }
};

const getNotifications = async (userId, limit = 20, cursor = null) => {
    try {
        let query = { user_id: userId };
        if (cursor) {
            query.created_at = { $lt: new Date(cursor) };
        }
        
        const notifications = await mongosh.Notification.find(query)
            .sort({ created_at: -1 })
            .limit(limit);
            
        return notifications;
    } catch (err) {
        console.error('Error getting notifications:', err);
        throw err;
    }
};

const getUnreadCount = async (userId) => {
    try {
        const count = await mongosh.Notification.countDocuments({ user_id: userId, is_read: false });
        return count;
    } catch (err) {
        console.error('Error getting unread count:', err);
        throw err;
    }
};

const markAsRead = async (notificationId, userId) => {
    try {
        const result = await mongosh.Notification.findOneAndUpdate(
            { _id: notificationId, user_id: userId },
            { $set: { is_read: true, updated_at: new Date() } },
            { new: true }
        );
        return result;
    } catch (err) {
        console.error('Error marking notification as read:', err);
        throw err;
    }
};

const markAllAsRead = async (userId) => {
    try {
        const result = await mongosh.Notification.updateMany(
            { user_id: userId, is_read: false },
            { $set: { is_read: true, updated_at: new Date() } }
        );
        return result.modifiedCount;
    } catch (err) {
        console.error('Error marking all notifications as read:', err);
        throw err;
    }
};

module.exports = {
    createNotification,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};
