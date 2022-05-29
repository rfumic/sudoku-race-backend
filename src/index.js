import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { generateSlug } from 'random-word-slugs';
import auth from './auth.js';
import User from './models/user.js';
import Puzzle from './models/puzzle.js';
import createPuzzle from './createpuzzle.js';

const app = express();
const PORT = process.env.port || 4000;
let requestCount = 0;
//  mongodb spajanje
mongoose.connect('mongodb://localhost/sudoku-race');
mongoose.Promise = global.Promise;

app.use(cors());
app.use(express.json());

async function generatePuzzle() {
  console.log(requestCount);
  if (requestCount > 2) {
    const puzzleName = generateSlug();
    const { puzzle, solution } = await createPuzzle();
    await Puzzle.create({ puzzle, solution, name: puzzleName });
    requestCount = 0;
  } else {
    requestCount += 1;
  }
}

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
  let { sort = '-totalPoints', limit, skip } = req.query;
  limit = parseInt(limit) || 20;
  skip = parseInt(skip) || 0;

  try {
    const [total, users] = await Promise.all([
      await User.find().estimatedDocumentCount(),
      await User.find()
        .lean()
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .select('username totalPoints numberOfCompleted'),
    ]);
    res.status(201).send({
      total,
      users,
      meta: {
        skip,
        limit,
        hasMoreData: total - (skip + limit) > 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'server error' });
  }
});

// dohvat jednog usera
app.get('/users/:username', async (req, res, next) => {
  const { username } = req.params;
  try {
    let response = await User.findOne({ username }).select(
      '_id username dateJoined completedPuzzles totalPoints'
    );
    if (!response) {
      response = await User.findOne({ email: username }).select(
        '_id username dateJoined completedPuzzles totalPoints'
      );
    }
    res.send(response);
  } catch (error) {
    console.error(error);
  }
});

// update korisnickog racuna
app.patch('/users', [auth.verifyJWT], async (req, res) => {
  const request = req.body;
  const username = req.jwt.username;
  const email = req.jwt.email;

  if (request.new_password && request.old_password) {
    const result = await auth.changeUserPassword(
      username,
      request.old_password,
      request.new_password
    );
    if (result) {
      res.status(201).send();
    } else {
      res.status(500).json({ error: 'cannot chage password' });
    }
  } else if (request.new_username) {
    try {
      await User.findOneAndUpdate(
        { username },
        { username: request.new_username }
      );
      res.status(201).send();
    } catch (error) {
      res.status(500).json({ error: 'cannot chage username' });
    }
  } else if (request.new_email) {
    try {
      await User.findOneAndUpdate({ email }, { email: request.new_email });
      res.status(201).send();
    } catch (error) {
      res.status(500).json({ error: 'cannot chage username' });
    }
  } else {
    res.status(400).json({ error: 'wrong request' });
  }
});

// update user rezultata
app.patch('/users/results/:email', [auth.verifyJWT], async (req, res) => {
  const { email } = req.params;

  const userResult = req.body;

  if (req.jwt.email != email) {
    res.status(401).json({ error: 'unauthorized request' });
    return;
  }
  try {
    const [a, b, response, c] = await Promise.all([
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
      ).exec(),
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
      ),
      await User.findOne({ email: email }).exec(),
      await generatePuzzle(),
    ]);
    res.send(response);
  } catch (error) {
    res.status(500).json({ error: 'server error' });
  }
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
        .select(
          'dateCreated playerResults likes name difficulty numberOfLikes'
        ),
    ]);
    res.status(201).send({
      total,
      puzzles,
      meta: {
        skip,
        limit,
        hasMoreData: total - (skip + limit) > 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'server error' });
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
  const email = req.body.userEmail;

  if (req.jwt.email != email) {
    res.status(401).json({ error: 'unauthorized request' });
    return;
  }

  try {
    let { likes } = await Puzzle.findById(id).select('likes');

    if (likes.includes(email)) {
      likes = likes.filter((e) => e != email);
    } else {
      likes.push(email);
    }
    await Puzzle.updateOne(
      { _id: id },
      {
        likes,
        $inc: {
          numberOfLikes: 1,
        },
      }
    );
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
