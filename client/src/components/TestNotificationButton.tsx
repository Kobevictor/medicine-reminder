import { Bell } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

type Props = {
  permissionState: NotificationPermission;
  isSupported: boolean;
  onRequestPermission: () => Promise<boolean>;
};

export default function TestNotificationButton({
  permissionState,
  isSupported,
  onRequestPermission,
}: Props) {
  const handleTest = async () => {
    if (!isSupported) {
      toast.error("您的浏览器不支持系统通知");
      return;
    }

    if (permissionState !== "granted") {
      const granted = await onRequestPermission();
      if (!granted) {
        toast.error("请先允许通知权限");
        return;
      }
    }

    // 播放提醒音
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.7);
    } catch {
      // ignore
    }

    // 发送测试通知
    try {
      const notification = new Notification("💊 服药提醒测试", {
        body: "这是一条测试通知。如果您能看到这条消息，说明服药提醒功能已正常工作！",
        icon: "/favicon.ico",
        tag: "test-notification",
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 10000);
      toast.success("测试通知已发送，请查看桌面通知");
    } catch {
      toast.error("发送通知失败");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-base golden-border"
      onClick={handleTest}
    >
      <Bell className="w-4 h-4 mr-2" />
      测试通知
    </Button>
  );
}
