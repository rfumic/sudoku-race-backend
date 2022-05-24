import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  dateJoined: {
    type: Date,
    default: Date.now,
  },
  completedPuzzles: {
    type: Array,
    default: [],
  },
  numberOfCompleted: {
    type: Number,
    default: 0,
    required: true,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
});

const User = mongoose.model('user', userSchema);
export default User;
