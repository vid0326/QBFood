import deliveryAgentModel from "../models/deliveryAgentModel.js";
import orderModel from "../models/orderModel.js";
import { getIO } from "../config/socket.js";

// Onboard driver
const onboardDriver = async (req, res) => {
    try {
        const { userId, vehicleDetails } = req.body;
        
        let agent = await deliveryAgentModel.findOne({ userId });
        if (agent) {
            agent.vehicleDetails = vehicleDetails;
            await agent.save();
        } else {
            agent = new deliveryAgentModel({
                userId,
                vehicleDetails,
                currentLocation: { type: 'Point', coordinates: [0, 0] }
            });
            await agent.save();
        }
        res.json({ success: true, message: "Delivery agent onboarded successfully! 🏍️", data: agent });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Failed to onboard delivery agent." });
    }
};

// Get driver profile
const getDriverProfile = async (req, res) => {
    try {
        const { userId } = req.body; // Set by authMiddleware
        const agent = await deliveryAgentModel.findOne({ userId }).populate({
            path: "activeOrderId",
            populate: { path: "restaurantId" }
        });
        if (!agent) {
            return res.json({ success: false, message: "Delivery profile not found." });
        }
        res.json({ success: true, data: agent });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Error fetching delivery profile." });
    }
};

// Toggle Availability
const toggleAvailability = async (req, res) => {
    try {
        const { userId } = req.body;
        const agent = await deliveryAgentModel.findOne({ userId });
        if (!agent) {
            return res.json({ success: false, message: "Driver not onboarded." });
        }
        agent.isAvailable = !agent.isAvailable;
        await agent.save();
        res.json({ success: true, message: `Status updated to ${agent.isAvailable ? 'Online' : 'Offline'}`, isAvailable: agent.isAvailable });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Error toggling status." });
    }
};

import restaurantModel from "../models/restaurantModel.js";

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Get active orders queue (unassigned orders)
const getAvailableOrders = async (req, res) => {
    try {
        const { lat, lng } = req.query;
        const orders = await orderModel.find({
            deliveryAgentId: { $exists: false },
            status: { $in: ["Food is Getting Ready!", "Preparing"] }
        });

        let filteredOrders = [];
        const driverLat = lat ? parseFloat(lat) : null;
        const driverLng = lng ? parseFloat(lng) : null;

        for (let order of orders) {
            let restId = order.restaurantId;
            if (!restId && order.items && order.items.length > 0) {
                const itemRestId = order.items[0].restaurantId;
                if (itemRestId && typeof itemRestId === 'object' && itemRestId._id) {
                    restId = itemRestId._id;
                } else if (itemRestId) {
                    restId = itemRestId;
                }
            }

            let includeOrder = true;
            if (driverLat && driverLng && restId) {
                const restaurant = await restaurantModel.findById(restId);
                if (restaurant && restaurant.location && restaurant.location.coordinates && restaurant.location.coordinates.length === 2) {
                    const restLng = restaurant.location.coordinates[0];
                    const restLat = restaurant.location.coordinates[1];
                    const distance = getDistanceFromLatLonInKm(driverLat, driverLng, restLat, restLng);
                    if (distance > 10) {
                        includeOrder = false; // Outside 10km geofenced area
                    }
                }
            }
            if (includeOrder) {
                filteredOrders.push(order);
            }
        }

        res.json({ success: true, data: filteredOrders });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Error scanning orders." });
    }
};

// Accept an order
const acceptOrder = async (req, res) => {
    try {
        const { userId, orderId } = req.body;
        
        const agent = await deliveryAgentModel.findOne({ userId });
        if (!agent) {
            return res.json({ success: false, message: "Driver not onboarded." });
        }
        if (agent.activeOrderId) {
            return res.json({ success: false, message: "You already have an active delivery order! ⛔" });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found." });
        }
        if (order.deliveryAgentId) {
            return res.json({ success: false, message: "Order already claimed by another driver." });
        }

        // Bind driver to order & update status
        order.deliveryAgentId = agent.userId;
        order.status = "Out for delivery";
        await order.save();

        // Update driver model
        agent.activeOrderId = order._id;
        agent.isAvailable = false;
        await agent.save();

        // Broadcast live socket updates
        try {
            getIO().to(`order_${orderId}`).emit("status_update", { orderId, status: "Out for delivery" });
        } catch(e) {
            console.log("WebSocket status_update emit failed", e);
        }

        res.json({ success: true, message: "Order accepted! Navigate to the restaurant. 🗺️", data: order });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Error accepting order." });
    }
};

// Complete an order — DEPRECATED: use /api/order/verify-delivery-otp instead
// This endpoint is kept for backwards compat but is blocked to enforce OTP flow
const completeOrder = async (req, res) => {
    return res.json({
        success: false,
        message: "Use the OTP verification flow instead. Have the customer share their 6-digit code."
    });
};

export { onboardDriver, getDriverProfile, toggleAvailability, getAvailableOrders, acceptOrder, completeOrder };
