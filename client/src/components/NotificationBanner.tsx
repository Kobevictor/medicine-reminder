import { Bell, BellOff, BellRing, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

type Props = {
  permissionState: NotificationPermission;
  isSupported: boolean;
  onRequestPermission: () => Promise<boolean>;
};

export default function NotificationBanner({
  permissionState,
  isSupported,
  onRequestPermission,
}: Props) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("notification-banner-dismissed") === "true";
  });
  const [requesting, setRequesting] = useState(false);

  // 已授权或已关闭横幅，不显示
  if (permissionState === "granted" || dismissed) return null;

  // 浏览器不支持
  if (!isSupported) return null;

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await onRequestPermission();
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("notification-banner-dismissed", "true");
  };

  if (permissionState === "denied") {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <BellOff className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1">
          <p className="text-base font-semibold text-orange-800">通知权限已被拒绝</p>
          <p className="text-sm text-orange-600 mt-0.5">
            请在浏览器设置中手动开启通知权限，以接收服药提醒。
            点击地址栏左侧的锁图标 → 网站设置 → 通知 → 允许。
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-orange-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4 text-orange-400" />
        </button>
      </div>
    );
  }

  // default 状态：提示用户开启
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <BellRing className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1">
        <p className="text-base font-semibold text-blue-800">开启服药提醒通知</p>
        <p className="text-sm text-blue-600 mt-0.5">
          开启后，到了服药时间系统会自动弹出桌面通知提醒您按时服药。
        </p>
      </div>
      <Button
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
        onClick={handleRequest}
        disabled={requesting}
      >
        <Bell className="w-4 h-4 mr-1" />
        {requesting ? "请求中..." : "开启通知"}
      </Button>
      <button
        onClick={handleDismiss}
        className="p-1 rounded hover:bg-blue-100 transition-colors shrink-0"
      >
        <X className="w-4 h-4 text-blue-400" />
      </button>
    </div>
  );
}
