import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createMedication, getUserMedications, getMedicationById,
  updateMedication, deleteMedication, getAllMedicationsWithPrediction,
  getLowStockMedications,
  createMedicationLog, getUserMedicationLogs, getTodayLogs,
  createFamilyContact, getUserFamilyContacts, updateFamilyContact, deleteFamilyContact,
  createNotification, getUserNotifications, markNotificationRead,
} from "./db";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { sendLowStockEmail, sendTestEmailWithConfig, sendTestEmailFromDb, type LowStockMedInfo } from "./email";
import { getEmailSettings, upsertEmailSettings, deleteEmailSettings } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Medication Management ─────────────────────────────────────
  medication: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getAllMedicationsWithPrediction(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const med = await getMedicationById(input.id, ctx.user.id);
        if (!med) throw new TRPCError({ code: "NOT_FOUND", message: "药物未找到" });
        return med;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "请输入药物名称"),
        dosage: z.string().min(1, "请输入剂量"),
        frequency: z.string().min(1, "请输入服用频率"),
        timesPerDay: z.number().min(1).max(10),
        reminderTimes: z.array(z.string()).min(1, "请至少设置一个提醒时间"),
        totalQuantity: z.number().min(1, "请输入总量"),
        remainingQuantity: z.number().min(0),
        dosagePerTime: z.number().min(1).default(1),
        startDate: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createMedication({
          ...input,
          userId: ctx.user.id,
          reminderTimes: JSON.stringify(input.reminderTimes),
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        timesPerDay: z.number().min(1).max(10).optional(),
        reminderTimes: z.array(z.string()).optional(),
        totalQuantity: z.number().min(1).optional(),
        remainingQuantity: z.number().min(0).optional(),
        dosagePerTime: z.number().min(1).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, reminderTimes, ...rest } = input;
        const updateData: Record<string, unknown> = { ...rest };
        if (reminderTimes) updateData.reminderTimes = JSON.stringify(reminderTimes);
        await updateMedication(id, ctx.user.id, updateData as any);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteMedication(input.id, ctx.user.id);
        return { success: true };
      }),

    refill: protectedProcedure
      .input(z.object({
        id: z.number(),
        addQuantity: z.number().min(1, "请输入补充数量"),
      }))
      .mutation(async ({ ctx, input }) => {
        const med = await getMedicationById(input.id, ctx.user.id);
        if (!med) throw new TRPCError({ code: "NOT_FOUND", message: "药物未找到" });
        await updateMedication(input.id, ctx.user.id, {
          remainingQuantity: med.remainingQuantity + input.addQuantity,
          totalQuantity: med.totalQuantity + input.addQuantity,
        });
        return { success: true };
      }),

    lowStock: protectedProcedure
      .input(z.object({ daysThreshold: z.number().default(7) }).optional())
      .query(async ({ ctx, input }) => {
        return getLowStockMedications(ctx.user.id, input?.daysThreshold ?? 7);
      }),
  }),

  // ─── Medication Logs ───────────────────────────────────────────
  log: router({
    create: protectedProcedure
      .input(z.object({
        medicationId: z.number(),
        takenAt: z.number(),
        scheduledTime: z.string(),
        status: z.enum(["taken", "skipped", "late"]).default("taken"),
        quantity: z.number().min(1).default(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const med = await getMedicationById(input.medicationId, ctx.user.id);
        if (!med) throw new TRPCError({ code: "NOT_FOUND", message: "药物未找到" });
        if (input.status === "taken" && med.remainingQuantity < input.quantity) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "药物剩余量不足" });
        }
        const id = await createMedicationLog({
          ...input,
          userId: ctx.user.id,
        });
        return { id };
      }),

    today: protectedProcedure.query(async ({ ctx }) => {
      return getTodayLogs(ctx.user.id);
    }),

    history: protectedProcedure
      .input(z.object({
        medicationId: z.number().optional(),
        startTs: z.number().optional(),
        endTs: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getUserMedicationLogs(
          ctx.user.id,
          input?.medicationId,
          input?.startTs,
          input?.endTs,
        );
      }),
  }),

  // ─── Family Contacts ──────────────────────────────────────────
  family: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserFamilyContacts(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        contactName: z.string().min(1, "请输入亲友姓名"),
        contactEmail: z.string().email("请输入有效的邮箱地址"),
        contactPhone: z.string().optional(),
        relationship: z.string().optional(),
        notifyOnLowStock: z.boolean().default(true),
        notifyOnMissedDose: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const id = await createFamilyContact({
            ...input,
            userId: ctx.user.id,
          });
          return { id };
        } catch (error: any) {
          if (error.message === "最多只能绑定5位亲友") {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          throw error;
        }
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        relationship: z.string().optional(),
        notifyOnLowStock: z.boolean().optional(),
        notifyOnMissedDose: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateFamilyContact(id, ctx.user.id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteFamilyContact(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Notifications ────────────────────────────────────────────
  notification: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserNotifications(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    // Get user's SMTP configuration from database
    smtpStatus: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getEmailSettings(ctx.user.id);
      if (!settings) {
        return { configured: false, host: null, from: null, isEnabled: false };
      }
      return {
        configured: true,
        host: `${settings.smtpHost}:${settings.smtpPort}`,
        from: settings.smtpFrom || settings.smtpUser,
        isEnabled: settings.isEnabled,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpSecure: settings.smtpSecure,
        smtpFrom: settings.smtpFrom,
      };
    }),

    // Save SMTP configuration to database
    saveSmtpConfig: protectedProcedure
      .input(z.object({
        smtpHost: z.string().min(1, "请输入SMTP服务器地址"),
        smtpPort: z.number().min(1).max(65535).default(465),
        smtpUser: z.string().min(1, "请输入SMTP用户名"),
        smtpPass: z.string().min(1, "请输入SMTP密码/授权码"),
        smtpFrom: z.string().optional(),
        smtpSecure: z.boolean().default(true),
        isEnabled: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertEmailSettings(ctx.user.id, input);
        return { success: true };
      }),

    // Delete SMTP configuration
    deleteSmtpConfig: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteEmailSettings(ctx.user.id);
      return { success: true };
    }),

    // Test SMTP config before saving (uses raw config, not from DB)
    testSmtpConfig: protectedProcedure
      .input(z.object({
        smtpHost: z.string().min(1),
        smtpPort: z.number().min(1).max(65535),
        smtpUser: z.string().min(1),
        smtpPass: z.string().min(1),
        smtpSecure: z.boolean(),
        smtpFrom: z.string().optional(),
        testEmail: z.string().email("请输入有效的测试邮箱地址"),
      }))
      .mutation(async ({ input }) => {
        const { testEmail, ...config } = input;
        const ok = await sendTestEmailWithConfig(config, testEmail);
        if (!ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "邮件发送失败，请检查SMTP配置是否正确",
          });
        }
        return { success: true };
      }),

    // Send a test email using saved DB config
    sendTestEmail: protectedProcedure
      .input(z.object({ email: z.string().email("请输入有效的邮箱地址") }))
      .mutation(async ({ ctx, input }) => {
        const ok = await sendTestEmailFromDb(ctx.user.id, input.email);
        if (!ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "邮件发送失败，请检查SMTP配置是否正确",
          });
        }
        return { success: true };
      }),

    // Check and send low stock notifications + emails to family contacts
    checkAndNotify: protectedProcedure.mutation(async ({ ctx }) => {
      const lowStockMeds = await getLowStockMedications(ctx.user.id, 7);
      const contacts = await getUserFamilyContacts(ctx.user.id);
      const notifyContacts = contacts.filter(c => c.notifyOnLowStock);

      let notificationsSent = 0;
      let emailsSent = 0;

      for (const med of lowStockMeds) {
        // Notify user (in-app)
        await createNotification({
          userId: ctx.user.id,
          medicationId: med.id,
          type: med.daysRemaining <= 0 ? "out_of_stock" : "low_stock",
          title: med.daysRemaining <= 0 ? `${med.name} 已用尽` : `${med.name} 即将用尽`,
          content: med.daysRemaining <= 0
            ? `您的药物「${med.name}」已经用完，请尽快补充。`
            : `您的药物「${med.name}」预计还能使用 ${med.daysRemaining} 天（剩余 ${med.remainingQuantity} ${med.dosage}），预计 ${med.predictedExhaustDate.toLocaleDateString('zh-CN')} 用尽，请提前准备补充。`,
          sentAt: Date.now(),
        });
        notificationsSent++;

        // Notify family contacts (in-app)
        for (const contact of notifyContacts) {
          await createNotification({
            userId: ctx.user.id,
            contactId: contact.id,
            medicationId: med.id,
            type: med.daysRemaining <= 0 ? "out_of_stock" : "low_stock",
            title: `${ctx.user.name || "用户"}的药物「${med.name}」${med.daysRemaining <= 0 ? "已用尽" : "即将用尽"}`,
            content: med.daysRemaining <= 0
              ? `${ctx.user.name || "用户"}的药物「${med.name}」（${med.dosage}）已经用完，请帮助购买补充。`
              : `${ctx.user.name || "用户"}的药物「${med.name}」（${med.dosage}）预计还能使用 ${med.daysRemaining} 天，剩余 ${med.remainingQuantity} 份，预计 ${med.predictedExhaustDate.toLocaleDateString('zh-CN')} 用尽。请关注并帮助及时补充。`,
            sentAt: Date.now(),
          });
          notificationsSent++;
        }
      }

      // Send email notifications to family contacts (batch per contact)
      if (lowStockMeds.length > 0 && notifyContacts.length > 0) {
        const medInfos: LowStockMedInfo[] = lowStockMeds.map(med => ({
          name: med.name,
          dosage: med.dosage,
          remainingQuantity: med.remainingQuantity,
          daysRemaining: med.daysRemaining,
          predictedExhaustDate: med.predictedExhaustDate.toLocaleDateString('zh-CN'),
          dailyUsage: med.dailyUsage,
        }));

        for (const contact of notifyContacts) {
          const sent = await sendLowStockEmail({
            userId: ctx.user.id,
            recipientName: contact.contactName,
            recipientEmail: contact.contactEmail,
            userName: ctx.user.name || "用户",
            medications: medInfos,
          });
          if (sent) emailsSent++;
        }
      }

      return { notificationsSent, emailsSent, lowStockCount: lowStockMeds.length };
    }),
  }),

  // ─── Voice Transcription ──────────────────────────────────────
  voice: router({
    uploadAndTranscribe: protectedProcedure
      .input(z.object({
        audioBase64: z.string(),
        mimeType: z.string().default("audio/webm"),
        language: z.string().default("zh"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Decode base64 to buffer
        const audioBuffer = Buffer.from(input.audioBase64, "base64");

        // Check file size (16MB limit)
        const sizeMB = audioBuffer.length / (1024 * 1024);
        if (sizeMB > 16) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "音频文件过大，最大支持16MB",
          });
        }

        // Upload to S3
        const ext = input.mimeType.split("/")[1] || "webm";
        const fileKey = `voice/${ctx.user.id}/${Date.now()}.${ext}`;
        const { url } = await storagePut(fileKey, audioBuffer, input.mimeType);

        // Transcribe
        const result = await transcribeAudio({
          audioUrl: url,
          language: input.language,
          prompt: "请将用户的中文语音转为文字，可能包含药物名称、剂量、频率等医疗相关信息",
        });

        if ("error" in result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error,
          });
        }

        return { text: result.text, language: result.language };
      }),

    // Use LLM to parse voice text into medication data
    parseMedicationFromText: protectedProcedure
      .input(z.object({ text: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `你是一个药物信息提取助手。请从用户的语音文字中提取药物信息，返回JSON格式。
如果无法识别某个字段，使用null。
注意：
- name: 药物名称
- dosage: 每次剂量描述（如"1片"、"2粒"、"5ml"）
- frequency: 服用频率描述（如"每日三次"、"每天两次"）
- timesPerDay: 每天几次（数字）
- dosagePerTime: 每次几片/粒（数字）
- totalQuantity: 总量（数字，如果提到的话）
- notes: 其他备注信息`,
            },
            { role: "user", content: input.text },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "medication_info",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  name: { type: ["string", "null"], description: "药物名称" },
                  dosage: { type: ["string", "null"], description: "每次剂量" },
                  frequency: { type: ["string", "null"], description: "服用频率" },
                  timesPerDay: { type: ["number", "null"], description: "每天几次" },
                  dosagePerTime: { type: ["number", "null"], description: "每次几片" },
                  totalQuantity: { type: ["number", "null"], description: "总量" },
                  notes: { type: ["string", "null"], description: "备注" },
                },
                required: ["name", "dosage", "frequency", "timesPerDay", "dosagePerTime", "totalQuantity", "notes"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = result.choices[0]?.message?.content;
        if (!content || typeof content !== "string") {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI解析失败" });
        }
        return JSON.parse(content);
      }),
  }),
});

export type AppRouter = typeof appRouter;
