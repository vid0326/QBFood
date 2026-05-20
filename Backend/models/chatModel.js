import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true, index: true },
    senderId:  { type: String, required: true },    // userId or agentId (string)
    senderName:{ type: String, required: true },
    role:      { type: String, enum: ['customer', 'agent'], required: true },
    text:      { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
});

const chatModel = mongoose.model.chat || mongoose.model('chat', messageSchema);
export default chatModel;
