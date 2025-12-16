import express from 'express';
import { protect, getAuthUser } from '../middleware/auth.js';
import { getUserProfile, getUserConversations, getUserUsage } from '../controllers/userController.js';

const router = express.Router();

// All routes require authentication and auto-create user if needed
router.use(protect, getAuthUser);

// User routes
router.get('/profile', getUserProfile);
router.get('/conversations', getUserConversations);
router.get('/usage', getUserUsage);

export default router;
