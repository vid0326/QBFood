import { Server } from "socket.io";
import orderModel from "../models/orderModel.js";

let io;

// Haversine formula – returns distance in metres between two lat/lng points
const haversineMetres = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// Generate a cryptographically simple 6-digit OTP
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

export const initSocket = (server) => {
    io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] }
    });

    io.on("connection", (socket) => {
        console.log(`New client connected: ${socket.id}`);

        // Customer or agent joins an order-specific room
        socket.on("join_order_room", (orderId) => {
            socket.join(`order_${orderId}`);
            console.log(`Socket ${socket.id} joined room order_${orderId}`);
        });

        // ── Delivery agent broadcasts location ──────────────────────────────
        socket.on("update_location", async (data) => {
            const { orderId, lat, lng } = data;
            if (!orderId || lat == null || lng == null) return;

            // Broadcast position to customer in real-time
            io.to(`order_${orderId}`).emit("location_update", { lat, lng });

            // ── Proximity OTP trigger ───────────────────────────────────────
            try {
                const order = await orderModel.findById(orderId);
                if (!order) return;
                if (order.status !== "Out for delivery") return;
                if (order.otpVerified) return;          // Already confirmed

                // Get customer drop-off coordinates (stored on address or geoloc)
                // Fallback to a deterministic offset from restaurant for testing/simulation if user didn't provide GPS
                let custLat = order.address?.latitude;
                let custLng = order.address?.longitude;
                
                if (!custLat || !custLng) {
                    const restCoords = order.items?.[0]?.restaurantId?.location?.coordinates;
                    custLat = restCoords?.[1] ? restCoords[1] + 0.008 : 25.9061 + 0.008;
                    custLng = restCoords?.[0] ? restCoords[0] + 0.005 : 93.7270 + 0.005;
                }

                const distMetres = haversineMetres(lat, lng, custLat, custLng);
                console.log(`Agent→Customer distance: ${distMetres.toFixed(0)}m for order ${orderId}`);

                if (distMetres <= 100) {
                    let otp = order.deliveryOTP;
                    if (!otp) {
                        otp = generateOTP();
                        order.deliveryOTP = otp;
                        order.otpGeneratedAt = new Date();
                        await order.save();
                        console.log(`OTP ${otp} generated for order ${orderId}`);
                    }

                    // Emit OTP to the CUSTOMER in this order's room
                    io.to(`order_${orderId}`).emit("otp_ready", {
                        orderId,
                        otp,
                        message: "Your delivery agent is here! Share this OTP to confirm delivery."
                    });

                    // Tell agent to prompt OTP entry (no OTP value sent to agent)
                    io.to(`order_${orderId}`).emit("agent_otp_prompt", {
                        orderId,
                        message: "You're within 100m of the customer. Ask for the OTP to confirm delivery."
                    });
                }
            } catch (err) {
                console.error("OTP proximity check failed:", err.message);
            }
        });

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
};
