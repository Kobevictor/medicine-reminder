import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  medications, InsertMedication, Medication,
  medicationLogs, InsertMedicationLog,
  familyContacts, InsertFamilyContact,
  notifications, InsertNotification,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User Queries ────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Medication Queries ──────────────────────────────────────────
export async function createMedication(data: InsertMedication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(medications).values(data);
  return result[0].insertId;
}

export async function getUserMedications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(medications)
    .where(and(eq(medications.userId, userId), eq(medications.isActive, true)))
    .orderBy(desc(medications.createdAt));
}

export async function getMedicationById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(medications)
    .where(and(eq(medications.id, id), eq(medications.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateMedication(id: number, userId: number, data: Partial<InsertMedication>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(medications).set(data)
    .where(and(eq(medications.id, id), eq(medications.userId, userId)));
}

export async function deleteMedication(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(medications).set({ isActive: false })
    .where(and(eq(medications.id, id), eq(medications.userId, userId)));
}

// ─── Medication Log Queries ──────────────────────────────────────
export async function createMedicationLog(data: InsertMedicationLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(medicationLogs).values(data);
  // Decrease remaining quantity
  await db.update(medications)
    .set({ remainingQuantity: sql`${medications.remainingQuantity} - ${data.quantity}` })
    .where(eq(medications.id, data.medicationId));
  return result[0].insertId;
}

export async function getUserMedicationLogs(userId: number, medicationId?: number, startTs?: number, endTs?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(medicationLogs.userId, userId)];
  if (medicationId) conditions.push(eq(medicationLogs.medicationId, medicationId));
  if (startTs) conditions.push(gte(medicationLogs.takenAt, startTs));
  if (endTs) conditions.push(lte(medicationLogs.takenAt, endTs));
  return db.select().from(medicationLogs)
    .where(and(...conditions))
    .orderBy(desc(medicationLogs.takenAt));
}

export async function getTodayLogs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
  return db.select().from(medicationLogs)
    .where(and(
      eq(medicationLogs.userId, userId),
      gte(medicationLogs.takenAt, startOfDay),
      lte(medicationLogs.takenAt, endOfDay)
    ))
    .orderBy(desc(medicationLogs.takenAt));
}

// ─── Family Contact Queries ──────────────────────────────────────
export async function createFamilyContact(data: InsertFamilyContact) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if user already has 5 contacts
  const existing = await db.select().from(familyContacts)
    .where(and(eq(familyContacts.userId, data.userId), eq(familyContacts.isActive, true)));
  if (existing.length >= 5) {
    throw new Error("最多只能绑定5位亲友");
  }
  const result = await db.insert(familyContacts).values(data);
  return result[0].insertId;
}

export async function getUserFamilyContacts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(familyContacts)
    .where(and(eq(familyContacts.userId, userId), eq(familyContacts.isActive, true)))
    .orderBy(desc(familyContacts.createdAt));
}

export async function updateFamilyContact(id: number, userId: number, data: Partial<InsertFamilyContact>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(familyContacts).set(data)
    .where(and(eq(familyContacts.id, id), eq(familyContacts.userId, userId)));
}

export async function deleteFamilyContact(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(familyContacts).set({ isActive: false })
    .where(and(eq(familyContacts.id, id), eq(familyContacts.userId, userId)));
}

// ─── Notification Queries ────────────────────────────────────────
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function getUserNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.sentAt))
    .limit(limit);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

// ─── Prediction Helpers ──────────────────────────────────────────
export async function getLowStockMedications(userId: number, daysThreshold = 7) {
  const meds = await getUserMedications(userId);
  return meds.filter(med => {
    const dailyUsage = med.timesPerDay * med.dosagePerTime;
    if (dailyUsage <= 0) return false;
    const daysRemaining = med.remainingQuantity / dailyUsage;
    return daysRemaining <= daysThreshold && med.remainingQuantity > 0;
  }).map(med => {
    const dailyUsage = med.timesPerDay * med.dosagePerTime;
    const daysRemaining = Math.floor(med.remainingQuantity / dailyUsage);
    const predictedExhaustDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
    return { ...med, daysRemaining, predictedExhaustDate, dailyUsage };
  });
}

export async function getAllMedicationsWithPrediction(userId: number) {
  const meds = await getUserMedications(userId);
  return meds.map(med => {
    const dailyUsage = med.timesPerDay * med.dosagePerTime;
    const daysRemaining = dailyUsage > 0 ? Math.floor(med.remainingQuantity / dailyUsage) : 999;
    const predictedExhaustDate = dailyUsage > 0
      ? new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000)
      : null;
    return { ...med, daysRemaining, predictedExhaustDate, dailyUsage };
  });
}
