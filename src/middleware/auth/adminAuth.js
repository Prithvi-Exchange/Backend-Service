const { User } = require('../../models/user/User');

exports.requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin (user_type = 1)
    if (req.user.user_type !== 1 && !req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error.message);
    res.status(500).json({ error: 'Authorization failed' });
  }
};