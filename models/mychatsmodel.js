import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const chatSchema = new Schema(
  {
    userid: {
      type: String,
      required: true,
      trim: true,
    },
    chatPartner: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      profilePic: { type: String, default: "" },
      _id: { type: String, required: true }, // storing partner's id as a string
    }
  },
  {
    timestamps: true,
  }
);

// Create a compound index so that each (userid, chatPartner._id) pair is unique
chatSchema.index({ userid: 1, "chatPartner._id": 1 }, { unique: true });

const Chat = model('Chat', chatSchema);
export default Chat;
