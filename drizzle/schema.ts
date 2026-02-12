import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(), // bcrypt hashed password
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Medications table - stores all medication information for a user
 */
export const medications = mysqlTable("medications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  dosage: varchar("dosage", { length: 100 }).notNull(), // e.g. "1片", "5ml"
  frequency: varchar("frequency", { length: 100 }).notNull(), // e.g. "每日3次", "每日1次"
  timesPerDay: int("timesPerDay").notNull().default(1), // number of times per day
  reminderTimes: text("reminderTimes").notNull(), // JSON array of time strings e.g. ["08:00","12:00","18:00"]
  totalQuantity: int("totalQuantity").notNull(), // total pills/units purchased
  remainingQuantity: int("remainingQuantity").notNull(), // current remaining
  dosagePerTime: int("dosagePerTime").notNull().default(1), // pills/units per dose
  startDate: bigint("startDate", { mode: "number" }).notNull(), // UTC timestamp ms
  notes: text("notes"), // additional notes
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = typeof medications.$inferInsert;

/**
 * Medication logs - records each time a user takes medication
 */
export const medicationLogs = mysqlTable("medication_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  medicationId: int("medicationId").notNull(),
  takenAt: bigint("takenAt", { mode: "number" }).notNull(), // UTC timestamp ms when actually taken
  scheduledTime: varchar("scheduledTime", { length: 10 }).notNull(), // e.g. "08:00"
  status: mysqlEnum("status", ["taken", "skipped", "late"]).notNull().default("taken"),
  quantity: int("quantity").notNull().default(1), // how many units taken
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MedicationLog = typeof medicationLogs.$inferSelect;
export type InsertMedicationLog = typeof medicationLogs.$inferInsert;

/**
 * Family contacts - users can bind up to 5 family/friend contacts
 */
export const familyContacts = mysqlTable("family_contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // the elderly user who owns this contact
  contactName: varchar("contactName", { length: 100 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 20 }),
  relationship: varchar("relationship", { length: 50 }), // e.g. "儿子", "女儿", "朋友"
  notifyOnLowStock: boolean("notifyOnLowStock").notNull().default(true),
  notifyOnMissedDose: boolean("notifyOnMissedDose").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FamilyContact = typeof familyContacts.$inferSelect;
export type InsertFamilyContact = typeof familyContacts.$inferInsert;

/**
 * Notifications - tracks all notifications sent
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contactId: int("contactId"), // null if notification is for the user themselves
  medicationId: int("medicationId"),
  type: mysqlEnum("type", ["low_stock", "out_of_stock", "missed_dose", "reminder"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").notNull().default(false),
  sentAt: bigint("sentAt", { mode: "number" }).notNull(), // UTC timestamp ms
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * User email settings - stores per-user SMTP configuration
 * Each user can configure their own SMTP server for sending email notifications
 */
export const emailSettings = mysqlTable("email_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // one config per user
  smtpHost: varchar("smtpHost", { length: 200 }).notNull(),
  smtpPort: int("smtpPort").notNull().default(465),
  smtpUser: varchar("smtpUser", { length: 320 }).notNull(),
  smtpPass: varchar("smtpPass", { length: 500 }).notNull(), // encrypted in production
  smtpFrom: varchar("smtpFrom", { length: 320 }), // optional, defaults to smtpUser
  smtpSecure: boolean("smtpSecure").notNull().default(true), // true for SSL (465), false for TLS (587)
  isEnabled: boolean("isEnabled").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailSetting = typeof emailSettings.$inferSelect;
export type InsertEmailSetting = typeof emailSettings.$inferInsert;
