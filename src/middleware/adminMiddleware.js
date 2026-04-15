// src/middleware/adminMiddleware.js
const authMiddleware = require('./auth');

// Vérifie d'abord le JWT, puis que le rôle est 'admin'
const adminMiddleware = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Vous n\'avez pas accès à cette fonction.',
      });
    }
    next();
  });
};

module.exports = adminMiddleware;
