import type { clerkClient } from '@clerk/nextjs/server';

export type UserRole = 'admin' | 'cashier' | 'kitchen-staff' | 'user';

export interface ClerkPublicMetadata {
  role?: UserRole;
}

export interface ClerkUnsafeMetadata {
  onboardingComplete?: boolean;
}

// Extend Clerk's types globally
declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: UserRole;
    };
  }
}
