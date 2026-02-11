import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Pill,
  Calendar,
  XCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function MedicationLogs() {
  const utils = trpc.useUtils();
  const { data: medications } = trpc.medication.list.useQuery();
  const { data: todayLogs, isLoading: todayLoading } =
    trpc.log.today.useQuery();
  const { data: allLogs, isLoading: historyLoading } =
    trpc.log.history.useQuery();

  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logStatus, setLogStatus] = useState<"taken" | "skipped" | "late">(
    "taken"
  );

  const createLogMutation = trpc.log.create.useMutation({
    onSuccess: () => {
      toast.success("服药记录已保存");
      utils.log.today.invalidate();
      utils.log.history.invalidate();
      utils.medication.list.invalidate();
      utils.medication.lowStock.invalidate();
      setShowLogDialog(false);
      resetLogForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetLogForm = () => {
    setSelectedMedId("");
    setSelectedTime("");
    setLogNotes("");
    setLogStatus("taken");
  };

  // Build today's full schedule
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
      logEntry?: any;
    }> = [];

    for (const med of medications) {
      const times: string[] = JSON.parse(med.reminderTimes || "[]");
      for (const time of times) {
        const logEntry = todayLogs?.find(
          (log) => log.medicationId === med.id && log.scheduledTime === time
        );
        schedule.push({
          medId: med.id,
          medName: med.name,
          dosage: med.dosage,
          time,
          taken: !!logEntry,
          isPast: time < currentTime,
          logEntry,
        });
      }
    }

    return schedule.sort((a, b) => a.time.localeCompare(b.time));
  }, [medications, todayLogs]);

  const handleQuickLog = (medId: number, time: string) => {
    createLogMutation.mutate({
      medicationId: medId,
      takenAt: Date.now(),
      scheduledTime: time,
      status: "taken",
      quantity: 1,
    });
  };

  const handleManualLog = () => {
    if (!selectedMedId) {
      toast.error("请选择药物");
      return;
    }
    if (!selectedTime) {
      toast.error("请选择时间");
      return;
    }
    createLogMutation.mutate({
      medicationId: parseInt(selectedMedId),
      takenAt: Date.now(),
      scheduledTime: selectedTime,
      status: logStatus,
      quantity: 1,
      notes: logNotes || undefined,
    });
  };

  // Group history logs by date
  const groupedHistory = useMemo(() => {
    if (!allLogs) return [];
    const groups: Record<string, typeof allLogs> = {};
    for (const log of allLogs) {
      const date = new Date(log.takenAt).toLocaleDateString("zh-CN");
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    }
    return Object.entries(groups).slice(0, 7); // Last 7 days
  }, [allLogs]);

  const getMedName = (medId: number) => {
    return medications?.find((m) => m.id === medId)?.name || "未知药物";
  };

  if (todayLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-elder-xl text-muted-foreground animate-pulse">
          正在加载...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-elder-3xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-gold" />
            服药记录
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            记录每次服药情况，查看历史记录
          </p>
        </div>
        <Button
          size="lg"
          className="text-lg py-5 px-5 rounded-xl bg-primary hover:bg-navy-light"
          onClick={() => {
            resetLogForm();
            setShowLogDialog(true);
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          补记服药
        </Button>
      </div>

      {/* Today's schedule with quick log */}
      <Card className="golden-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-elder-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-gold" />
            今日服药计划
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedule.length === 0 ? (
            <div className="text-center py-8">
              <Pill className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-elder-xl text-muted-foreground">
                今天暂无服药计划
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySchedule.map((item, idx) => (
                <div
                  key={`${item.medId}-${item.time}-${idx}`}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                    item.taken
                      ? "bg-green-50 border border-green-200"
                      : item.isPast
                        ? "bg-orange-50 border border-orange-200"
                        : "bg-muted/50 border border-border"
                  }`}
                >
                  <div className="text-center min-w-[70px]">
                    <p className="text-elder-2xl font-bold text-foreground">
                      {item.time}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-elder-xl font-semibold text-foreground truncate">
                      {item.medName}
                    </p>
                    <p className="text-base text-muted-foreground">
                      {item.dosage}
                    </p>
                  </div>
                  {item.taken ? (
                    <Badge className="bg-green-100 text-green-700 border-green-300 text-base px-4 py-2">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      已服用
                    </Badge>
                  ) : (
                    <Button
                      size="lg"
                      className="text-base py-4 px-6 rounded-xl bg-primary hover:bg-navy-light"
                      onClick={() => handleQuickLog(item.medId, item.time)}
                      disabled={createLogMutation.isPending}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-1" />
                      {createLogMutation.isPending ? "记录中..." : "已服用"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History logs */}
      <Card className="golden-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-elder-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-gold" />
            历史记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-center text-muted-foreground py-8 animate-pulse">
              正在加载历史记录...
            </p>
          ) : groupedHistory.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-elder-xl text-muted-foreground">
                暂无服药记录
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedHistory.map(([date, logs]) => (
                <div key={date}>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gold" />
                    {date}
                  </h3>
                  <div className="space-y-2 ml-7">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                      >
                        {log.status === "taken" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        ) : log.status === "skipped" ? (
                          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-foreground">
                            {getMedName(log.medicationId)}
                          </p>
                          {log.notes && (
                            <p className="text-sm text-muted-foreground">
                              {log.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-medium text-foreground">
                            {log.scheduledTime}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.takenAt).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Badge
                          className={`text-sm ${
                            log.status === "taken"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : log.status === "skipped"
                                ? "bg-red-100 text-red-700 border-red-300"
                                : "bg-orange-100 text-orange-700 border-orange-300"
                          }`}
                        >
                          {log.status === "taken"
                            ? "已服用"
                            : log.status === "skipped"
                              ? "已跳过"
                              : "迟服"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual log dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-elder-2xl font-bold">
              补记服药
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-base font-semibold">选择药物</Label>
              <Select value={selectedMedId} onValueChange={setSelectedMedId}>
                <SelectTrigger className="text-lg py-5 rounded-xl">
                  <SelectValue placeholder="请选择药物" />
                </SelectTrigger>
                <SelectContent>
                  {medications?.map((med) => (
                    <SelectItem
                      key={med.id}
                      value={String(med.id)}
                      className="text-lg py-3"
                    >
                      {med.name} ({med.dosage})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">计划时间</Label>
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="text-lg py-5 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">服药状态</Label>
              <Select
                value={logStatus}
                onValueChange={(v) =>
                  setLogStatus(v as "taken" | "skipped" | "late")
                }
              >
                <SelectTrigger className="text-lg py-5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="taken" className="text-lg py-3">
                    已服用
                  </SelectItem>
                  <SelectItem value="late" className="text-lg py-3">
                    迟服
                  </SelectItem>
                  <SelectItem value="skipped" className="text-lg py-3">
                    跳过
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">备注（可选）</Label>
              <Textarea
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="例如：饭后服用"
                className="text-base rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setShowLogDialog(false)}
              className="text-base py-5 rounded-xl golden-border"
            >
              取消
            </Button>
            <Button
              onClick={handleManualLog}
              disabled={createLogMutation.isPending}
              className="text-base py-5 rounded-xl bg-primary hover:bg-navy-light"
            >
              {createLogMutation.isPending ? "保存中..." : "保存记录"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
