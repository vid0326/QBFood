// To define user model
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {type: String , required: true},
    email:{type: String, required: true, unique: true},
    password: {type: String, required: true},
    cartData :{type:Object , default:{}},
    role: { type: String, enum: ['customer', 'admin', 'restaurant_owner', 'delivery'], default: 'customer' },
    addresses: [{
        label: { type: String, default: 'Home' }, // e.g., Home, Work
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    }],
    currentLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'food' }],
    activeToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    tokenVersion: { type: Number, default: 0 },
    vehicleDetails: { type: String, default: "" }, // Scooter, Bike, Car, etc.
    licensePlate: { type: String, default: "" },
    phone: { type: String, default: "" },           // Contact phone number
    profilePic: { type: String, default: "" },
    loyaltyPoints: { type: Number, default: 0 },    // #29: 1 point per ₹95 spent
    isAvailable: { type: Boolean, default: false }, // Delivery agent availability
    totalDeliveries: { type: Number, default: 0 }   // Delivery count for earnings calc
},{minimize: false})

// Add geospatial index for $near queries
userSchema.index({ currentLocation: "2dsphere" });

const userModel = mongoose.model.user || mongoose.model("user", userSchema)

export default userModel;