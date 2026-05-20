import notificationModel from '../models/notificationModel.js';
import authMiddleware from '../middleware/auth.js';

// GET /api/notifications — fetch all for logged-in user (newest first)
const getNotifications = async (req, res) => {
    try {
        const notifications = await notificationModel
            .find({ userId: req.body.userId })
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadCount = await notificationModel.countDocuments({ userId: req.body.userId, read: false });
        res.json({ success: true, data: notifications, unreadCount });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Error fetching notifications' });
    }
};

// POST /api/notifications/mark-read — mark all as read
const markAllRead = async (req, res) => {
    try {
        await notificationModel.updateMany({ userId: req.body.userId, read: false }, { read: true });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Error' });
    }
};

// POST /api/notifications/mark-one — mark single notification read
const markOneRead = async (req, res) => {
    try {
        const { notificationId } = req.body;
        await notificationModel.findByIdAndUpdate(notificationId, { read: true });
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: 'Error' });
    }
};

// Helper: create a notification (called internally from orderController)
export const createNotification = async (userId, type, title, message, orderId = null) => {
    try {
        await notificationModel.create({ userId: userId.toString(), type, title, message, orderId });
    } catch (e) {
        console.error('createNotification failed:', e);
    }
};

export { getNotifications, markAllRead, markOneRead };
