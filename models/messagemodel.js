import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    chatId: {
      type: String,
      required: true,
      trim: true,
    },
    senderId: {
      type: String,
      required: true,
      trim: true,
    },
    receiverId: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000, // Optional: limit the message length
    },
    // If you prefer a Date over a numeric timestamp, you can use createdAt from timestamps
    // timestamp: {
    //   type: Date,
    //   default: Date.now,
    // },
  },
  {
    timestamps: true, // This creates createdAt and updatedAt automatically
  }
);

const Message = model('Message', messageSchema);

export default Message;
