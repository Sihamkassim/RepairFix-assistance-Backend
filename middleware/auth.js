import { requireAuth } from '@clerk/express';

// Middleware to require authentication
export const protect = requireAuth();

// Middleware to get user from request
export const getAuthUser = (req, res, next) => {
  try {
    if (req.auth && req.auth.userId) {
      req.userId = req.auth.userId;
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
