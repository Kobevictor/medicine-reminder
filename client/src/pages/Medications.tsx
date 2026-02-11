import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Pill,
  Plus,
  Edit2,
  Trash2,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Mic,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import VoiceInput from "@/components/VoiceInput";

type MedicationForm = {
  name: string;
  dosage: string;
  frequency: string;
  timesPerDay: number;
  reminderTimes: string[];
  totalQuantity: number;
  remainingQuantity: number;
  dosagePerTime: number;
  startDate: number;
  notes: string;
};

const defaultForm: MedicationForm = {
  name: "",
  dosage: "1片",
  frequency: "每日3次",
  timesPerDay: 3,
  reminderTimes: ["08:00", "12:00", "18:00"],
  totalQuantity: 30,
  remainingQuantity: 30,
  dosagePerTime: 1,
  startDate: Date.now(),
  notes: "",
};

const frequencyOptions = [
  { label: "每日1次", value: "每日1次", times: 1, defaultTimes: ["08:00"] },
  {
    label: "每日2次",
    value: "每日2次",
    times: 2,
    defaultTimes: ["08:00", "20:00"],
  },
  {
    label: "每日3次",
    value: "每日3次",
    times: 3,
    defaultTimes: ["08:00", "12:00", "18:00"],
  },
  {
    label: "每日4次",
    value: "每日4次",
    times: 4,
    defaultTimes: ["06:00", "12:00", "18:00", "22:00"],
  },
  {
    label: "隔日1次",
    value: "隔日1次",
    times: 1,
    defaultTimes: ["08:00"],
  },
];

export default function Medications() {
  const utils = trpc.useUtils();
  const { data: medications, isLoading } = trpc.medication.list.useQuery();
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRefillDialog, setShowRefillDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [refillingId, setRefillingId] = useState<number | null>(null);
  const [refillAmount, setRefillAmount] = useState(30);
  const [form, setForm] = useState<MedicationForm>({ ...defaultForm });
  const [showVoice, setShowVoice] = useState(false);

  const createMutation = trpc.medication.create.useMutation({
    onSuccess: () => {
      toast.success("药物添加成功");
      utils.medication.list.invalidate();
      utils.medication.lowStock.invalidate();
      setShowDialog(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.medication.update.useMutation({
    onSuccess: () => {
      toast.success("药物更新成功");
      utils.medication.list.invalidate();
      utils.medication.lowStock.invalidate();
      setShowDialog(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.medication.delete.useMutation({
    onSuccess: () => {
      toast.success("药物已删除");
      utils.medication.list.invalidate();
      utils.medication.lowStock.invalidate();
      setShowDeleteDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const refillMutation = trpc.medication.refill.useMutation({
    onSuccess: () => {
      toast.success("药物已补充");
      utils.medication.list.invalidate();
      utils.medication.lowStock.invalidate();
      setShowRefillDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm({ ...defaultForm });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (med: any) => {
    setEditingId(med.id);
    setForm({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      timesPerDay: med.timesPerDay,
      reminderTimes: JSON.parse(med.reminderTimes || "[]"),
      totalQuantity: med.totalQuantity,
      remainingQuantity: med.remainingQuantity,
      dosagePerTime: med.dosagePerTime,
      startDate: med.startDate,
      notes: med.notes || "",
    });
    setShowDialog(true);
  };

  const handleFrequencyChange = (value: string) => {
    const opt = frequencyOptions.find((o) => o.value === value);
    if (opt) {
      setForm((f) => ({
        ...f,
        frequency: value,
        timesPerDay: opt.times,
        reminderTimes: opt.defaultTimes,
      }));
    }
  };

  const handleTimeChange = (index: number, value: string) => {
    setForm((f) => {
      const times = [...f.reminderTimes];
      times[index] = value;
      return { ...f, reminderTimes: times };
    });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("请输入药物名称");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleVoiceResult = useCallback(
    (data: any) => {
      if (data.name) setForm((f) => ({ ...f, name: data.name }));
      if (data.dosage) setForm((f) => ({ ...f, dosage: data.dosage }));
      if (data.frequency) {
        const opt = frequencyOptions.find((o) => o.value === data.frequency);
        if (opt) {
          setForm((f) => ({
            ...f,
            frequency: data.frequency,
            timesPerDay: opt.times,
            reminderTimes: opt.defaultTimes,
          }));
        } else {
          setForm((f) => ({ ...f, frequency: data.frequency }));
        }
      }
      if (data.timesPerDay)
        setForm((f) => ({ ...f, timesPerDay: data.timesPerDay }));
      if (data.dosagePerTime)
        setForm((f) => ({ ...f, dosagePerTime: data.dosagePerTime }));
      if (data.totalQuantity)
        setForm((f) => ({
          ...f,
          totalQuantity: data.totalQuantity,
          remainingQuantity: data.totalQuantity,
        }));
      if (data.notes) setForm((f) => ({ ...f, notes: data.notes }));
      setShowVoice(false);
      setShowDialog(true);
      toast.success("语音识别成功，已填入药物信息");
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-elder-xl text-muted-foreground animate-pulse">
          正在加载药物列表...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-elder-3xl font-bold text-foreground flex items-center gap-2">
            <Pill className="w-8 h-8 text-gold" />
            药物管理
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            管理您的所有药物信息，设置服用提醒
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="text-lg py-5 px-5 rounded-xl golden-border"
            onClick={() => setShowVoice(true)}
          >
            <Mic className="w-5 h-5 mr-2 text-gold" />
            语音添加
          </Button>
          <Button
            size="lg"
            className="text-lg py-5 px-5 rounded-xl bg-primary hover:bg-navy-light"
            onClick={openCreate}
          >
            <Plus className="w-5 h-5 mr-2" />
            手动添加
          </Button>
        </div>
      </div>

      {/* Medication list */}
      {!medications || medications.length === 0 ? (
        <Card className="golden-border bg-card">
          <CardContent className="py-16 text-center">
            <Pill className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-elder-2xl text-muted-foreground mb-4">
              还没有添加任何药物
            </p>
            <p className="text-base text-muted-foreground mb-6">
              点击上方按钮添加您需要服用的药物
            </p>
            <Button
              size="lg"
              className="text-lg py-5 rounded-xl"
              onClick={openCreate}
            >
              <Plus className="w-5 h-5 mr-2" />
              添加第一种药物
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medications.map((med) => {
            const stockPercent = Math.max(
              0,
              Math.min(
                100,
                (med.remainingQuantity / (med.totalQuantity || 1)) * 100
              )
            );
            const isLow = med.daysRemaining <= 7;
            const isOut = med.daysRemaining <= 0;

            return (
              <Card
                key={med.id}
                className={`golden-border bg-card transition-all hover:golden-glow ${
                  isOut
                    ? "border-red-300"
                    : isLow
                      ? "border-orange-300"
                      : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          isOut
                            ? "bg-red-100"
                            : isLow
                              ? "bg-orange-100"
                              : "bg-accent/20"
                        }`}
                      >
                        <Pill
                          className={`w-6 h-6 ${
                            isOut
                              ? "text-red-600"
                              : isLow
                                ? "text-orange-600"
                                : "text-gold"
                          }`}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-elder-xl font-bold">
                          {med.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {med.dosage} · {med.frequency}
                        </p>
                      </div>
                    </div>
                    {isOut ? (
                      <Badge className="bg-red-100 text-red-700 border-red-300 text-sm">
                        已用尽
                      </Badge>
                    ) : isLow ? (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-sm">
                        {med.daysRemaining}天后用尽
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-sm">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        充足
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      剩余 {med.remainingQuantity}/{med.totalQuantity}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      每日 {med.dailyUsage} {med.dosage}
                    </span>
                  </div>
                  <Progress value={stockPercent} className="h-2" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="w-4 h-4" />
                    {med.predictedExhaustDate
                      ? `预计 ${new Date(med.predictedExhaustDate).toLocaleDateString("zh-CN")} 用尽`
                      : "持续使用中"}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {JSON.parse(med.reminderTimes || "[]").map(
                      (time: string) => (
                        <Badge
                          key={time}
                          variant="outline"
                          className="text-sm golden-border"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {time}
                        </Badge>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-base py-4 rounded-lg golden-border"
                      onClick={() => openEdit(med)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-base py-4 rounded-lg border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => {
                        setRefillingId(med.id);
                        setRefillAmount(30);
                        setShowRefillDialog(true);
                      }}
                    >
                      <Package className="w-4 h-4 mr-1" />
                      补充
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="py-4 rounded-lg border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setDeletingId(med.id);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-elder-2xl font-bold">
              {editingId ? "编辑药物" : "添加药物"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                药物名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="例如：阿司匹林"
                className="text-lg py-5 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">每次剂量</Label>
                <Input
                  value={form.dosage}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dosage: e.target.value }))
                  }
                  placeholder="例如：1片"
                  className="text-lg py-5 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">每次用量(数字)</Label>
                <Input
                  type="number"
                  value={form.dosagePerTime}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dosagePerTime: parseInt(e.target.value) || 1,
                    }))
                  }
                  min={1}
                  className="text-lg py-5 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">服用频率</Label>
              <Select
                value={form.frequency}
                onValueChange={handleFrequencyChange}
              >
                <SelectTrigger className="text-lg py-5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-lg py-3"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">提醒时间</Label>
              <div className="grid grid-cols-2 gap-3">
                {form.reminderTimes.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-[3rem]">
                      第{idx + 1}次
                    </span>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => handleTimeChange(idx, e.target.value)}
                      className="text-lg py-4 rounded-xl"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">总量</Label>
                <Input
                  type="number"
                  value={form.totalQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setForm((f) => ({
                      ...f,
                      totalQuantity: val,
                      remainingQuantity: editingId
                        ? f.remainingQuantity
                        : val,
                    }));
                  }}
                  min={1}
                  className="text-lg py-5 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">当前剩余</Label>
                <Input
                  type="number"
                  value={form.remainingQuantity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      remainingQuantity: parseInt(e.target.value) || 0,
                    }))
                  }
                  min={0}
                  className="text-lg py-5 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">备注</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="例如：饭后服用，需要多喝水..."
                className="text-base rounded-xl min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="text-base py-5 rounded-xl golden-border"
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="text-base py-5 rounded-xl bg-primary hover:bg-navy-light"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "保存中..."
                : editingId
                  ? "保存修改"
                  : "添加药物"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-elder-2xl">
              确认删除药物？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              删除后将无法恢复该药物的信息和相关记录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-base py-5 rounded-xl">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate({ id: deletingId })}
              className="text-base py-5 rounded-xl bg-destructive hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refill dialog */}
      <Dialog open={showRefillDialog} onOpenChange={setShowRefillDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-elder-2xl font-bold">
              补充药物
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-base font-semibold">补充数量</Label>
              <Input
                type="number"
                value={refillAmount}
                onChange={(e) => setRefillAmount(parseInt(e.target.value) || 0)}
                min={1}
                className="text-lg py-5 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRefillDialog(false)}
              className="text-base py-5 rounded-xl golden-border"
            >
              取消
            </Button>
            <Button
              onClick={() =>
                refillingId &&
                refillMutation.mutate({
                  id: refillingId,
                  addQuantity: refillAmount,
                })
              }
              disabled={refillMutation.isPending}
              className="text-base py-5 rounded-xl bg-primary hover:bg-navy-light"
            >
              {refillMutation.isPending ? "补充中..." : "确认补充"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voice input dialog */}
      <Dialog open={showVoice} onOpenChange={setShowVoice}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-elder-2xl font-bold flex items-center gap-2">
              <Mic className="w-6 h-6 text-gold" />
              语音添加药物
            </DialogTitle>
          </DialogHeader>
          <VoiceInput onResult={handleVoiceResult} onClose={() => setShowVoice(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
