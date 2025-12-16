import { requireAuth } from '@clerk/express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { User, Usage } from '../models/index.js';

// Middleware to require authentication
export const protect = requireAuth();

// Middleware to get user from request and ensure user exists in database
export const getAuthUser = async (req, res, next) => {
  try {
    const auth = req.auth ? req.auth() : null;
    if (!auth || !auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = auth.userId;
    req.userId = userId;

    // Check if user exists in our database
    let user = await User.findById(userId);

    // If user doesn't exist, create them
    if (!user) {
      // Fetch user details from Clerk
      const clerkUser = await clerkClient.users.getUser(userId);
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();

      // Create user in our database
      user = await User.createOrUpdate(userId, email, fullName || null);
      
      // Initialize usage tracking
      await Usage.initialize(userId);

      console.log(`✅ New user created: ${email}`);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
