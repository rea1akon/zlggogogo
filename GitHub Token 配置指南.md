# GitHub Token 配置详解（小白版）

> 配套仓库：`rea1akon/zlggogogo`
> 目标：拿到一把**能推送代码**的钥匙

---

## 一、先搞懂三个问题

### 1. 为什么要用 Token，不能用密码？

GitHub 从 2021 年 8 月起**取消了用账号密码推代码的权限**。
现在推代码必须出示一把专门的「钥匙」，这把钥匙就叫 **Token（个人访问令牌）**。

### 2. Token 是什么？

一串长得像乱码的字符，比如：

```
ghp_ 后面跟一串字符        ← 经典 Token
github_pat_ 后面跟一串字符  ← 细粒度 Token
```

它相当于你亲手配的一把**临时钥匙**，可以做到：

- 只开某一个仓库的门（不是所有仓库）
- 只给「读」权限，或「读+写」权限
- 设个有效期（比如 90 天后自动作废）
- 随时一键作废

### 3. Token 和密码的最大区别

| | 账号密码 | Token |
|---|---|---|
| 丢了怎么办 | 整个账号被盗 | 去网页点一下「撤销」，立刻失效 |
| 能限制权限吗 | 不能，等于全权 | 能，精确到「哪个仓库、能读还是能写」 |
| 会过期吗 | 不会 | 可以设 |

**一句话**：Token 是「可收回、可限时、可限权」的钥匙，比密码安全得多。

---

## 二、两种 Token 的区别

| 对比项 | 经典 Token（Classic） | 细粒度 Token（Fine-grained） |
|---|---|---|
| **长相（前缀）** | `ghp_` 开头 | `github_pat_` 开头 |
| **创建位置** | Developer settings → Personal access tokens → **Tokens (classic)** | Developer settings → Personal access tokens → **Fine-grained tokens** |
| **怎么给权限** | 勾选 `repo` **一个框**就够 | 必须先**选仓库**，再**逐个勾权限项** |
| **新手友好度** | ⭐⭐⭐⭐⭐ 简单 | ⭐⭐ 容易漏勾 |
| **适合场景** | 个人、小项目 | 团队、生产环境 |

👉 **你当前给我的是 `github_pat_` 开头的细粒度 Token**，属于容易漏勾的那种。

---

## 三、你当前 Token 的实测诊断结果

我用你的 Token 直接敲 GitHub 的 Git 协议接口，结果是：

```
git-receive-pack（推送/写入权限）  →  HTTP 403  ❌ 被拒绝
git-upload-pack（拉取/读取权限）   →  HTTP 200  ✅ 通过
```

**结论**：这把钥匙**只能读、不能写**。

原因是细粒度 Token 在创建时，「Contents（仓库内容）」这一项权限默认是 **Read-only（只读）**，必须手动改成 **Read and write（读写）** 才能推送。

> 💡 顺带说个坑：GitHub 的「仓库信息接口」会告诉你 `push: true` —— 那显示的是**你这个账号**的权限（你是仓库主人当然啥都行），**不是这把 Token 的权限**。所以别被它骗了，实测 Git 协议才是准的。

---

## 四、方案 A（新手推荐）：重新生成经典 Token

**只要勾一个框，最省心。**

### 第 1 步：打开生成页面

浏览器打开（先确保已登录 GitHub）：

```
https://github.com/settings/tokens
```

页面长这样：左侧菜单有两项，点 **Tokens (classic)**。

### 第 2 步：点生成按钮

右上角找这个按钮：

```
[ Generate new token  ▼ ]     ← 点它，下拉里选 【Generate new token (classic)】
```

⚠️ 注意：下拉里有两个选项，**一定要选带 (classic) 的那个**。

### 第 3 步：填这四项

| 表单项 | 填什么 |
|---|---|
| **Note**（备注） | 随便填，比如 `zlg-push` |
| **Expiration**（有效期） | 点下拉，选 **90 days**（也可以选 No expiration 永久，但 90 天更安全） |
| **Select scopes**（权限） | ✅ **只勾选 `repo` 这一项**（它下面会自动勾上一堆子项，不用管） |
| 其他所有框 | **全部保持不勾** |

`repo` 这一项长这样（勾最上面那个父项即可）：

```
☑ repo    Full control of private repositories
   ☑ repo:status
   ☑ repo_deployment
   ☑ public_repo
   ☑ repo:invite
   ☑ security_events
```

### 第 4 步：生成并复制

滚到页面最底下，点绿色的：

```
[ Generate token ]
```

跳转后你会看到一串字符，**这就是 Token，一辈子只显示这一次**：

```
ghp_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789
[ 📋 复制按钮 ]
```

✅ **立刻点复制按钮，粘贴到记事本里存好。**
关掉这个页面就再也看不到了，只能重新生成。

---

## 五、方案 B：把细粒度 Token 的权限补齐

如果你更想用细粒度（更安全可控），按这个走，**第 4 步是关键**。

### 第 1 步：打开页面

```
https://github.com/settings/personal-access-tokens
```

点右上角 **Generate new token**。

### 第 2 步：基本信息

| 表单项 | 填什么 |
|---|---|
| **Token name** | `zlg-push` |
| **Expiration** | 选 **90 days** |
| **Description** | 可不填 |

### 第 3 步：Resource owner（资源所有者）

保持默认选中你的账号 `rea1akon`。

### 第 4 步：Repository access（仓库访问范围）⚠️ 关键

选第二个：

```
○ All repositories          （所有仓库）
● Only select repositories  （仅指定仓库）   ← 选这个
```

然后点下面的 **Select repositories** 下拉框，搜索并勾选：

```
☑ zlggogogo
```

### 第 5 步：Permissions（权限）⚠️ 最关键，你上次就是栽在这

点开 **Repository permissions** 这一块（默认折叠，点一下展开），找到 **Contents** 这一行：

| 权限项 | 你要选的值 |
|---|---|
| **Contents**（仓库内容） | 🔴 **Read and write**（读写） ← **必须！** |
| Metadata（元数据） | Read-only（只读，默认即可，会自动勾上） |

**Contents 这一项如果停在 Read-only，就只能拉代码、推不上去**——这正是你现在的状况。

其他权限一律不用勾。

### 第 6 步：生成并复制

点 **Generate token**，同样**立刻复制保存**。

---

## 六、Token 拿到后怎么用

### 方式一：交给我来推（推荐）

直接把新 Token 发给我，格式：

```
ghp_xxxxxxxxxxxxxxxxxxxx
```

我会执行下面这些，然后**立刻把 Token 从你电脑的 Git 配置里抹掉**：

```bash
git remote set-url origin "https://rea1akon:<Token>@github.com/rea1akon/zlggogogo.git"
git push -u origin main
git remote set-url origin "https://github.com/rea1akon/zlggogogo.git"   # 抹掉 Token
```

### 方式二：你自己敲命令

在你自己的终端（CMD 或 PowerShell，不是 Git Bash）里：

```bash
cd F:\city\庄骆贵一体化养护管理系统V4（wb）

git remote remove origin
git remote add origin https://rea1akon:你的Token@github.com/rea1akon/zlggogogo.git
git push -u origin main

# 推完立刻清理，别把 Token 留在配置里
git remote set-url origin https://github.com/rea1akon/zlggogogo.git
```

推完之后如果弹出登录框：用户名填 `rea1akon`，密码**粘贴 Token**（不是你的 GitHub 登录密码）。

---

## 七、安全注意事项（重要）

### 1. 你刚才那个 Token 建议撤销掉

原因：它已经在这段对话里明文出现过了。虽然它现在只能读不能写，但以防万一，撤销最稳妥。

**撤销方法**：

```
https://github.com/settings/tokens
```

找到对应的 Token，点右边的 **Delete** / **Revoke** 按钮，灰色的，一点就失效。

### 2. Token 保管的三条规矩

- ✅ 存记事本或密码管理器里，**别发群里、别传到代码里**
- ✅ 用完了就撤销，不留着
- ✅ 有效期别选永久，90 天够了，到期再生成一把

### 3. 万一 Token 泄露了怎么办

去 `https://github.com/settings/tokens` 点撤销，一秒失效，没有后遗症。
这就是为什么 Token 比密码安全——密码泄露你得改密码，Token 泄露点一下就行。

---

## 八、快速自查清单

生成完 Token 后，对照确认：

- [ ] 前缀是 `ghp_`（经典）或 `github_pat_`（细粒度）
- [ ] 经典 Token：勾选了 `repo`
- [ ] 细粒度 Token：选了 `zlggogogo` 仓库 **且** Contents = **Read and write**
- [ ] 已经复制保存下来（关页面就找不回了）
- [ ] 旧的只读 Token 已撤销
