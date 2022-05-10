import User from './models/user';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

async function registerUser(userData) {
  try {
    let doc = { ...userData };
    doc.password = await bcrypt.hash(userData.password, 8);

    let result = await User.create(doc);
    if (result && result._id) {
      return result._id;
    }
  } catch (error) {
    if (error.code == 11000) {
      throw new Error('username or email is taken');
    }
  }
}
async function authenticateUser(email, password) {
  let user = await User.findOne({ email: email }).exec();

  if (
    user &&
    user.password &&
    (await bcrypt.compare(password, user.password))
  ) {
    delete user.password;
    let token = jwt.sign(user.toJSON(), process.env.JWT_SECRET, {
      algorithm: 'HS512',
      expiresIn: '1 week',
    });
    return {
      token,
      email: user.email,
      username: user.username,
      completedPuzzles: user.completedPuzzles,
    };
  } else {
    throw new Error('Cannot authenticate');
  }
}

// autorizacija jwt-a
async function verifyJWT(req, res, next) {
  try {
    let authorization = req.headers.authorization.split(' ');
    let type = authorization[0];
    let token = authorization[1];

    if (type !== 'Bearer') {
      return res.status(401).send();
    } else {
      req.jwt = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    }
  } catch (error) {
    return res.status(401).send();
  }
}

export default {
  registerUser,
  authenticateUser,
  verifyJWT,
};
