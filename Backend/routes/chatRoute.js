import express from 'express';
import chatModel from '../models/chatModel.js';
import authMiddleware from '../middleware/auth.js';
import { getIO } from '../config/socket.js';

const chatRouter = express.Router();

// GET /api/chat/:orderId — load message history for this order
chatRouter.get('/:orderId', authMiddleware, async (req, res) => {
    try {
        const messages = await chatModel
            .find({ orderId: req.params.orderId })
            .sort({ createdAt: 1 })
            .limit(200);
        res.json({ success: true, data: messages });
    } catch (e) {
        res.json({ success: false, message: 'Error' });
    }
});

// POST /api/chat/:orderId — send a message
chatRouter.post('/:orderId', authMiddleware, async (req, res) => {
    try {
        const { text, senderName, role } = req.body;
        if (!text || !text.trim()) return res.json({ success: false, message: 'Empty message' });

        const message = await chatModel.create({
            orderId: req.params.orderId,
            senderId: req.body.userId,
            senderName: senderName || 'User',
            role: role || 'customer',
            text: text.trim().slice(0, 1000)
        });

        // Broadcast via socket to everyone in the order room
        try {
            getIO().to(`order_${req.params.orderId}`).emit('chat_message', message);
        } catch (e) { /* socket not critical */ }

        res.json({ success: true, data: message });
    } catch (e) {
        console.error(e);
        res.json({ success: false, message: 'Error sending message' });
    }
});

export default chatRouter;
