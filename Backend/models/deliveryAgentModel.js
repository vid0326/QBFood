import mongoose from "mongoose";

const deliveryAgentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    vehicleDetails: { 
        type: String, // e.g., "Honda Activa - MH12AB1234"
        required: true 
    },
    currentLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    },
    isAvailable: { type: Boolean, default: true },
    activeOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order', default: null },
    totalDeliveries: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 }
}, { timestamps: true });

// Add geospatial index for $near queries (finding closest agent)
deliveryAgentSchema.index({ currentLocation: "2dsphere" });

const deliveryAgentModel = mongoose.models.deliveryAgent || mongoose.model("deliveryAgent", deliveryAgentSchema);

export default deliveryAgentModel;
