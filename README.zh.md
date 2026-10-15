# DeepSeek Harness — teammate 模型选择 fork

[English](README.md) | 中文

DeepSeek Harness（`dsh`）是由 [DeepSeek AI](https://deepseek.com) 开发的开源 agent harness（智能体框架）。

它构建于**一切皆插件**的架构之上，由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512)。

文档：[https://deepseek-harness.github.io/deepseek-harness/](https://deepseek-harness.github.io/deepseek-harness/)

## 本 fork

本仓库是 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 的个人 fork，维护于 [namaenande/deepseek-harness](https://github.com/namaenande/deepseek-harness)。它跟随上游，并在 `0.2.1-alpha.4` 基线上额外提供一个能力：**Lead 创建 Agent Team 时可以为 fresh teammate 指定 LLM 路由**。上游没有该功能，也没有提 PR 的打算，因此请把它当作一个额外构建版，而不是上游贡献。

### 这个增强做什么

在「设置 → 插件」里启用 **Subagent model selection**，并加入你授权的精确 `{ provider, model }` 路由。此后新组合出的 Lead Session 会记录这份路由列表，Lead 的 `spawn_teammate` 随之获得 `provider`、`model`、`reasoning_effort` 三个参数，以及用于发现路由的 `list_subagent_models`。省略这些字段就是原来的行为：teammate 继承 Lead 的路由。

路由会在 teammate 创建之前，先按 Session 白名单校验、再经 LLM 运行时预检，所以越权、未注册或不支持的路由都会在产生成员之前失败。fork teammate 不提供路由选择，因为继承来的对话前缀属于 Lead 的路由。

### 已知限制

`list_agents` 只在 teammate 的 Agent 加载期间报告它自己的模型；该 Agent 释放后，该行省略 `model`，而不是报成 Lead 的模型。精确路由仍然持久保存在子 Session 的 descriptor 以及 `spawn_teammate` 的返回值里。完整约定由 [tool-agent-team 包 README](packages/experimental/tool-agent-team/README.zh.md) 负责。

### 构建本 fork

按[从源码运行](#run-from-source)一节在检出中运行。未签名的 Windows 桌面版在填好 `apps/desktop/.env.windows` 后，用 `pnpm run package:desktop:win:x64:unsigned --build-version <版本>` 产出；环境要求在[打包指南](apps/desktop/packaging/README.zh.md)中。

## 开发者预览

DeepSeek Harness 处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

运行本项目前，请阅读[安全说明](SAFETY.zh.md)。

<a id="run"></a>

## 运行

### 通过 `npm` 运行

安装 `Node.js`，然后运行：

```sh
npx @deepseek-ai/dsh web
```

该命令默认会在 `http://127.0.0.1:3080` 启动 Web UI，本机启动时还会用默认浏览器打开页面。通过 SSH 启动时只打印宿主机 URL，因为本地转发地址由 SSH 客户端或编辑器持有。传入 `--no-open` 可仅运行服务器而不打开浏览器。详见 [Web UI 指南](docs/user/guide/index.zh.md)。

<a id="run-from-source"></a>

### 从源码运行

如需从仓库源码运行：

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

`pnpm run build` 会准备仓库产物。`pnpm dsh web` 会直接使用这些已构建产物，不会重新构建。

## 社区与支持

- 通过 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) 提交反馈或 bug 报告。
- 为你的插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题，便于被发现。
- 欢迎加入 DeepSeek Harness 企微群！扫描下方二维码填写入群问卷，小助手会定期发送入群邀请。

<table>
  <thead>
    <tr>
      <th align="center">入群问卷</th>
      <th align="center">微信公众号</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><a href="https://trtgsjkv6r.feishu.cn/share/base/form/shrcnIt5twSVdLGD52KJBckGCgg"><img src="https://cdn.deepseek.com/harness/readme/community-wecom-survey.png" alt="DeepSeek Harness 入群问卷二维码" width="180" height="180"></a></td>
      <td align="center"><img src="https://cdn.deepseek.com/harness/readme/community-wechat-official-account.png" alt="DeepSeek Harness 团队微信公众号二维码" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.zh.md)。

## 开发

请先阅读[开发指南](docs/development.zh.md)与[架构文档](docs/architecture.zh.md)。

`pnpm run dev:web` 会在一个终端里完成构建、启动，并在源码修改时重建 client bundle；`make help` 列出 Web 与 Desktop 对应的 Make target。完整表格见开发指南的「应用命令」一节。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 引用

```bibtex
@misc{deepseek-harness2026,
  title={DeepSeek Harness: Everything is a Plugin},
  author={DeepSeek-AI},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/deepseek-ai/deepseek-harness}},
}
```

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
