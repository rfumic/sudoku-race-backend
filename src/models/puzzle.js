import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const puzzleSchema = new Schema({
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  puzzle: {
    type: Array,
    required: true,
  },
  solution: {
    type: Array,
    required: true,
  },
  playerResults: {
    type: Array,
    default: [],
  },
  likes: {
    type: Array,
    default: [],
  },
  difficulty: {
    type: Number,
    default: 3,
  },
  name: {
    type: String,
    default: 'untitled puzzle',
  },
});
const Puzzle = mongoose.model('puzzle', puzzleSchema);
export default Puzzle;
