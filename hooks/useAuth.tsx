// Auth hook consumer
// Powered by OnSpace.AI

import { useContext } from 'react';
import { AuthContext, UserProfile } from '@/contexts/AuthContext';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { UserProfile };
