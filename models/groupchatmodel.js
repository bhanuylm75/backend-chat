import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  senderId: { type: String,required: true },
  text: { type: String, required: true },
  senderName: { type: String, required: true },
}, {
  timestamps: true
});

const Groupmessage = mongoose.model("Groupmessage", messageSchema);

export default Groupmessage;
