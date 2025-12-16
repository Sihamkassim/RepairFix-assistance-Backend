import express from 'express';
import userRoutes from './userRoutes.js';
import chatRoutes from './chatRoutes.js';

const router = express.Router();

// API routes
router.use('/user', userRoutes);
router.use('/chat', chatRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'RepairFix Assistant API is running' });
});

export default router;
