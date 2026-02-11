import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@example.com",
    name: "测试用户",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Auth Router", () => {
  it("returns null for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.name).toBe("测试用户");
    expect(result?.email).toBe("test@example.com");
  });

  it("logout clears cookie and returns success", async () => {
    const clearedCookies: any[] = [];
    const ctx: TrpcContext = {
      ...createAuthContext(),
      res: {
        clearCookie: (name: string, options: any) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0].name).toBe(COOKIE_NAME);
  });
});

describe("Medication Router - Input Validation", () => {
  it("rejects medication creation without authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.medication.create({
        name: "阿司匹林",
        dosage: "1片",
        frequency: "每日3次",
        timesPerDay: 3,
        reminderTimes: ["08:00", "12:00", "18:00"],
        totalQuantity: 30,
        remainingQuantity: 30,
        dosagePerTime: 1,
        startDate: Date.now(),
      })
    ).rejects.toThrow();
  });

  it("rejects medication creation with empty name", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.medication.create({
        name: "",
        dosage: "1片",
        frequency: "每日3次",
        timesPerDay: 3,
        reminderTimes: ["08:00", "12:00", "18:00"],
        totalQuantity: 30,
        remainingQuantity: 30,
        dosagePerTime: 1,
        startDate: Date.now(),
      })
    ).rejects.toThrow();
  });

  it("rejects medication creation with empty reminder times", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.medication.create({
        name: "阿司匹林",
        dosage: "1片",
        frequency: "每日3次",
        timesPerDay: 3,
        reminderTimes: [],
        totalQuantity: 30,
        remainingQuantity: 30,
        dosagePerTime: 1,
        startDate: Date.now(),
      })
    ).rejects.toThrow();
  });

  it("rejects medication creation with invalid timesPerDay", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.medication.create({
        name: "阿司匹林",
        dosage: "1片",
        frequency: "每日3次",
        timesPerDay: 0,
        reminderTimes: ["08:00"],
        totalQuantity: 30,
        remainingQuantity: 30,
        dosagePerTime: 1,
        startDate: Date.now(),
      })
    ).rejects.toThrow();
  });
});

describe("Family Contact Router - Input Validation", () => {
  it("rejects family contact creation without authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.family.create({
        contactName: "张三",
        contactEmail: "zhangsan@example.com",
        relationship: "子女",
        notifyOnLowStock: true,
        notifyOnMissedDose: false,
      })
    ).rejects.toThrow();
  });

  it("rejects family contact creation with empty name", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.family.create({
        contactName: "",
        contactEmail: "zhangsan@example.com",
        relationship: "子女",
        notifyOnLowStock: true,
        notifyOnMissedDose: false,
      })
    ).rejects.toThrow();
  });

  it("rejects family contact creation with invalid email", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.family.create({
        contactName: "张三",
        contactEmail: "not-an-email",
        relationship: "子女",
        notifyOnLowStock: true,
        notifyOnMissedDose: false,
      })
    ).rejects.toThrow();
  });
});

describe("Medication Log Router - Input Validation", () => {
  it("rejects log creation without authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.log.create({
        medicationId: 1,
        takenAt: Date.now(),
        scheduledTime: "08:00",
        status: "taken",
        quantity: 1,
      })
    ).rejects.toThrow();
  });

  it("rejects log creation with invalid quantity", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.log.create({
        medicationId: 1,
        takenAt: Date.now(),
        scheduledTime: "08:00",
        status: "taken",
        quantity: 0,
      })
    ).rejects.toThrow();
  });
});

describe("Notification Router - Input Validation", () => {
  it("rejects notification mark read without authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notification.markRead({ id: 1 })
    ).rejects.toThrow();
  });
});

describe("Voice Router - Input Validation", () => {
  it("rejects voice transcription without authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.voice.uploadAndTranscribe({
        audioBase64: "dGVzdA==",
        mimeType: "audio/webm",
        language: "zh",
      })
    ).rejects.toThrow();
  });

  it("rejects medication parsing with empty text", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.voice.parseMedicationFromText({ text: "" })
    ).rejects.toThrow();
  });
});
