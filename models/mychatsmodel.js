import mongoose from "mongoose";
const { Schema, model } = mongoose;

const chatSchema = new Schema(
  {
    participants: [
      {
        _id: { type: String, required: true },
        name: { type: String, required: true },
        email: { type: String, required: true, lowercase: true },
        profilePic: { type: String, default: "" },
      },
    ],
    chatid: { type: String, unique: true, required: true }, // Unique identifier for each chat pair
  },
  { timestamps: true }
);

// Ensure uniqueness on chatId
chatSchema.index({ chatid: 1 }, { unique: true });

const Chat = model("Chat", chatSchema);
export default Chat;
