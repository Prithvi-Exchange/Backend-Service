const jwt = require('jsonwebtoken');
const { User } = require('../../models/user/User');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Pass JWT errors to the centralized error handler
      return next(err);
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token: user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};