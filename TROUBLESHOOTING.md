# 登录问题修复指南

## 🔧 已修复的问题

### 问题 1：Umami 脚本加载错误

**症状：**
```
The script from "http://localhost:3000/umami" was loaded even though its MIME type ("text/html") is not a valid JavaScript MIME type.
Uncaught SyntaxError: expected expression, got '<'
```

**原因：**
- `index.html` 中引用了 Umami 统计脚本
- 但环境变量 `VITE_ANALYTICS_ENDPOINT` 和 `VITE_ANALYTICS_WEBSITE_ID` 未配置
- 导致浏览器尝试加载不存在的脚本

**修复：**
- 已从 `client/index.html` 中移除 Umami 脚本引用
- 如果将来需要添加统计功能，可以配置相应的环境变量

---

### 问题 2：登录后无法跳转到主页

**症状：**
- 点击"登录"按钮后，页面没有反应
- 或者显示登录成功但停留在登录页

**原因：**
- 原 `Login.tsx` 组件使用 `fetch` 直接调用 `/api/auth/login`
- 这个路径可能与 tRPC 的路由不匹配
- 登录成功后使用 `window.location.href` 跳转可能有延迟

**修复：**
- 重写 `Login.tsx` 组件，使用 tRPC API
- 使用 `wouter` 的 `setLocation` 进行路由跳转
- 添加正确的错误处理和加载状态
- 登录/注册成功后刷新用户信息缓存

---

## 🚀 如何更新代码

### 方法 1：拉取最新代码（推荐）

```bash
# 在项目目录执行
cd medicine-reminder
git pull origin main

# 如果有本地修改，先暂存
git stash
git pull origin main
git stash pop
```

### 方法 2：手动应用修复

如果您不想拉取所有更新，可以手动应用以下修复：

#### 修复 1：移除 Umami 脚本

编辑 `client/index.html`，删除以下内容：

```html
<!-- 删除这段代码 -->
<script
  defer
  src="%VITE_ANALYTICS_ENDPOINT%/umami"
  data-website-id="%VITE_ANALYTICS_WEBSITE_ID%"></script>
```

#### 修复 2：更新 Login.tsx

用以下内容替换 `client/src/pages/Login.tsx`：

```typescript
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, setLocation] = useLocation();
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    email: "",
  });

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("登录成功");
      utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message || "登录失败");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("注册成功");
      utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message || "注册失败");
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (registerForm.password.length < 6) {
      toast.error("密码长度至少为6位");
      return;
    }

    registerMutation.mutate({
      username: registerForm.username,
      password: registerForm.password,
      name: registerForm.name || undefined,
      email: registerForm.email || undefined,
    });
  };

  const loading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">药物提醒系统</CardTitle>
          <CardDescription className="text-center">
            帮助您按时服药，关爱健康
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">用户名</Label>
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="请输入用户名"
                    value={loginForm.username}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, username: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">密码</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="请输入密码"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "登录中..." : "登录"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">用户名</Label>
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="请输入用户名"
                    value={registerForm.username}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, username: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">密码</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="至少6位"
                    value={registerForm.password}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, password: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">确认密码</Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    placeholder="再次输入密码"
                    value={registerForm.confirmPassword}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-name">姓名（可选）</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="请输入姓名"
                    value={registerForm.name}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">邮箱（可选）</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="请输入邮箱"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, email: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "注册中..." : "注册"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🧪 测试修复

### 1. 重启开发服务器

```bash
# 停止当前运行的服务器（Ctrl+C）

# 重新启动
pnpm run dev
```

### 2. 清除浏览器缓存

- 按 `Ctrl+Shift+Delete`（Windows/Linux）或 `Cmd+Shift+Delete`（Mac）
- 选择"Cookie 和其他网站数据"
- 清除

### 3. 测试登录流程

1. 访问 http://localhost:3000
2. 应该看到登录页面（没有控制台错误）
3. 点击"注册"标签
4. 填写用户信息并注册
5. 应该自动跳转到首页

### 4. 测试登出和重新登录

1. 在首页点击左下角的用户头像
2. 选择"退出登录"
3. 应该返回登录页面
4. 使用刚才注册的账号登录
5. 应该成功进入首页

---

## 📊 验证清单

修复后，请确认以下几点：

- [ ] 浏览器控制台没有 Umami 相关错误
- [ ] 可以成功注册新账号
- [ ] 注册后自动跳转到首页
- [ ] 可以看到用户信息（左下角头像）
- [ ] 可以正常退出登录
- [ ] 可以重新登录
- [ ] 服务器日志显示认证相关信息

---

## 🐛 如果仍有问题

### 检查服务器日志

在运行 `pnpm run dev` 的终端中，您应该看到类似的日志：

**成功的登录：**
```
[Auth] User authenticated: { id: 1, username: 'admin' }
```

**失败的登录：**
```
[Auth] Authentication failed: Invalid credentials
```

### 检查数据库

```bash
mysql -u medicine_user -p medicine_reminder

# 在 MySQL 中
SELECT * FROM users;
```

确认用户已正确创建。

### 检查浏览器 Network 标签

1. 打开开发者工具（F12）
2. 切换到 Network 标签
3. 尝试登录
4. 查找 `auth.login` 或类似的请求
5. 检查：
   - Status Code: 应该是 200
   - Response: 应该包含用户信息
   - Cookies: 应该设置了 session cookie

### 清理并重新安装

如果以上都不行，尝试完全清理：

```bash
# 停止服务器
# Ctrl+C

# 清理
rm -rf node_modules pnpm-lock.yaml dist

# 重新安装
pnpm install

# 重新构建
pnpm run build

# 启动
pnpm run dev
```

---

## 📞 获取更多帮助

如果问题仍未解决，请提供：

1. **完整的服务器日志**（从启动到登录失败的全部输出）
2. **浏览器控制台截图**（Console 和 Network 标签）
3. **您的操作步骤**（详细描述您做了什么）
4. **环境信息**：
   - 操作系统
   - Node.js 版本（`node --version`）
   - MySQL 版本（`mysql --version`）
   - 浏览器版本

然后在 GitHub 提交 Issue：
https://github.com/Kobevictor/medicine-reminder/issues

---

**祝您使用顺利！** 🎉
