import type { Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { activityLogs, users, type UserPreferences } from '../../db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.dbUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ user: req.dbUser });
}

export async function updateMyProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.dbUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const body = req.body as {
      displayName?: string;
      department?: string;
      preferences?: Partial<UserPreferences>;
    };

    const nextDisplayName =
      typeof body.displayName === 'string' && body.displayName.trim()
        ? body.displayName.trim().slice(0, 80)
        : req.dbUser.displayName;
    const nextDepartment =
      typeof body.department === 'string' && body.department.trim()
        ? body.department.trim().slice(0, 80)
        : req.dbUser.department;

    const currentPrefs = req.dbUser.preferences || {
      theme: 'light',
      defaultCurrency: 'USD',
      compactTables: false,
      kpiAlertThresholdPct: 10,
      emailDigest: true,
    };

    const nextPreferences: UserPreferences = {
      theme: body.preferences?.theme === 'dark' ? 'dark' : body.preferences?.theme === 'light' ? 'light' : currentPrefs.theme,
      defaultCurrency:
        typeof body.preferences?.defaultCurrency === 'string'
          ? body.preferences.defaultCurrency
          : currentPrefs.defaultCurrency,
      compactTables:
        typeof body.preferences?.compactTables === 'boolean'
          ? body.preferences.compactTables
          : currentPrefs.compactTables,
      kpiAlertThresholdPct:
        typeof body.preferences?.kpiAlertThresholdPct === 'number' &&
        body.preferences.kpiAlertThresholdPct >= 1 &&
        body.preferences.kpiAlertThresholdPct <= 100
          ? body.preferences.kpiAlertThresholdPct
          : currentPrefs.kpiAlertThresholdPct,
      emailDigest:
        typeof body.preferences?.emailDigest === 'boolean'
          ? body.preferences.emailDigest
          : currentPrefs.emailDigest,
    };

    const [updated] = await db
      .update(users)
      .set({
        displayName: nextDisplayName,
        department: nextDepartment,
        preferences: nextPreferences,
      })
      .where(eq(users.id, req.dbUser.id))
      .returning();

    await db.insert(activityLogs).values({
      userUid: req.dbUser.uid,
      userEmail: req.dbUser.email,
      action: 'Profile Preferences Updated',
      module: 'Users',
      details: `Updated profile settings and workspace preferences (${nextPreferences.theme} theme).`,
      severity: 'info',
      isRead: true,
    });

    res.json({ user: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile preferences.' });
  }
}

export async function listUsers(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.lastLoginAt));
    res.json({ users: allUsers });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to load workspace users.' });
  }
}

export async function updateUserAccess(req: AuthRequest, res: Response): Promise<void> {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    res.status(400).json({ error: 'Invalid user ID.' });
    return;
  }

  try {
    const body = req.body as {
      role?: string;
      status?: string;
      department?: string;
    };

    const validRoles = ['admin', 'analyst', 'viewer'];
    const validStatuses = ['active', 'suspended'];

    if (body.role && !validRoles.includes(body.role)) {
      res.status(400).json({ error: 'Invalid role. Allowed: admin, analyst, viewer.' });
      return;
    }
    if (body.status && !validStatuses.includes(body.status)) {
      res.status(400).json({ error: 'Invalid status. Allowed: active, suspended.' });
      return;
    }

    const existing = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (req.dbUser && req.dbUser.id === targetId && (body.status === 'suspended' || (body.role && body.role !== 'admin'))) {
      res.status(400).json({ error: 'You cannot demote or suspend your own active admin session.' });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({
        role: body.role ?? existing[0].role,
        status: body.status ?? existing[0].status,
        department:
          typeof body.department === 'string' && body.department.trim()
            ? body.department.trim()
            : existing[0].department,
      })
      .where(eq(users.id, targetId))
      .returning();

    await db.insert(activityLogs).values({
      userUid: req.dbUser?.uid || 'system',
      userEmail: req.dbUser?.email || 'system@insightpro.io',
      action: 'User Access Modified',
      module: 'Users',
      details: `Updated ${updated.email}: role=${updated.role}, status=${updated.status}.`,
      severity: updated.status === 'suspended' ? 'warning' : 'info',
      isRead: false,
    });

    res.json({ user: updated });
  } catch (error) {
    console.error('Update user access error:', error);
    res.status(500).json({ error: 'Failed to update user access.' });
  }
}

export async function createTeamInvite(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = req.body as {
      email?: string;
      displayName?: string;
      role?: string;
      department?: string;
    };

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid work email address is required.' });
      return;
    }

    const role = ['admin', 'analyst', 'viewer'].includes(body.role || '') ? body.role! : 'analyst';
    const displayName =
      typeof body.displayName === 'string' && body.displayName.trim()
        ? body.displayName.trim()
        : email.split('@')[0];
    const department =
      typeof body.department === 'string' && body.department.trim()
        ? body.department.trim()
        : 'Business Intelligence';

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: 'A user with this email already exists in the workspace.' });
      return;
    }

    const [created] = await db
      .insert(users)
      .values({
        uid: `invited_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        email,
        displayName,
        role,
        department,
        status: 'active',
      })
      .returning();

    await db.insert(activityLogs).values({
      userUid: req.dbUser?.uid || 'system',
      userEmail: req.dbUser?.email || 'system@insightpro.io',
      action: 'Workspace Access Granted',
      module: 'Users',
      details: `Provisioned dashboard access for ${email} (${role}).`,
      severity: 'success',
      isRead: false,
    });

    res.status(201).json({ user: created });
  } catch (error) {
    console.error('Create team member error:', error);
    res.status(500).json({ error: 'Failed to provision user access.' });
  }
}
