---
description: "九个让模型创建、发消息与协调 teammate 的工具，供挂载实验性 Team 插件的组合使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-tool-agent-team

[English](README.md) | 中文

## 概述

本包让模型创建具名 teammate、向它们发送消息、查看可用状态、等待进展、中断卡住的工作，并通过共享任务板协调。每个团队成员都会获得相同的九个工具，以及在共享工作区协调的指引。它会取代同名的旧版 subagent 控件，因此同时需要两者的组合必须禁用旧定义。启用宿主侧模型选择偏好后，Lead 的创建工具还可以在该 Session 获授权的路由中为 fresh teammate 选择 LLM 路由。本包以实验性名称公开发布，但不提供稳定性保证。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

当模型应该通过工具运行一支团队时，在 `@deepseek-ai/dsh-experimental-agent-team` 之上挂载本包。挂载后，每个团队成员——Lead 与每个 teammate——都会获得相同的九个工具，以及相同的协作策略；Session 已获授权子 LLM 路由的 Lead 还会获得 `list_subagent_models`。`spawn_teammate` 原样发送初始任务；每个成员通过必需的 runtime context 接收当前角色和名字。

### 何时选择

当模型应该自行创建与协调 teammate、而不是由人来操作 subagent 控件时，选择它。当同名的旧全局 subagent 工具必须继续可用时，请不要选择：团队工具会为团队成员取代它们，因此想同时使用两者的组合必须禁用旧定义。

### 最小工作示例

对现有组合的最小增量是 [agent-team README](../agent-team/README.zh.md#smallest-working-setup) 中的两包片段：持久会话存储、团队领域包与本包。插件本身只有两个可选设置：

```yaml
- id: tool-agent-team
  name: '@deepseek-ai/dsh-experimental-tool-agent-team'
  config:
    freshProvider: spawn
    forkProvider: fork
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `freshProvider` | `spawn` | 启动 fresh teammate 的提供方 |
| `forkProvider` | `fork` | 启动 fork teammate 的提供方 |

生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-experimental-tool-agent-team)是每个受支持字段及其 JSDoc 的穷尽式真源。

试试这样要求 Lead 模型：「创建一个名为 reviewer 的 teammate 检查 diff，再把变更摘要发给 reviewer」。模型会调用创建工具，然后调用消息工具。

### 模型能做什么

九个工具分为四类能力：

- **创建 teammate**——`spawn_teammate` 接收名字、描述与初始任务；只有 Lead 可以调用它。
- **发送消息**——`send_message` 在最近的步骤边界对运行中的成员进行 steering（中途引导）、启动或恢复非活动成员。
- **查看与等待**——`list_agents` 返回各成员的 `target` 与可用状态；`wait_agent` 等待下一次团队变化；`interrupt_agent` 停止 teammate 的当前轮次（仅限 Lead）。
- **管理任务板**——`team_task_create`、`team_task_list`、`team_task_get` 与 `team_task_update` 添加、浏览、读取与更新共享任务。

创建和列表结果使用 `target` 标识成员，不包含成员 Session ID。可将该值用于消息和中断调用，或任务工具的 `owner` 参数；任务的 `ownerName` 使用相同值。`inactive` 表示没有轮次在执行，包括已加载和需要恢复的成员；它不表示任务完成或结果。`provisioning` 与 `failed` 描述成员创建状态。任何成员都可以给任何其他成员发消息并使用任务板；只有 Lead 可以创建与中断 teammate。任务更新保留领域的 owner 与 revision 校验，因此过期的编辑会被拒绝，而不是覆盖更新的成果。

### Teammate LLM 路由

Session 是否可以挑选子 LLM 路由、以及可以从哪些精确的 `{ provider, model }` 路由中挑选，都由宿主决定；团队工具不添加自己的授权。在插件设置中启用 **Subagent model selection** 并添加至少一个路由。此后新组合出的 Lead Session 会在首次请求前记录这些路由，并在恢复后继续沿用。

记录到路由列表后，Lead 的 `spawn_teammate` 会接受 `provider`、`model` 与 `reasoning_effort`，并提供 `list_subagent_models` 用于发现；没有记录时，其 schema 保持固定，这些字段会被拒绝。`provider` 与 `model` 必须同时提供；都省略时 teammate 继承 Lead 的路由。路由会在 teammate 存在之前解析和校验，因此未注册的提供方、不支持的 effort，或列表之外的路由都会在创建成员前失败。fork teammate 不提供路由选择，因为继承的对话前缀属于 Lead 的路由。teammate 永远不选择路由：只有 Lead 创建 teammate。

### 成功与失败的表现

`send_message` 在收件箱接收消息后返回 `{ "sent": true }`，不暴露消息 ID。成功不表示接收方已处理消息，也不保证同步刷新到存储；发送失败会作为工具错误报告。当没有其他成员 running 或 provisioning 时，`wait_agent` 会立即返回 `noProgress`，提示调用方先唤醒 teammate；否则它会等待下一次变化，调用方随后重新读取状态。基于过期 revision 的任务编辑会被拒绝，而不是覆盖更新的成果。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

本节解释适配器背后的设计决策并指出实现它们的代码位置；可观察行为已在[使用本包](#use-this-package)中完整说明。

### 设计理念

适配器建立在三项承诺之上：

- **按作用域，而非全局。** 每个注册都位于成员 Agent（智能体）自己的 `ctx` 上；安装依据 Agent 发布时可用的成员身份。
- **声明式结果，紧凑 JSON。** 每个工具都声明完整结果 schema，并把该值渲染为紧凑 JSON，因此编译器会对照向模型承诺的结果检查 `execute`，任何结果都不会在缩进上消耗 token。
- **领域掌握裁决权。** 工具委托给 `ctx.agentTeams`，后者强制执行 Lead 权限与 revision 校验；适配器不添加更弱的路径。

[Agent Teams Agent Note](../../../.agents/notes/implemented/feature/2026-08-05-agent-teams.zh.md)负责模型侧与 scoping 决策。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/index.ts`](src/index.ts) | 插件入口：配置、固定策略文本与九个 scoped 工具注册 |

### 策略与工具

member scope 上的一个 `team:policy` 段落说明共享的协作规则；固定文本与九个工具注册都声明在 [`src/index.ts`](src/index.ts)。九个工具 schema 注册在发布时被识别为 Team member 的 scope 中。与旧全局 continuable-subagent 控件同名的 scoped 注册只会为团队成员覆盖这些全局控件。

路由选择复用面向用户的授权决策的归属方。`@deepseek-ai/dsh-tool-subagent/model-selection`、`.../model-selection-state` 与 `.../list-models` 提供路由合并、适配器预检、持久的按 Session 策略与发现工具；本包只决定哪些 scope 获得它们。路由策略在每个 Agent 安装工具时解析一次，且只针对 Lead。

### 按作用域注册与拆除

`maybeInstall` 对每个 live Agent 运行，并订阅 `agent/created`；它跳过没有 Team 成员关系的 Agent。Agent 的 dispose（资源释放）会运行已安装的 disposer，插件 HMR（热模块替换）会在重新安装前对每个已安装的 scope 执行 dispose。每个 disposer 按逆序撤销注册，因此失败的安装不会留下残缺 scope。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

当包级约定不够用时阅读以下页面。它们从领域服务逐步进入精确 schema 与设计背后的决策。

- [agent-team 包](../agent-team/README.zh.md)——这些工具背后的 `ctx.agentTeams` 领域服务。
- [Agent Teams 子系统](../../../docs/subsystems/agent-team.zh.md)——持久 Team 类型与服务 API。
- [生成的工具目录](../../../docs/tool-catalog.zh.md#deepseek-aidsh-experimental-tool-agent-team)——模型接收的每个工具 schema。
- [Agent Teams Agent Note](../../../.agents/notes/implemented/feature/2026-08-05-agent-teams.zh.md)——模型侧、scoping 与隔离决策。

-----

<a id="model-experience"></a>
## 模型体验

### Team 策略与工具

#### 模型看到什么

共享系统 policy 覆盖 Team 可用性、共享 cwd 安全、任务协调、Steer 投递、inbox 接收和 Lead 等待责任。Lead 与 teammate 使用相同的九个 schema；执行时落实 Lead-only 操作。必需的 runtime context 声明 `You are the Team Lead named "lead".`，或 `You are teammate "<name>".` 与 `Your Team Lead is named "lead".`，并提供 roster 和消息操作说明。身份来自当前 Team membership，关闭可选 context 时仍保留，压缩移除快照后会恢复。从 teammate 创建的普通 fork 会收到当前 Lead 身份。

#### Token 影响

每次 Team member 请求都有固定策略与 schema 成本。身份是完整 runtime-context 快照的一部分。保留的快照未变化时不追加消息；context 变化或被移除时，loop 追加包含身份的完整快照。工具调用会增加紧凑 JSON roster、task、wait 或 receipt 结果。Peer 内容由 Team 领域保留在 target 历史中。

#### KV Cache 影响

provider／model、共享 system 策略和工具 schema 相同时，fork 保留父请求前缀并追加任务与当前 runtime context。工具结果与 peer 消息追加在可复用请求前缀之后。原先在 system prompt 中记录身份的 Session，首次使用此布局请求时可能改变该前缀；提供方实际缓存命中仍为尽力而为。

### Teammate LLM 路由选择

#### 模型看到什么

只有 Session 记录了获授权路由列表的 Lead，才会在 `spawn_teammate` 上看到 `provider`、`model` 与 `reasoning_effort` 参数、描述中的路由说明，以及 `list_subagent_models`。其他所有 scope 都保持固定的六参数创建 schema，且没有发现工具。路由选择改变的是 teammate 自身的请求，永远不会改变 Lead 的请求。

#### Token 影响

启用路由选择会重写 Lead 的 `spawn_teammate` 描述，并为整个 Session 增加三个 schema 属性。`list_subagent_models` 的结果只在模型调用它时进入 transcript；白名单本身不消耗 token。

#### KV Cache 影响

偏好启用时，以及创建的 schema 变化时，Lead 的请求前缀会改变，每个 Session 一次。以选定路由创建的 teammate 与 Lead 路由不同，因此其自身请求不再共享 Lead 侧的提供方前缀；fork teammate 保留 Lead 的路由及其继承前缀。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制说明策略与工具无法为一支团队保证什么。它们是当前包约束，不是与其他协作方式的对比。

- **提示词策略只负责协调，不负责 confinement**——它无法阻止 Bash 或外部进程写入重叠文件。
- **没有 Web 控制功能**——浏览器 roster 与任务板呈现不属于该运行时包。
- **路由选择依赖宿主偏好**——没有它，Lead 完全无法选择 teammate 的模型；而启用后的偏好只影响之后组合出的 Session。
- **`list_subagent_models` 是全局唯一名称**——团队工具只在该 scope 尚无此定义时注册它，因此同时挂载启用模型选择的 `@deepseek-ai/dsh-tool-subagent` 的组合会保留后者的发现工具。
- **roster 的模型信息需要子 Agent 在线**——`list_agents` 从在线的 Agent 读取 teammate 自己的路由；该 Agent 释放后该行不再带 `model`，因为持久 Team 记录不存路由，而报告成 Lead 的模型会误述一个自选了模型的 teammate。
- **实验原型，无稳定性承诺**——本包公开发布，但孵化期间 schema 仍可自由变更。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
