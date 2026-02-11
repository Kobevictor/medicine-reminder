import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Heart,
  Bell,
  BellOff,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ContactForm = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  relationship: string;
  notifyOnLowStock: boolean;
  notifyOnMissedDose: boolean;
};

const defaultContactForm: ContactForm = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  relationship: "子女",
  notifyOnLowStock: true,
  notifyOnMissedDose: false,
};

const relationshipOptions = [
  "子女",
  "配偶",
  "兄弟姐妹",
  "父母",
  "朋友",
  "邻居",
  "护工",
  "其他",
];

export default function Family() {
  const utils = trpc.useUtils();
  const { data: contacts, isLoading } = trpc.family.list.useQuery();
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactForm>({ ...defaultContactForm });

  const createMutation = trpc.family.create.useMutation({
    onSuccess: () => {
      toast.success("亲友添加成功");
      utils.family.list.invalidate();
      setShowDialog(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.family.update.useMutation({
    onSuccess: () => {
      toast.success("亲友信息已更新");
      utils.family.list.invalidate();
      setShowDialog(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.family.delete.useMutation({
    onSuccess: () => {
      toast.success("亲友已移除");
      utils.family.list.invalidate();
      setShowDeleteDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm({ ...defaultContactForm });
    setEditingId(null);
  };

  const openCreate = () => {
    if (contacts && contacts.length >= 5) {
      toast.error("最多只能绑定5位亲友");
      return;
    }
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (contact: any) => {
    setEditingId(contact.id);
    setForm({
      contactName: contact.contactName,
      contactEmail: contact.contactEmail,
      contactPhone: contact.contactPhone || "",
      relationship: contact.relationship || "子女",
      notifyOnLowStock: contact.notifyOnLowStock,
      notifyOnMissedDose: contact.notifyOnMissedDose,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.contactName.trim()) {
      toast.error("请输入亲友姓名");
      return;
    }
    if (!form.contactEmail.trim()) {
      toast.error("请输入邮箱地址");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
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
            <Users className="w-8 h-8 text-gold" />
            亲友管理
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            绑定亲友账号，药物即将用尽时自动通知（最多5人）
          </p>
        </div>
        <Button
          size="lg"
          className="text-lg py-5 px-5 rounded-xl bg-primary hover:bg-navy-light"
          onClick={openCreate}
          disabled={contacts && contacts.length >= 5}
        >
          <UserPlus className="w-5 h-5 mr-2" />
          添加亲友
        </Button>
      </div>

      {/* Quota indicator */}
      <Card className="golden-border bg-card">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-base text-muted-foreground">
              已绑定亲友数量
            </span>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    i < (contacts?.length || 0)
                      ? "bg-gold/20 border-2 border-gold"
                      : "bg-muted border-2 border-border"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      i < (contacts?.length || 0)
                        ? "text-gold"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </div>
              ))}
              <span className="text-lg font-bold text-foreground ml-2">
                {contacts?.length || 0}/5
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact list */}
      {!contacts || contacts.length === 0 ? (
        <Card className="golden-border bg-card">
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-elder-2xl text-muted-foreground mb-4">
              还没有绑定任何亲友
            </p>
            <p className="text-base text-muted-foreground mb-6">
              绑定亲友后，药物即将用尽时会自动通知他们帮您购买
            </p>
            <Button
              size="lg"
              className="text-lg py-5 rounded-xl"
              onClick={openCreate}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              添加第一位亲友
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              className="golden-border bg-card hover:golden-glow transition-all"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center shrink-0 border-2 border-gold/30">
                      <span className="text-xl font-bold text-foreground">
                        {contact.contactName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-elder-xl font-bold">
                        {contact.contactName}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="text-sm golden-border mt-1"
                      >
                        {contact.relationship || "亲友"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-base text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{contact.contactEmail}</span>
                  </div>
                  {contact.contactPhone && (
                    <div className="flex items-center gap-2 text-base text-muted-foreground">
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>{contact.contactPhone}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-base text-muted-foreground flex items-center gap-2">
                      {contact.notifyOnLowStock ? (
                        <Bell className="w-4 h-4 text-gold" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                      药物用尽提醒
                    </span>
                    <Badge
                      className={`text-sm ${
                        contact.notifyOnLowStock
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {contact.notifyOnLowStock ? "已开启" : "已关闭"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base text-muted-foreground flex items-center gap-2">
                      {contact.notifyOnMissedDose ? (
                        <Bell className="w-4 h-4 text-gold" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                      漏服提醒
                    </span>
                    <Badge
                      className={`text-sm ${
                        contact.notifyOnMissedDose
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {contact.notifyOnMissedDose ? "已开启" : "已关闭"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-base py-4 rounded-lg golden-border"
                    onClick={() => openEdit(contact)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="py-4 rounded-lg border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setDeletingId(contact.id);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-elder-2xl font-bold">
              {editingId ? "编辑亲友信息" : "添加亲友"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                亲友姓名 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.contactName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactName: e.target.value }))
                }
                placeholder="请输入亲友姓名"
                className="text-lg py-5 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">
                邮箱地址 <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactEmail: e.target.value }))
                }
                placeholder="用于接收药物用尽提醒"
                className="text-lg py-5 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">手机号码</Label>
              <Input
                value={form.contactPhone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactPhone: e.target.value }))
                }
                placeholder="可选"
                className="text-lg py-5 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">关系</Label>
              <Select
                value={form.relationship}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, relationship: v }))
                }
              >
                <SelectTrigger className="text-lg py-5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relationshipOptions.map((rel) => (
                    <SelectItem
                      key={rel}
                      value={rel}
                      className="text-lg py-3"
                    >
                      {rel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-base font-semibold">通知设置</h3>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="text-base font-medium text-foreground">
                    药物用尽提醒
                  </p>
                  <p className="text-sm text-muted-foreground">
                    药物即将用尽时通知此亲友
                  </p>
                </div>
                <Switch
                  checked={form.notifyOnLowStock}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, notifyOnLowStock: v }))
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="text-base font-medium text-foreground">
                    漏服提醒
                  </p>
                  <p className="text-sm text-muted-foreground">
                    用户漏服药物时通知此亲友
                  </p>
                </div>
                <Switch
                  checked={form.notifyOnMissedDose}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, notifyOnMissedDose: v }))
                  }
                />
              </div>
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
                  : "添加亲友"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-elder-2xl">
              确认移除亲友？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              移除后该亲友将不再收到药物相关的通知提醒。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-base py-5 rounded-xl">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingId && deleteMutation.mutate({ id: deletingId })
              }
              className="text-base py-5 rounded-xl bg-destructive hover:bg-destructive/90"
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
