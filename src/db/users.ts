import { count, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { activityLogs, users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  photoUrl?: string
) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      const updated = await db
        .update(users)
        .set({
          email,
          displayName: displayName || existing[0].displayName,
          photoUrl: photoUrl ?? existing[0].photoUrl,
          lastLoginAt: new Date(),
        })
        .where(eq(users.uid, uid))
        .returning();
      return updated[0];
    }

    const totalUsersResult = await db.select({ value: count() }).from(users);
    const isFirstUser = Number(totalUsersResult[0]?.value ?? 0) === 0;
    const initialRole = isFirstUser ? 'admin' : 'analyst';

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'Executive User',
        photoUrl: photoUrl || null,
        role: initialRole,
        department: isFirstUser ? 'Executive Analytics' : 'Business Intelligence',
        status: 'active',
        lastLoginAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          lastLoginAt: new Date(),
        },
      })
      .returning();

    await db.insert(activityLogs).values({
      userUid: uid,
      userEmail: email,
      action: 'User Provisioned',
      module: 'Users',
      details: `${email} joined INSIGHT PRO with role ${inserted[0].role}.`,
      severity: 'info',
      isRead: false,
    });

    return inserted[0];
  } catch (error) {
    console.error('Database user synchronization failed:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}
