import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    userId:    { type: String, required: true, index: true },
    type:      { type: String, default: 'info' },  // 'order', 'delivery', 'promo', 'info'
    title:     { type: String, required: true },
    message:   { type: String, required: true },
    orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'order', default: null },
    read:      { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const notificationModel = mongoose.model.notification || mongoose.model('notification', notificationSchema);
export default notificationModel;
