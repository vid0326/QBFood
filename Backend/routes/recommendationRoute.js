import express from 'express';
import { getPersonalizedRecommendations, getTrendingItems } from '../services/recommendationService.js';
import authMiddleware from '../middleware/auth.js';

const recommendationRouter = express.Router();

// GET /recommendations/personalized
recommendationRouter.get('/personalized', authMiddleware, async (req, res) => {
    try {
        const { lat, lng, maxDistance } = req.query;
        // userId is injected by authMiddleware into req.body.userId
        const userId = req.body.userId;
        
        const recommendations = await getPersonalizedRecommendations(userId, lat, lng, maxDistance);
        
        res.json({ success: true, data: recommendations });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Error fetching personalized recommendations" });
    }
});

// GET /recommendations/trending
recommendationRouter.get('/trending', async (req, res) => {
    try {
        const { lat, lng, maxDistance } = req.query;
        
        const trending = await getTrendingItems(lat, lng, maxDistance);
        
        res.json({ success: true, data: trending });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Error fetching trending items" });
    }
});

export default recommendationRouter;
