import { clerkMiddleware } from '@clerk/express';

// Clerk configuration
export const clerkConfig = {
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
};

// Export clerk middleware
export const clerk = clerkMiddleware();
