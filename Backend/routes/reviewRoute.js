import express from 'express';
import reviewModel from '../models/reviewModel.js';
import orderModel from '../models/orderModel.js';
import authMiddleware from '../middleware/auth.js';

const reviewRouter = express.Router();

// Add a review
reviewRouter.post('/add', authMiddleware, async (req, res) => {
    try {
        const { userId, restaurantId, foodId, orderId, rating, comment } = req.body;

        // Verify the user actually placed this order
        const order = await orderModel.findOne({ _id: orderId, userId: userId });
        if (!order) {
            return res.json({ success: false, message: "Order not found or does not belong to user." });
        }

        const newReview = new reviewModel({
            userId,
            restaurantId,
            foodId,
            orderId,
            rating,
            comment
        });

        await newReview.save();

        res.json({ success: true, message: "Review posted successfully!" });
    } catch (error) {
        console.log(error);
        // Catch duplicate review error (unique index constraint)
        if (error.code === 11000) {
            return res.json({ success: false, message: "You have already reviewed this order." });
        }
        res.json({ success: false, message: "Error posting review." });
    }
});

// Fetch reviews for a specific restaurant
reviewRouter.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        // Populate user info (just the name) to show on the UI
        const reviews = await reviewModel.find({ restaurantId }).populate('userId', 'name').sort({ createdAt: -1 });
        
        res.json({ success: true, data: reviews });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching reviews." });
    }
});

export default reviewRouter;
