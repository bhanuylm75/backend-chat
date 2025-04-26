import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      default: '',
    },
    groups: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Group', // Assuming your Group model is named 'Group'
      }
    ]
  },
  {
    timestamps: true,
  }
);

const User = model('User', userSchema);

export default User;
