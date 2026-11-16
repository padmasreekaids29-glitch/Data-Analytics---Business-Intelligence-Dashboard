import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../../db/users.ts';
import type { UserPreferences } from '../../db/schema.ts';

export interface DbUserRecord {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: string;
  department: string;
  status: string;
  preferences: UserPreferences;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: DbUserRecord;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const email = decodedToken.email || `${decodedToken.uid}@insightpro.local`;
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      email,
      decodedToken.name,
      decodedToken.picture
    );

    if (dbUser.status === 'suspended') {
      res.status(403).json({
        error: 'Account suspended. Contact your INSIGHT PRO administrator.',
      });
      return;
    }

    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!allowedRoles.includes(req.dbUser.role)) {
      res.status(403).json({
        error: `Forbidden: Requires ${allowedRoles.join(' or ')} permissions.`,
      });
      return;
    }
    next();
  };
};
