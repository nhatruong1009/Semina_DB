const mongosh = require('../init_db').mongosh;

const createNotification = async (userId, actor, type, entity) => {
    try {
        // Find an existing UNREAD notification of the same type for the same entity (post/job/etc.)
        // If found, we update it by adding the new actor and incrementing the count.
        // If not found, we create a new one.
        
        const filter = {
            user_id: userId,
            type: type,
            'entity.id': entity ? entity.id : null,
            is_read: false
        };

        const update = {
            $push: { actors: { $each: [actor], $slice: -3 } },
            $inc: { count: 1 },
            $set: { updated_at: new Date(), entity: entity }, // Update timestamp and ensure entity data is fresh
            $setOnInsert: { created_at: new Date(), is_read: false }
        };

        const options = { upsert: true, new: true };

        // Note: $inc will start from 0 if doc is inserted, but our default is 1 in schema.
        // MongoDB behavior with upsert + $inc: if insert, count becomes value of $inc.
        // So we set $inc: 1 and it works perfectly.
        
        const result = await mongosh.Notification.findOneAndUpdate(filter, update, options);
        return result;
    } catch (err) {
        console.error('Error in createNotification (Aggregated):', err);
        throw err;
    }
};

const getNotifications = async (userId, limit = 20, cursor = null) => {
    try {
        let query = { user_id: userId };
        if (cursor) {
            query.updated_at = { $lt: new Date(cursor) }; // Use updated_at for sorting
        }
        
        const notifications = await mongosh.Notification.find(query)
            .sort({ updated_at: -1 })
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
