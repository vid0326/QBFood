import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js"
import couponModel from "../models/couponModel.js"
import deliveryAgentModel from "../models/deliveryAgentModel.js";
import Stripe from 'stripe'
import { getIO } from "../config/socket.js";
import { createNotification } from "./notificationController.js";

let stripe;
try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "your_stripe_secret_key");
} catch (e) {
    console.log("Stripe constructor failed:", e.message);
}

// Placing user order
const placeOrder = async (req,res) => {
    // Dynamically retrieve frontend URL to handle port changes (e.g. 5173 vs 5174)
    const frontend_url = req.get('origin') || "http://localhost:5173";

    try{
        let resId = null;
        if (req.body.items && req.body.items.length > 0) {
            const firstItem = req.body.items[0];
            if (firstItem.restaurantId) {
                resId = typeof firstItem.restaurantId === 'object' ? firstItem.restaurantId._id : firstItem.restaurantId;
            }
        }

        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address,
            restaurantId: resId
        })

        await newOrder.save()
        await userModel.findByIdAndUpdate(req.body.userId,{cartData:{}})

        // If couponCode was applied, mark it as redeemed for single-use limit enforcement
        if (req.body.couponCode) {
            try {
                const coupon = await couponModel.findOne({ code: req.body.couponCode.toUpperCase() });
                if (coupon) {
                    coupon.usedBy.push(req.body.userId);
                    await coupon.save();
                }
            } catch(e) {
                console.log("Failed to mark coupon as redeemed", e);
            }
        }

        const line_items = req.body.items.map((item)=> ({
            price_data: {
                currency: "INR",
                product_data: {
                    name: item.name
                },
                unit_amount: item.price*100
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data:{
                currency: "INR",
                product_data:{
                    name:"Delivery Charges"
                },
                unit_amount: 40*100
            },
            quantity: 1
        })

        try {
            if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith("your_")) {
                throw new Error("Invalid or placeholder Stripe key configured.");
            }

            const session = await stripe.checkout.sessions.create({
                line_items: line_items,
                mode:'payment',
                success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
                cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
            })

            res.json({success:true, session_url:session.url})
        } catch (stripeErr) {
            console.log("Stripe Checkout Session creation failed, bypassing with local Sandbox Payment Simulator:", stripeErr.message);
            // Local Sandbox Payment Simulator: Redirect to interactive Stripe Sandbox Page
            const sandbox_url = `${frontend_url}/stripe-sandbox?orderId=${newOrder._id}&amount=${newOrder.amount}`;
            res.json({success:true, session_url:sandbox_url})
        }
    } catch(error){
        console.log(error)
        res.json({success: false,message: error})
    }
}

const verifyOrder = async (req, res) => {
    const {orderId, success} = req.body;
    try {
        if (success==="true") {
            // Idempotency: if already paid, don't double-process
            const order = await orderModel.findById(orderId);
            if (!order) return res.json({success: false, message: "Order not found"});
            if (order.payment) return res.json({success: true, message: "Already paid"});
            await orderModel.findByIdAndUpdate(orderId, {payment:true});

            // #29: Award loyalty points (1 point per ₹95 = 1 point per $1)
            const pointsEarned = Math.floor(order.amount);
            if (pointsEarned > 0) {
                await userModel.findByIdAndUpdate(order.userId, { $inc: { loyaltyPoints: pointsEarned } });
                await createNotification(
                    order.userId, 'promo',
                    `🏆 +${pointsEarned} QuickBite XP Earned!`,
                    `You earned ${pointsEarned} loyalty points on your order. Keep ordering to unlock rewards!`,
                    orderId
                );
            }

            res.json({success: true, message: "Paid"})
        } else {
            await orderModel.findByIdAndDelete(orderId);
            res.json({success: false, message: "Not Paid"})
        }
    } catch (error) {
        console.log(error);
        res.json({success: false, message: "Error"})
    }
}

// user Orders for frontend
const userOrders = async (req, res) => {
    try {
        const orders = await orderModel
            .find({ userId: req.body.userId })
            .populate('deliveryAgentId', 'name email phone vehicleDetails licensePlate profilePic')
            .sort({ date: -1 }); // newest first
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}


// All orders for Admin (with optional restaurantId isolation)
const listOrders = async (req, res) => {
    try {
        const { restaurantId } = req.query;
        let query = {};
        if (restaurantId) {
            query.$or = [
                { "items.restaurantId": restaurantId },
                { "items.restaurantId._id": restaurantId }
            ];
        }
        const orders = await orderModel.find(query).sort({ date: -1 }); // #11: newest first
        res.json({success: true, data: orders})
    } catch (error) {
        console.log(error)
        res.json({success: false, message:"Error"})
    }
}


// Update Order Status
const updateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const order = await orderModel.findByIdAndUpdate(orderId, { status }, { new: true });
        
        // #13: Persist notification for the customer
        const statusMessages = {
            'Preparing':          { title: '👨‍🍳 Preparing Your Order', msg: 'Your food is being prepared right now!' },
            'Out for delivery':   { title: '🛵 On The Way!',             msg: 'Your order has been picked up and is heading your way.' },
            'Delivered':          { title: '🎉 Order Delivered!',        msg: 'Enjoy your meal! Rate your experience in My Orders.' },
            'Cancelled':          { title: '❌ Order Cancelled',         msg: 'Your order was cancelled.' }
        };
        if (order && statusMessages[status]) {
            const { title, msg } = statusMessages[status];
            await createNotification(order.userId, 'order', title, msg, orderId);
        }

        // Emit socket event to the specific order room
        try {
            getIO().to(`order_${orderId}`).emit('status_update', { orderId, status });
        } catch(e) {
            console.log("Socket emit failed", e);
        }

        res.json({success: true, message: "Status Updated!"})
    } catch (error) {
            console.log(error);
            res.json({success:false,message: "Error"})
    }
}

// Create Stripe PaymentIntent for embedded Stripe Elements checkout
const createPaymentIntent = async (req, res) => {
    const { amount, orderId } = req.body;
    try {
        if (!stripe) {
            return res.json({ success: false, message: "Stripe not configured." });
        }
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to smallest currency unit (paise/cents)
            currency: "inr",
            metadata: { orderId: orderId?.toString() || "" }
        });
        res.json({ success: true, clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error("PaymentIntent creation failed:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// Verify delivery OTP submitted by the delivery agent
const verifyDeliveryOTP = async (req, res) => {
    const { orderId, otp } = req.body;
    try {
        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: "Order not found." });
        if (order.otpVerified) return res.json({ success: false, message: "Order already confirmed." });
        if (!order.deliveryOTP) return res.json({ success: false, message: "OTP not yet generated. Get closer to the customer." });

        // 10-minute OTP expiry check
        const tenMinutes = 10 * 60 * 1000;
        if (Date.now() - new Date(order.otpGeneratedAt).getTime() > tenMinutes) {
            order.deliveryOTP = null;
            order.otpGeneratedAt = null;
            await order.save();
            return res.json({ success: false, message: "OTP expired. Move closer to regenerate." });
        }

        if (order.deliveryOTP !== String(otp).trim()) {
            return res.json({ success: false, message: "Incorrect OTP. Please try again." });
        }

        // Mark order as delivered
        order.otpVerified = true;
        order.status = "Delivered";
        await order.save();

        // Update the delivery agent's state (clear active task, mark online, increment deliveries count)
        if (order.deliveryAgentId) {
            const agent = await deliveryAgentModel.findOne({ userId: order.deliveryAgentId });
            if (agent) {
                agent.activeOrderId = null;
                agent.isAvailable = true; // Mark as online once delivered!
                agent.totalDeliveries = (agent.totalDeliveries || 0) + 1;
                agent.earnings = (agent.earnings || 0) + 45;
                await agent.save();
                console.log(`Agent ${agent.userId} updated: activeOrderId cleared, totalDeliveries incremented to ${agent.totalDeliveries}, marked as available.`);
            }
        }

        // Notify both customer and agent via socket
        try {
            getIO().to(`order_${orderId}`).emit("delivery_confirmed", {
                orderId,
                message: "Order delivered successfully! ✅"
            });
            getIO().to(`order_${orderId}`).emit("status_update", { orderId, status: "Delivered" });
        } catch(e) {
            console.log("Socket emit failed", e);
        }

        res.json({ success: true, message: "Delivery confirmed! 🎉" });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Error verifying OTP." });
    }
};

// Cancel an order (only if not yet picked up by an agent)
const cancelOrder = async (req, res) => {
    const { orderId } = req.body;
    try {
        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: "Order not found." });
        if (order.deliveryAgentId) {
            return res.json({ success: false, message: "Cannot cancel — a delivery agent has already accepted this order." });
        }
        if (order.status === "Delivered") {
            return res.json({ success: false, message: "Order already delivered." });
        }
        if (!['Food is Getting Ready!', 'Preparing'].includes(order.status)) {
            return res.json({ success: false, message: `Cannot cancel at status: ${order.status}` });
        }
        order.status = "Cancelled";
        await order.save();
        // Notify customer socket room
        try { getIO().to(`order_${orderId}`).emit("status_update", { orderId, status: "Cancelled" }); } catch(e) {}
        res.json({ success: true, message: "Order cancelled successfully." });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Error cancelling order." });
    }
};

export { placeOrder, verifyOrder, userOrders, updateStatus, listOrders, createPaymentIntent, verifyDeliveryOTP, cancelOrder }