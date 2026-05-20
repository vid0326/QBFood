import express from 'express';
import couponModel from '../models/couponModel.js';

const couponRouter = express.Router();

// Admin: Add a new coupon (supports vendor isolation)
couponRouter.post('/add', async (req, res) => {
    try {
        const { code, discountPercentage, maxDiscountAmount, minOrderValue, expiryDate, restaurantId } = req.body;
        
        const newCoupon = new couponModel({
            code: code.toUpperCase(),
            discountPercentage,
            maxDiscountAmount,
            minOrderValue,
            expiryDate,
            restaurantId: restaurantId || null
        });

        await newCoupon.save();
        res.json({ success: true, message: "Coupon created successfully! 🏷️" });
    } catch (error) {
        console.log(error);
        if (error.code === 11000) {
            return res.json({ success: false, message: "Coupon code already exists." });
        }
        res.json({ success: false, message: "Error creating coupon." });
    }
});

// Admin: Delete a coupon
couponRouter.delete('/delete/:id', async (req, res) => {
    try {
        await couponModel.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Coupon deleted successfully! 🗑️" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error deleting coupon." });
    }
});

// Admin: Get all coupons (with optional restaurantId filter)
couponRouter.get('/list', async (req, res) => {
    try {
        const { restaurantId } = req.query;
        let query = {};
        if (restaurantId) {
            query.restaurantId = restaurantId;
        }
        const coupons = await couponModel.find(query);
        res.json({ success: true, data: coupons });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching coupons." });
    }
});

// Public: Apply coupon to cart
couponRouter.post('/apply', async (req, res) => {
    try {
        const { code, cartTotal, userId } = req.body;

        const coupon = await couponModel.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid coupon code." });
        }

        if (!coupon.isActive) {
            return res.json({ success: false, message: "This coupon is no longer active." });
        }

        if (new Date() > new Date(coupon.expiryDate)) {
            return res.json({ success: false, message: "This coupon has expired." });
        }

        if (userId && coupon.usedBy && coupon.usedBy.includes(userId)) {
            return res.json({ success: false, message: "You have already used this coupon code! ⛔" });
        }

        if (cartTotal < coupon.minOrderValue) {
            return res.json({ success: false, message: `Minimum order value of $${coupon.minOrderValue} required.` });
        }

        // Calculate discount
        let discount = (cartTotal * coupon.discountPercentage) / 100;
        if (discount > coupon.maxDiscountAmount) {
            discount = coupon.maxDiscountAmount;
        }

        res.json({ 
            success: true, 
            discountAmount: discount, 
            finalTotal: cartTotal - discount,
            message: "Coupon applied successfully!"
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error applying coupon." });
    }
});

export default couponRouter;
