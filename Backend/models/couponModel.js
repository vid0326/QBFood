import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountPercentage: { type: Number, required: true, min: 1, max: 100 },
    maxDiscountAmount: { type: Number, required: true },
    minOrderValue: { type: Number, required: true, default: 0 },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'restaurant', required: false }, // Optional to prevent seed break
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }], // Track user redemptions for strict single-use
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const couponModel = mongoose.models.coupon || mongoose.model("coupon", couponSchema);

export default couponModel;
