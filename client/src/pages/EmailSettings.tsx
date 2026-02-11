import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import {
  Mail,
  Server,
  Shield,
  Send,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";

const SMTP_PRESETS = [
  { label: "QQ邮箱", host: "smtp.qq.com", port: 465, secure: true },
  { label: "163邮箱", host: "smtp.163.com", port: 465, secure: true },
  { label: "126邮箱", host: "smtp.126.com", port: 465, secure: true },
  { label: "Gmail", host: "smtp.gmail.com", port: 465, secure: true },
  { label: "Outlook/Hotmail", host: "smtp.office365.com", port: 587, secure: false },
  { label: "阿里企业邮箱", host: "smtp.qiye.aliyun.com", port: 465, secure: true },
  { label: "腾讯企业邮箱", host: "smtp.exmail.qq.com", port: 465, secure: true },
  { label: "自定义", host: "", port: 465, secure: true },
];

export default function EmailSettings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: smtpStatus, isLoading } = trpc.notification.smtpStatus.useQuery();

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("自定义");

  // Populate form when data loads
  useEffect(() => {
    if (smtpStatus?.configured) {
      setSmtpHost(smtpStatus.smtpHost || "");
      setSmtpPort(smtpStatus.smtpPort || 465);
      setSmtpUser(smtpStatus.smtpUser || "");
      setSmtpFrom(smtpStatus.smtpFrom || "");
      setSmtpSecure(smtpStatus.smtpSecure ?? true);
      setIsEnabled(smtpStatus.isEnabled ?? true);
      // Try to match preset
      const preset = SMTP_PRESETS.find(p => p.host === smtpStatus.smtpHost);
      if (preset) setSelectedPreset(preset.label);
    }
  }, [smtpStatus]);

  const saveMutation = trpc.notification.saveSmtpConfig.useMutation({
    onSuccess: () => {
      toast.success("邮件配置已保存");
      utils.notification.smtpStatus.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.notification.deleteSmtpConfig.useMutation({
    onSuccess: () => {
      toast.success("邮件配置已删除");
      setSmtpHost("");
      setSmtpPort(465);
      setSmtpUser("");
      setSmtpPass("");
      setSmtpFrom("");
      setSmtpSecure(true);
      setIsEnabled(true);
      setSelectedPreset("自定义");
      utils.notification.smtpStatus.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const testMutation = trpc.notification.testSmtpConfig.useMutation({
    onSuccess: () => toast.success("测试邮件发送成功！请检查收件箱"),
    onError: (err) => toast.error(err.message || "发送失败，请检查配置"),
  });

  const handlePresetChange = (label: string) => {
    setSelectedPreset(label);
    const preset = SMTP_PRESETS.find(p => p.label === label);
    if (preset && preset.host) {
      setSmtpHost(preset.host);
      setSmtpPort(preset.port);
      setSmtpSecure(preset.secure);
    }
  };

  const handleSave = () => {
    if (!smtpHost || !smtpUser || !smtpPass) {
      toast.error("请填写完整的SMTP配置信息");
      return;
    }
    saveMutation.mutate({
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom: smtpFrom || undefined,
      smtpSecure,
      isEnabled,
    });
  };

  const handleTest = () => {
    if (!smtpHost || !smtpUser || !smtpPass) {
      toast.error("请先填写完整的SMTP配置信息");
      return;
    }
    if (!testEmail) {
      toast.error("请输入测试接收邮箱地址");
      return;
    }
    testMutation.mutate({
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSecure,
      smtpFrom: smtpFrom || undefined,
      testEmail,
    });
  };

  const handleDelete = () => {
    if (confirm("确定要删除邮件配置吗？删除后将无法发送邮件提醒。")) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-elder-3xl font-bold text-foreground flex items-center gap-3">
            <Mail className="h-8 w-8 text-gold" />
            邮件提醒设置
          </h1>
          <p className="text-elder-xl text-muted-foreground mt-2">
            配置邮箱服务，药物即将用尽时自动发送邮件通知亲友
          </p>
        </div>
        {smtpStatus?.configured && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-base text-green-700 font-medium">已配置</span>
          </div>
        )}
      </div>

      {/* Help Info Card */}
      <Card className="golden-border bg-amber-50/50">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <Info className="h-6 w-6 text-gold shrink-0 mt-0.5" />
            <div className="space-y-2 text-base text-foreground/80">
              <p className="font-semibold text-foreground">如何获取邮箱SMTP配置？</p>
              <p>
                <strong>QQ邮箱：</strong>登录QQ邮箱 → 设置 → 账户 → 开启「POP3/SMTP服务」→ 获取授权码（作为密码使用）
              </p>
              <p>
                <strong>163邮箱：</strong>登录163邮箱 → 设置 → POP3/SMTP/IMAP → 开启SMTP服务 → 设置授权码
              </p>
              <p>
                <strong>Gmail：</strong>需开启「两步验证」后生成「应用专用密码」作为SMTP密码
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Configuration Form */}
      <Card className="golden-border golden-glow">
        <CardHeader>
          <CardTitle className="text-elder-2xl flex items-center gap-2">
            <Server className="h-6 w-6 text-gold" />
            SMTP服务器配置
          </CardTitle>
          <CardDescription className="text-base">
            填写您的邮箱SMTP服务器信息，用于发送药物提醒邮件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Selection */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">邮箱类型（快速选择）</Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="选择邮箱类型" />
              </SelectTrigger>
              <SelectContent>
                {SMTP_PRESETS.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label} className="text-base py-3">
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SMTP Host & Port */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-base font-semibold">SMTP服务器地址</Label>
              <Input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="例如：smtp.qq.com"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold">端口号</Label>
              <Input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(parseInt(e.target.value) || 465)}
                placeholder="465"
                className="h-12 text-base"
              />
            </div>
          </div>

          {/* SMTP User & Password */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">邮箱账号（SMTP用户名）</Label>
            <Input
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="例如：yourname@qq.com"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">邮箱密码 / 授权码</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="请输入SMTP密码或授权码"
                className="h-12 text-base pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              QQ邮箱和163邮箱请使用「授权码」而非登录密码
            </p>
          </div>

          {/* From Address (optional) */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">发件人地址（可选）</Label>
            <Input
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder="默认使用邮箱账号作为发件人"
              className="h-12 text-base"
            />
          </div>

          {/* SSL & Enable toggles */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={smtpSecure}
                onCheckedChange={(checked) => {
                  setSmtpSecure(checked);
                  if (checked && smtpPort === 587) setSmtpPort(465);
                  if (!checked && smtpPort === 465) setSmtpPort(587);
                }}
              />
              <div>
                <Label className="text-base font-semibold flex items-center gap-1">
                  <Shield className="h-4 w-4 text-gold" />
                  SSL加密连接
                </Label>
                <p className="text-sm text-muted-foreground">端口465使用SSL，端口587使用TLS</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              <div>
                <Label className="text-base font-semibold">启用邮件通知</Label>
                <p className="text-sm text-muted-foreground">关闭后将暂停发送邮件提醒</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="h-12 px-6 text-base bg-primary hover:bg-navy-light"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              保存配置
            </Button>

            {smtpStatus?.configured && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="h-12 px-6 text-base text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-5 w-5 mr-2" />
                )}
                删除配置
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Email Section */}
      <Card className="golden-border">
        <CardHeader>
          <CardTitle className="text-elder-2xl flex items-center gap-2">
            <Send className="h-6 w-6 text-gold" />
            发送测试邮件
          </CardTitle>
          <CardDescription className="text-base">
            填写上方配置后，发送一封测试邮件验证配置是否正确
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-2">
              <Label className="text-base font-semibold">测试接收邮箱</Label>
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="输入接收测试邮件的邮箱地址"
                className="h-12 text-base"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleTest}
                disabled={testMutation.isPending || !smtpHost || !smtpUser || !smtpPass}
                variant="outline"
                className="h-12 px-6 text-base border-gold/40 hover:bg-gold/10"
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Send className="h-5 w-5 mr-2" />
                )}
                发送测试
              </Button>
            </div>
          </div>
          {testMutation.isSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-base text-green-700">测试邮件发送成功！请检查收件箱确认收到。</span>
            </div>
          )}
          {testMutation.isError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-base text-red-700">
                发送失败，请检查SMTP配置是否正确。常见原因：授权码错误、未开启SMTP服务、端口不正确。
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
