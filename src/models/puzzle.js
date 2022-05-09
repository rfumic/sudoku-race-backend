import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const puzzleSchema = new Schema({
  dateCreated: {
    type: Date,
    default: Date.now,
  },
});
