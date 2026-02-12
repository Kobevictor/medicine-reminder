import { useEffect, useRef, useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * 药物服药提醒 Hook
 *
 * 功能：
 * 1. 请求浏览器通知权限
 * 2. 每 30 秒检查一次是否到了服药时间
 * 3. 到时间后发送系统桌面通知
 * 4. 同一个时间点的提醒只发送一次（避免重复）
 * 5. 提前 1 分钟提醒（可配置）
 */

type ReminderItem = {
  medId: number;
  medName: string;
  dosage: string;
  time: string; // "HH:mm"
};

// 已经发送过通知的 key 集合（当天有效）
const notifiedSet = new Set<string>();

// 获取当天日期字符串，用于重置通知记录
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

let lastDayKey = getTodayKey();

function resetIfNewDay() {
  const today = getTodayKey();
  if (today !== lastDayKey) {
    notifiedSet.clear();
    lastDayKey = today;
  }
}

/**
 * 播放提醒音效
 */
function playReminderSound() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 播放两声 "叮咚"
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.35); // C#6
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.35);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.7);
  } catch {
    // 静默失败，音效不是核心功能
  }
}

/**
 * 发送系统通知
 */
function sendSystemNotification(title: string, body: string, onClick?: () => void) {
  // 先播放声音
  playReminderSound();

  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: `med-reminder-${Date.now()}`,
      requireInteraction: true, // 通知不会自动消失，需要用户手动关闭
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    // 30 秒后自动关闭
    setTimeout(() => notification.close(), 30000);
  } catch {
    // 某些环境不支持 Notification 构造函数
  }
}

export function useMedicationReminder() {
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 获取药物列表和今日服药记录
  const { data: medications } = trpc.medication.list.useQuery(undefined, {
    refetchInterval: 60000, // 每分钟刷新一次
  });
  const { data: todayLogs } = trpc.log.today.useQuery(undefined, {
    refetchInterval: 60000,
  });

  /**
   * 请求通知权限
   */
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.warn("[Reminder] 此浏览器不支持系统通知");
      return false;
    }

    if (Notification.permission === "granted") {
      setPermissionState("granted");
      return true;
    }

    if (Notification.permission === "denied") {
      setPermissionState("denied");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);
      return result === "granted";
    } catch {
      return false;
    }
  }, []);

  /**
   * 检查是否需要发送提醒
   */
  const checkReminders = useCallback(() => {
    if (!medications || medications.length === 0) return;

    resetIfNewDay();

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

    // 收集当前时间需要提醒的药物
    const remindersToSend: ReminderItem[] = [];

    for (const med of medications) {
      if (!med.isActive) continue;

      let times: string[] = [];
      try {
        times = JSON.parse(med.reminderTimes || "[]");
      } catch {
        continue;
      }

      for (const time of times) {
        // 检查是否已经服用
        const alreadyTaken = todayLogs?.some(
          (log) => log.medicationId === med.id && log.scheduledTime === time
        );
        if (alreadyTaken) continue;

        // 检查时间是否匹配（精确到分钟）
        const [targetHour, targetMinute] = time.split(":").map(Number);
        const diffMinutes = (currentHour * 60 + currentMinute) - (targetHour * 60 + targetMinute);

        // 在服药时间的 0~2 分钟内提醒
        if (diffMinutes >= 0 && diffMinutes <= 2) {
          const notifyKey = `${getTodayKey()}-${med.id}-${time}`;
          if (!notifiedSet.has(notifyKey)) {
            remindersToSend.push({
              medId: med.id,
              medName: med.name,
              dosage: med.dosage,
              time,
            });
            notifiedSet.add(notifyKey);
          }
        }
      }
    }

    // 发送通知
    if (remindersToSend.length === 0) return;

    if (remindersToSend.length === 1) {
      const item = remindersToSend[0];
      sendSystemNotification(
        `💊 该吃药了！`,
        `${item.medName}（${item.dosage}）\n提醒时间：${item.time}`,
        () => window.focus()
      );
    } else {
      // 多个药物一起提醒
      const medList = remindersToSend
        .map((item) => `• ${item.medName}（${item.dosage}）`)
        .join("\n");
      sendSystemNotification(
        `💊 该吃药了！（${remindersToSend.length}种药物）`,
        medList,
        () => window.focus()
      );
    }
  }, [medications, todayLogs]);

  // 启动定时检查
  useEffect(() => {
    // 首次请求权限
    requestPermission();

    // 立即检查一次
    checkReminders();

    // 每 30 秒检查一次
    timerRef.current = setInterval(checkReminders, 30000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [checkReminders, requestPermission]);

  return {
    permissionState,
    requestPermission,
    checkReminders,
    isSupported: typeof window !== "undefined" && "Notification" in window,
  };
}
