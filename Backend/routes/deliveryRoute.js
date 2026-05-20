import express from "express";
import authMiddleware from "../middleware/auth.js";
import { 
    onboardDriver, 
    getDriverProfile, 
    toggleAvailability, 
    getAvailableOrders, 
    acceptOrder, 
    completeOrder 
} from "../controllers/deliveryController.js";

const deliveryRouter = express.Router();

deliveryRouter.post("/onboard", authMiddleware, onboardDriver);
deliveryRouter.post("/profile", authMiddleware, getDriverProfile);
deliveryRouter.post("/status", authMiddleware, toggleAvailability);
deliveryRouter.get("/orders", authMiddleware, getAvailableOrders);
deliveryRouter.post("/accept", authMiddleware, acceptOrder);
deliveryRouter.post("/complete", authMiddleware, completeOrder);

export default deliveryRouter;
