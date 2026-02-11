import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
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

describe("Email Settings - SMTP Status", () => {
  it("returns SMTP configuration status for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notification.smtpStatus();
    expect(result).toHaveProperty("configured");
    expect(typeof result.configured).toBe("boolean");
    expect(result).toHaveProperty("isEnabled");
  });

  it("rejects SMTP status check for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notification.smtpStatus()).rejects.toThrow();
  });
});

describe("Email Settings - Save SMTP Config", () => {
  it("rejects saving SMTP config for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notification.saveSmtpConfig({
        smtpHost: "smtp.qq.com",
        smtpPort: 465,
        smtpUser: "test@qq.com",
        smtpPass: "authcode123",
        smtpSecure: true,
        isEnabled: true,
      })
    ).rejects.toThrow();
  });

  it("rejects saving SMTP config with empty host", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notification.saveSmtpConfig({
        smtpHost: "",
        smtpPort: 465,
        smtpUser: "test@qq.com",
        smtpPass: "authcode123",
        smtpSecure: true,
        isEnabled: true,
      })
    ).rejects.toThrow();
  });

  it("rejects saving SMTP config with empty user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notification.saveSmtpConfig({
        smtpHost: "smtp.qq.com",
        smtpPort: 465,
        smtpUser: "",
        smtpPass: "authcode123",
        smtpSecure: true,
        isEnabled: true,
      })
    ).rejects.toThrow();
  });

  it("rejects saving SMTP config with empty password", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notification.saveSmtpConfig({
        smtpHost: "smtp.qq.com",
        smtpPort: 465,
        smtpUser: "test@qq.com",
        smtpPass: "",
        smtpSecure: true,
        isEnabled: true,
      })
    ).rejects.toThrow();
  });
});

describe("Email Settings - Delete SMTP Config", () => {
  it("rejects deleting SMTP config for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notification.deleteSmtpConfig()).rejects.toThrow();
  });
});

describe("Email Settings - Test SMTP Config", () => {
  it("rejects test with unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notification.testSmtpConfig({
        smtpHost: "smtp.qq.com",
        smtpPort: 465,
        smtpUser: "test@qq.com",
        smtpPass: "authcode123",
        smtpSecure: true,
        testEmail: "recipient@example.com",
      })
    ).rejects.toThrow();
  });

  it("rejects test with invalid test email", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notification.testSmtpConfig({
        smtpHost: "smtp.qq.com",
        smtpPort: 465,
        smtpUser: "test@qq.com",
        smtpPass: "authcode123",
        smtpSecure: true,
        testEmail: "not-an-email",
      })
    ).rejects.toThrow();
  });
});

describe("Email Settings - Send Test Email (saved config)", () => {
  it("rejects for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notification.sendTestEmail({ email: "test@example.com" })
    ).rejects.toThrow();
  });

  it("rejects with invalid email address", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notification.sendTestEmail({ email: "not-an-email" })
    ).rejects.toThrow();
  });
});

describe("Email Notification - Check And Notify", () => {
  it("rejects checkAndNotify for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notification.checkAndNotify()).rejects.toThrow();
  });
});
