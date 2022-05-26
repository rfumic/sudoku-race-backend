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

// dohvat leaderboarda
app.get('/users', async (req, res, next) => {
  const { sort = '-totalPoints', limit = 20 } = req.query;

  try {
    const users = await User.find()
      .lean()
      .limit(limit)
      .sort(sort)
      .select('username totalPoints numberOfCompleted');
    res.send(users);
  } catch (error) {
    console.error(error);
  }
});

// dohvat jednog usera
app.get('/users/:username', async (req, res, next) => {
  const { username } = req.params;
  try {
    const response = await User.findOne({ username }).select(
      '_id username dateJoined completedPuzzles totalPoints'
    );
    res.send(response);
  } catch (error) {
    console.error(error);
  }
});

// update user rezultata
app.patch('/users/results/:email', [auth.verifyJWT], async (req, res) => {
  const { email } = req.params;
  const userResult = req.body;
  console.log('Updating user', email, 'with data', userResult);

  try {
    await User.findOneAndUpdate(
      { email: email },
      {
        $push: {
          completedPuzzles: userResult,
        },
        $inc: {
          totalPoints: userResult.points,
          numberOfCompleted: 1,
        },
      }
    ).exec();
    await Puzzle.findOneAndUpdate(
      { _id: userResult.id },
      {
        $push: {
          playerResults: {
            email: email,
            time: userResult.time,
            points: userResult.points,
          },
        },
      }
    );
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
  let { sort = '-dateCreated', limit, skip } = req.query;
  limit = parseInt(limit) || 10;
  skip = parseInt(skip) || 0;
  try {
    const [total, puzzles] = await Promise.all([
      await Puzzle.find().estimatedDocumentCount(),
      await Puzzle.find()
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .select('dateCreated playerResults likes name difficulty'),
    ]);
    res.send({
      total,
      puzzles,
      meta: {
        skip,
        limit,
        hasMoreData: total - (skip + limit) > 0,
      },
    });
  } catch (error) {
    console.error(error);
  }
});

// dohvat jedne ranked sudoku
app.get('/ranked/:id', [auth.verifyJWT], async (req, res, next) => {
  const { id } = req.params;
  const response = await Puzzle.findById(id).select('name puzzle solution');
  res.send(response);
});

// dohvat informacija o jednom ranked sudoku
app.get('/ranked/:id/info', [auth.verifyJWT], async (req, res, next) => {
  const { id } = req.params;
  const response = await Puzzle.findById(id).select(
    'dateCreated playerResults likes name difficulty'
  );
  res.send(response);
});

// lajkanje
app.post('/ranked/:id/likes', [auth.verifyJWT], async (req, res, next) => {
  const { id } = req.params;
  const userEmail = req.body.userEmail;

  try {
    let { likes } = await Puzzle.findById(id).select('likes');

    if (likes.includes(userEmail)) {
      likes = likes.filter((e) => e != userEmail);
    } else {
      likes.push(userEmail);
    }
    await Puzzle.updateOne({ _id: id }, { likes });
  } catch (error) {
    console.error(error);
  }
  res.json({ message: 'Likes updated' });
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
