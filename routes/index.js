import express from 'express';
import userRoutes from './userRoutes.js';

const router = express.Router();

// API routes
router.use('/user', userRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'RepairFix Assistant API is running' });
});

export default router;
