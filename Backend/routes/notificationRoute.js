import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getNotifications, markAllRead, markOneRead } from '../controllers/notificationController.js';

const notificationRouter = express.Router();

notificationRouter.get('/', authMiddleware, getNotifications);
notificationRouter.post('/mark-read', authMiddleware, markAllRead);
notificationRouter.post('/mark-one', authMiddleware, markOneRead);

export default notificationRouter;
