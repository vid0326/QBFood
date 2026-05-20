import express from 'express'
import authMiddleware from '../middleware/auth.js'
import { listOrders, placeOrder, updateStatus, userOrders, verifyOrder, createPaymentIntent, verifyDeliveryOTP, cancelOrder } from '../controllers/orderController.js'

const orderRouter = express.Router();

orderRouter.post('/place', authMiddleware, placeOrder)
orderRouter.post('/verify', verifyOrder)
orderRouter.post('/userorders', authMiddleware, userOrders)
orderRouter.get('/list', listOrders)
orderRouter.post('/status', updateStatus)
orderRouter.post('/create-payment-intent', authMiddleware, createPaymentIntent)
orderRouter.post('/verify-delivery-otp', authMiddleware, verifyDeliveryOTP)
orderRouter.post('/cancel', authMiddleware, cancelOrder)

export default orderRouter

 