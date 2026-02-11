import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  AlertTriangle,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Pill,
} from "lucide-react";
import { toast } from "sonner";

export default function Notifications() {
  const utils = trpc.useUtils();
  const { data: notifications, isLoading } =
    trpc.notification.list.useQuery();

  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
    },
  });

  const checkNotify = trpc.notification.checkAndNotify.useMutation({
    onSuccess: (data) => {
      utils.notification.list.invalidate();
      if (data.lowStockCount > 0) {
        toast.success(`检测到 ${data.lowStockCount} 种药物即将用尽，已发送 ${data.notificationsSent} 条通知`);
      } else {
        toast.info("目前所有药物储备充足");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case "out_of_stock":
        return <Package className="w-6 h-6 text-red-500" />;
      case "missed_dose":
        return <XCircle className="w-6 h-6 text-red-500" />;
      case "reminder":
        return <Clock className="w-6 h-6 text-blue-500" />;
      default:
        return <Bell className="w-6 h-6 text-gold" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "low_stock":
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-sm">
            即将用尽
          </Badge>
        );
      case "out_of_stock":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300 text-sm">
            已用尽
          </Badge>
        );
      case "missed_dose":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300 text-sm">
            漏服提醒
          </Badge>
        );
      case "reminder":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-sm">
            服药提醒
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground text-sm">
            通知
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-elder-xl text-muted-foreground animate-pulse">
          正在加载通知...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-elder-3xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-8 h-8 text-gold" />
            消息通知
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            查看药物用尽预警和亲友通知记录
          </p>
        </div>
        <Button
          size="lg"
          className="text-lg py-5 px-5 rounded-xl bg-primary hover:bg-navy-light"
          onClick={() => checkNotify.mutate()}
          disabled={checkNotify.isPending}
        >
          <Bell className="w-5 h-5 mr-2" />
          {checkNotify.isPending ? "检查中..." : "检查并通知"}
        </Button>
      </div>

      {/* Notifications list */}
      {!notifications || notifications.length === 0 ? (
        <Card className="golden-border bg-card">
          <CardContent className="py-16 text-center">
            <Bell className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-elder-2xl text-muted-foreground mb-4">
              暂无通知消息
            </p>
            <p className="text-base text-muted-foreground">
              当药物即将用尽时，系统会自动生成通知
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className={`golden-border bg-card transition-all hover:golden-glow ${
                !notif.isRead ? "border-l-4 border-l-gold" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">{getTypeIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3
                        className={`text-elder-xl font-semibold ${
                          !notif.isRead
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {notif.title}
                      </h3>
                      {getTypeBadge(notif.type)}
                      {!notif.isRead && (
                        <Badge className="bg-gold/20 text-gold-dark border-gold/30 text-sm">
                          未读
                        </Badge>
                      )}
                    </div>
                    <p className="text-base text-muted-foreground mt-2 leading-relaxed">
                      {notif.content}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-sm text-muted-foreground">
                        {new Date(notif.sentAt).toLocaleString("zh-CN")}
                      </p>
                      {!notif.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-base text-gold hover:text-gold-dark"
                          onClick={() =>
                            markReadMutation.mutate({ id: notif.id })
                          }
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          标为已读
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
