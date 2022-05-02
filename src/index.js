import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import auth from './auth.js';
import mongoose from 'mongoose';

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
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ id: id });
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}/`);
});
