## Context

当前项目使用 NextAuth.js 进行用户认证，支持用户注册、登录、密码修改等功能。对于开源自托管场景，这些功能过于复杂。用户希望简化为单一固定账号 (root/root) 自动登录，移除登录界面和计费相关设置。

**当前认证流程：**
- `src/lib/auth.ts` - NextAuth 配置，使用 Credentials Provider + Prisma Adapter
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth API 路由
- `src/app/[locale]/auth/signin/page.tsx` - 登录页面
- `src/app/[locale]/auth/signup/page.tsx` - 注册页面

**当前设置页面：**
- `src/app/[locale]/profile/page.tsx` - 包含"扣费记录"和"API配置"两个标签页

## Goals / Non-Goals

**Goals:**
- 实现自动登录：访问任何需要认证的页面时，自动使用 root/root 登录
- 隐藏登录/注册页面：用户无需看到或操作登录界面
- 移除设置中心的计费相关界面
- 简化导航栏：移除登录/注册相关入口

**Non-Goals:**
- 不删除用户表或现有用户数据（保留数据结构兼容性）
- 不修改密码哈希逻辑
- 不移除 API 认证中间件（保持 API 安全性）

## Decisions

### Decision 1: 自动登录实现方式

**选择**: 在 middleware 中检测未认证用户，自动调用 signIn 完成登录

**理由**:
- Middleware 是请求入口，可以在页面渲染前完成认证
- 保持 NextAuth 会话机制不变，最小化代码改动
- 无需修改客户端组件的 session 检测逻辑

**替代方案**:
- 在服务端创建默认 session（需要深入了解 NextAuth 内部实现）
- 使用环境变量跳过认证（破坏现有安全模型）

### Decision 2: 登录/注册页面处理

**选择**: 重定向到 workspace，不删除文件

**理由**:
- 保持路由兼容性，避免 404
- 如果将来需要恢复登录功能，改动最小

### Decision 3: 设置页面简化

**选择**: 移除"扣费记录"标签页，只保留"API配置"

**理由**:
- 开源版本无计费功能，此标签页无意义
- API 配置是用户实际需要的功能

### Decision 4: 退出登录处理

**选择**: 隐藏"退出登录"按钮

**理由**:
- 单一用户场景下，退出后仍会自动登录
- 显示退出按钮会造成困惑

## Risks / Trade-offs

**风险 1: 安全性降低**
→ 这是预期行为。开源单用户部署场景下，安全性由部署者控制

**风险 2: 多实例部署时会话问题**
→ 使用 JWT session 策略，不依赖数据库 session，无此问题

**风险 3: 现有数据关联问题**
→ root 用户需要确保存在于数据库中，可通过种子数据或首次启动自动创建
