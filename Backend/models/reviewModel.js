import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'restaurant', required: true },
    foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'food', required: false }, // Specific food item being reviewed (optional)
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true }, // To verify they actually ordered
    rating: { 
        type: Number, 
        required: true,
        min: 1,
        max: 5
    },
    comment: { type: String, required: false },
}, { timestamps: true });

// Ensure a user can only review an order once
reviewSchema.index({ userId: 1, orderId: 1 }, { unique: true });

const reviewModel = mongoose.models.review || mongoose.model("review", reviewSchema);

export default reviewModel;
