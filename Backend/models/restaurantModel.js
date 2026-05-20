import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    rating: { type: Number, default: 0 },
    cuisineTypes: [{ type: String }],
    bannerImage: { type: String, default: "" }, // Path to local storage file
    images: [{ type: String }], // Up to 5 additional gallery photos
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Add geospatial index for $near queries
restaurantSchema.index({ location: "2dsphere" });

const restaurantModel = mongoose.models.restaurant || mongoose.model("restaurant", restaurantSchema);

export default restaurantModel;
