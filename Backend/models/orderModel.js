import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
{
    userId: {type: String ,required: true},
    items : {type: Array , required: true},
    amount: {type: Number, required: true},
    address: {type: Object, required: true},
    status:{type: String , default: "Food is Getting Ready!"},
    date: {type: Date, default: Date.now()},
    payment:{type: Boolean, default : false},
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'restaurant', required: false },
    deliveryAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: false },
    deliveryOTP: { type: String, default: null },          // 6-digit OTP shown to customer
    otpVerified: { type: Boolean, default: false },        // true after agent enters correct OTP
    otpGeneratedAt: { type: Date, default: null }          // timestamp for OTP expiry
}
)

const orderModel = mongoose.model.order || mongoose.model("order", orderSchema)

export default orderModel