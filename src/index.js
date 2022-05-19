import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import auth from './auth.js';
import mongoose from 'mongoose';
import User from './models/user.js';
import Puzzle from './models/puzzle.js';
import createPuzzle from './createpuzzle.js';

const app = express();
const PORT = process.env.port || 4000;

//  mongodb spajanje
mongoose.connect('mongodb://localhost/sudoku-race');
mongoose.Promise = global.Promise;

app.use(cors());
app.use(express.json());

// autorizacija; [auth.verifyJWT] ide tamo gdje treba bit autorizacija
app.get('/tajna', [auth.verifyJWT], (req, res) => {
  res.json({ message: 'ovo je tajna' + req.jwt.email });
});

// autentifikacija/login
app.post('/auth', async (req, res) => {
  let user = req.body;

  try {
    let result = await auth.authenticateUser(user.email, user.password);
    res.json(result);
  } catch (error) {
    console.error(error.message);
    res.status(401).json({ error: error.message });
  }
});

// dodavanje usera
app.post('/users', async (req, res) => {
  let user = req.body;
  let id;
  try {
    id = await auth.registerUser(user);
  } catch (error) {
    console.error('/users error:', error.message);
    res.status(409).json({ error: error.message });
    return;
  }
  res.json({ id: id });
});

// update user rezultata
app.patch('/users/results/:email', [auth.verifyJWT], async (req, res) => {
  const email = req.params.email;
  const userResult = req.body;
  console.log('Updating user', email, 'with data', userResult);

  try {
    await User.findOneAndUpdate(
      { email: email },
      {
        $push: {
          completedPuzzles: userResult,
        },
      }
    ).exec();
  } catch (error) {
    console.error(error);
  }
  const response = await User.findOne({ email: email }).exec();
  console.log('Response:', response);
  res.send(response);
});

// endpoint za random sudoku
app.get('/random', async (req, res, next) => {
  const { puzzle, solution } = await createPuzzle();
  res.send({
    puzzle,
    solution,
  });
});

// dohvat svih ranked sudoku
app.get('/ranked', [auth.verifyJWT], async (req, res, next) => {
  const query = req.query;
  let sort = query.sort || '-dateCreated';
  let limit = query.limit || 10;
  const puzzles = await Puzzle.find()
    .limit(limit)
    .sort(sort)
    .select('dateCreated timesCompleted likes name difficulty');
  res.send(puzzles);
});

// dohvat jedne ranked sudoku
app.get('/ranked/:id', [auth.verifyJWT], async (req, res, next) => {
  const id = req.params.id;
  const response = await Puzzle.findById(id).select('name puzzle solution');
  res.send(response);
});

// dohvat informacija o jednom ranked sudoku
app.get('/ranked/info/:id', [auth.verifyJWT], async (req, res, next) => {
  const id = req.params.id;
  const response = await Puzzle.findById(id).select(
    'dateCreated timesCompleted likes name difficulty'
  );
  res.send(response);
});

// TEMPORARY TEMPORARY TEMPORARY
app.get('/users', async (req, res, next) => {
  const user = await User.find();
  res.send(user);
});
// TEMPORARY TEMPORARY TEMPORARY
// generating ranked puzzles
app.post('/ranked', async (req, res, next) => {
  const puzzleName = req.body.name;
  const { puzzle, solution } = await createPuzzle();
  let result = await Puzzle.create({ puzzle, solution, name: puzzleName });

  res.json(result);
});

app.listen(PORT, () => {
  console.log('\x1b[41m START MONGOdb!!! \x1b[0m');
  console.log(`Listening on http://localhost:${PORT}/`);
});
