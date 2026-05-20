import express from "express";
import cors from "cors"
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import foodRouter from "./routes/foodRoute.js";
import userRouter from "./routes/userRoute.js";
import 'dotenv/config'
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import restaurantRouter from "./routes/restaurantRoute.js";
import reviewRouter from "./routes/reviewRoute.js";
import couponRouter from "./routes/couponRoute.js";
import recommendationRouter from "./routes/recommendationRoute.js";
import deliveryRouter from "./routes/deliveryRoute.js";
import notificationRouter from "./routes/notificationRoute.js";
import chatRouter from "./routes/chatRoute.js";
import http from "http";
import { initSocket } from "./config/socket.js";

// app configurations
const app = express();
const port = process.env.PORT || 4000;

// #9 CORS — restrict to known origins (add VITE_FRONTEND_URL to .env for prod)
const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000"
];
app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (curl, mobile apps, same-origin)
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true
}));

// #7 Rate Limiters
const authLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 10,
    message: { success: false, message: "Too many requests. Please wait a minute." },
    standardHeaders: true, legacyHeaders: false
});
const orderLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { success: false, message: "Order rate limit exceeded. Please slow down." },
    standardHeaders: true, legacyHeaders: false
});

app.use(express.json())


// DB Connection 
connectDB();

// API Endpoint 
app.use("/api/food", foodRouter)
app.use("/images", express.static('uploads'))
app.use("/api/user", authLimiter, userRouter)    // #7: rate limited
app.use('/api/cart', cartRouter)
app.use('/api/order', orderLimiter, orderRouter) // #7: rate limited
app.use('/api/restaurant', restaurantRouter)
app.use('/api/review', reviewRouter)
app.use('/api/coupon', couponRouter)
app.use('/api/recommendation', recommendationRouter)
app.use('/api/delivery', deliveryRouter)
app.use('/api/notifications', authLimiter, notificationRouter)
app.use('/api/chat', chatRouter) // #32: Live order chat

// Http Requests
app.get('/', (req, res) => {
    res.send("API Working")
});


// To Run on port 4000
const server = http.createServer(app);
initSocket(server);

server.listen(port,()=>{
    console.log(`Server Running on http://localhost:${port}`)
})