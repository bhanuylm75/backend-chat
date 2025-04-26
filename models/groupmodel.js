import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
      }
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: 'User', // User who is the admin of the group
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

const Group = model('Group', groupSchema);

export default Group;
