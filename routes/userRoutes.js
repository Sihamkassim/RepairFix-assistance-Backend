import express from 'express';
import { protect } from '../middleware/auth.js';
import { getUserProfile, getProtectedData } from '../controllers/userController.js';

const router = express.Router();

// Protected routes
router.get('/profile', protect, getUserProfile);
router.get('/protected', protect, getProtectedData);

export default router;
