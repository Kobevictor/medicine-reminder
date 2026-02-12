import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import NotificationBanner from "@/components/NotificationBanner";
import TestNotificationButton from "@/components/TestNotificationButton";
import { useMedicationReminder } from "@/hooks/useMedicationReminder";
import {
  Pill,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Bell,
  Plus,
  ArrowRight,
  Heart,
  Calendar,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useMemo } from "react";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { permissionState, requestPermission, isSupported } = useMedicationReminder();

  const { data: medications, isLoading: medsLoading } =
    trpc.medication.list.useQuery();
  const { data: todayLogs, isLoading: logsLoading } =
    trpc.log.today.useQuery();
  const { data: lowStockMeds } = trpc.medication.lowStock.useQuery();
  const { data: contacts } = trpc.family.list.useQuery();

  const checkNotify = trpc.notification.checkAndNotify.useMutation({
    onSuccess: (data) => {
      if (data.lowStockCount > 0) {
        toast.success(`已发送 ${data.notificationsSent} 条提醒通知`);
      } else {
        toast.info("目前没有需要提醒的药物");
      }
    },
  });

  // Calculate today's schedule
  const todaySchedule = useMemo(() => {
    if (!medications) return [];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const schedule: Array<{
      medId: number;
      medName: string;
      dosage: string;
      time: string;
      taken: boolean;
      isPast: boolean;
    }> = [];

    for (const med of medications) {
      const times: string[] = JSON.parse(med.reminderTimes || "[]");
      for (const time of times) {
        const taken =
          todayLogs?.some(
            (log) =>
              log.medicationId === med.id && log.scheduledTime === time
          ) ?? false;
        schedule.push({
          medId: med.id,
          medName: med.name,
          dosage: med.dosage,
          time,
          taken,
          isPast: time < currentTime,
        });
      }
    }

    return schedule.sort((a, b) => a.time.localeCompare(b.time));
  }, [medications, todayLogs]);

  const completedCount = todaySchedule.filter((s) => s.taken).length;
  const totalCount = todaySchedule.length;
  const completionRate =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return "夜深了";
    if (hour < 12) return "早上好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  }, []);

  if (medsLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center animate-pulse">
            <Heart className="w-8 h-8 text-gold" />
          </div>
          <p className="text-elder-xl text-muted-foreground">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-elder-3xl font-bold text-foreground">
            {greeting}，{user?.name || "用户"}
          </h1>
          <p className="text-elder-xl text-muted-foreground mt-1">
            <Calendar className="inline-block w-5 h-5 mr-1 -mt-0.5" />
            {new Date().toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <TestNotificationButton
            permissionState={permissionState}
            isSupported={isSupported}
            onRequestPermission={requestPermission}
          />
          <Button
            size="lg"
            className="text-lg py-6 px-6 rounded-xl bg-primary hover:bg-navy-light"
            onClick={() => setLocation("/medications")}
          >
            <Plus className="w-5 h-5 mr-2" />
            添加药物
          </Button>
        </div>
      </div>

      {/* Notification permission banner */}
      <NotificationBanner
        permissionState={permissionState}
        isSupported={isSupported}
        onRequestPermission={requestPermission}
      />

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="golden-border golden-glow bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                <Pill className="w-7 h-7 text-gold" />
              </div>
              <div>
                <p className="text-muted-foreground text-base">管理药物</p>
                <p className="text-3xl font-bold text-foreground">
                  {medications?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="golden-border golden-glow bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-base">今日完成</p>
                <p className="text-3xl font-bold text-foreground">
                  {completedCount}/{totalCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="golden-border golden-glow bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-7 h-7 text-orange-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-base">即将用尽</p>
                <p className="text-3xl font-bold text-foreground">
                  {lowStockMeds?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="golden-border golden-glow bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-base">绑定亲友</p>
                <p className="text-3xl font-bold text-foreground">
                  {contacts?.length || 0}/5
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's completion progress */}
      {totalCount > 0 && (
        <Card className="golden-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-elder-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-gold" />
              今日服药进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-2">
              <Progress value={completionRate} className="flex-1 h-4" />
              <span className="text-elder-xl font-bold text-foreground min-w-[4rem] text-right">
                {completionRate}%
              </span>
            </div>
            <p className="text-base text-muted-foreground">
              已完成 {completedCount} 项，共 {totalCount} 项服药计划
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's schedule */}
        <Card className="golden-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-elder-2xl font-bold flex items-center gap-2">
                <Clock className="w-6 h-6 text-gold" />
                今日计划
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-base text-gold hover:text-gold-dark"
                onClick={() => setLocation("/logs")}
              >
                查看全部 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <div className="text-center py-8">
                <Pill className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-elder-xl text-muted-foreground">
                  暂无服药计划
                </p>
                <Button
                  variant="outline"
                  className="mt-4 text-base golden-border"
                  onClick={() => setLocation("/medications")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加药物
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedule.slice(0, 6).map((item, idx) => (
                  <div
                    key={`${item.medId}-${item.time}-${idx}`}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                      item.taken
                        ? "bg-green-50 border border-green-200"
                        : item.isPast
                          ? "bg-orange-50 border border-orange-200"
                          : "bg-muted/50 border border-border"
                    }`}
                  >
                    <div className="text-center min-w-[60px]">
                      <p className="text-elder-xl font-bold text-foreground">
                        {item.time}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-foreground truncate">
                        {item.medName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.dosage}
                      </p>
                    </div>
                    {item.taken ? (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-sm px-3 py-1">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        已服用
                      </Badge>
                    ) : item.isPast ? (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-sm px-3 py-1">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        未服用
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-sm px-3 py-1">
                        <Clock className="w-4 h-4 mr-1" />
                        待服用
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card className="golden-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-elder-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
                用尽预警
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-base text-gold hover:text-gold-dark"
                onClick={() => checkNotify.mutate()}
                disabled={checkNotify.isPending}
              >
                <Bell className="w-4 h-4 mr-1" />
                {checkNotify.isPending ? "发送中..." : "通知亲友"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!lowStockMeds || lowStockMeds.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-elder-xl text-muted-foreground">
                  药物储备充足
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockMeds.map((med) => (
                  <div
                    key={med.id}
                    className={`p-4 rounded-xl border ${
                      med.daysRemaining <= 3
                        ? "bg-red-50 border-red-200"
                        : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-base font-semibold text-foreground">
                        {med.name}
                      </p>
                      <Badge
                        className={`text-sm px-3 py-1 ${
                          med.daysRemaining <= 3
                            ? "bg-red-100 text-red-700 border-red-300"
                            : "bg-orange-100 text-orange-700 border-orange-300"
                        }`}
                      >
                        {med.daysRemaining <= 0
                          ? "已用尽"
                          : `还剩 ${med.daysRemaining} 天`}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        剩余 {med.remainingQuantity} {med.dosage}
                      </span>
                      <span>
                        每日消耗 {med.dailyUsage} {med.dosage}
                      </span>
                    </div>
                    <Progress
                      value={Math.max(
                        0,
                        Math.min(
                          100,
                          (med.remainingQuantity / (med.totalQuantity || 1)) *
                            100
                        )
                      )}
                      className="mt-2 h-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
