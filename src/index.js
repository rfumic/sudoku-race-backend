import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import auth from './auth.js';
import mongoose from 'mongoose';
import User from './models/user.js';
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
// endpoint za random sudoku
app.get('/random', async (req, res, next) => {
  const { puzzle, solution } = await createPuzzle();
  res.send({
    puzzle,
    solution,
  });
});
// TEMPORARY TEMPORARY TEMPORARY
app.get('/users', async (req, res, next) => {
  const user = await User.find();
  res.send(user);
});
// TEMPORARY TEMPORARY TEMPORARY
// generating ranked puzzles
app.post('/ranked', async (req, res, next) => {
  res.json({ message: 'A new ranked puzzle has been generated!' });
});

app.listen(PORT, () => {
  console.log('\x1b[41m START MONGOdb!!! \x1b[0m');
  console.log(`Listening on http://localhost:${PORT}/`);
});
