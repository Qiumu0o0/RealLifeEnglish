# 启用账号与同步

1. 打开你的 Supabase 项目 → SQL Editor → New query，将 [setup.sql](setup.sql) 全部粘贴，点击 Run。脚本创建进度表、按用户隔离的 RLS 权限以及同步函数，可重复执行。
2. Authentication → URL Configuration：Site URL 设置为 `https://qiumu0o0.github.io/RealLifeEnglish/`，Redirect URLs 添加同一地址。
3. Authentication → Sign In / Providers：启用 Email，保持邮箱确认开启。正式供其他人注册前配置自定义 SMTP；默认邮件服务有发送对象和频率限制。不要关闭邮箱验证来绕过发送限制。
4. 更新网页或安装新版 APK，打开「我的」使用邮箱注册、查收确认邮件，然后在网页、APP 用相同邮箱密码登录。确认邮件跳转至网页；APP 用户验证后返回 APP 登录即可。
5. 在一端标记掌握，另一端点「立即同步」，确认进度一致。退出并登录另一账号，确认看不到前一账号进度。匿名调用应无权读写表。

## 数据规则

- 只同步词条的「已掌握 / 待记 / 未学习」状态，不同步导入词库、分类选择或图片。相同英文与中文释义共享状态。
- 访客、不同账号的本地记录分别保存。首次登录不会自动上传访客记录；点击「导入本机未登录进度」才合并，避免共用设备数据串号。
- 登录后学习自动同步，联网、返回前台、每分钟以及手动操作也会同步。离线可学习，恢复连接后合并。
- 按词条修改时间合并（较新的状态优先）；重置保留未学习状态作为删除标记，防止旧设备恢复已清除的进度。设备应开启自动校时。
- 本机保留登录令牌和账号进度，密码不持久化。共享设备请退出账号；卸载 APP / 清空浏览器数据会丢失未同步的修改。
- 客户端仅包含可公开的 publishable key；数据库访问依靠 Supabase Auth 与 RLS。永远不要把 secret/service_role key 或数据库密码写进应用。

## 发布前验证（需项目所有者完成）

本地模拟测试不能代替云端验证。执行 SQL 后应使用两个真实测试账号验证注册、登录、跨端同步、退出隔离、离线合并及 RLS。不要直接用于存储敏感信息。

官方说明：[邮箱登录](https://supabase.com/docs/guides/auth/passwords)、[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)。
