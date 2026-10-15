---
description: "Nine tools that let the model create, message, and coordinate teammates, for compositions mounting the experimental Team plugins."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-tool-agent-team

English | [中文](README.zh.md)

## Summary

This package lets the model create named teammates, send them messages, inspect availability, wait for progress, interrupt stuck work, and coordinate through a shared task board. Every team member receives the same nine tools and guidance for coordinating in a shared workspace. It replaces legacy subagent controls with the same tool names, so compositions that need both must disable the legacy definitions. With the Host model-selection preference enabled, the Lead’s creation tool also selects a fresh teammate’s LLM route from the Session’s authorized routes. The package is published under its experimental name and provides no stability guarantee.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Add this package on top of `@deepseek-ai/dsh-experimental-agent-team` when the model should run a team through tools. Once mounted, every team member — the Lead and each teammate — gets the same nine tools plus the same coordination policy; a Lead whose Session authorized child LLM routes also gets `list_subagent_models`. Each member receives its current role and name through required runtime context; `spawn_teammate` sends the initial task unchanged.

### When to choose it

Choose it when the model should create and coordinate teammates by itself rather than a human driving subagent controls. Avoid it when the legacy global subagent tools with the same names must stay available: the team tools replace them for team members, so a composition that wants both must disable the legacy definitions.

### Smallest working example

The smallest addition to an existing composition is the two-package fragment from the [agent-team README](../agent-team/README.md#smallest-working-setup): durable session storage, the team domain package, and this package. The plugin itself takes two optional settings:

```yaml
- id: tool-agent-team
  name: '@deepseek-ai/dsh-experimental-tool-agent-team'
  config:
    freshProvider: spawn
    forkProvider: fork
```

| Field | Default | Meaning |
|---|---|---|
| `freshProvider` | `spawn` | Provider that starts fresh teammates |
| `forkProvider` | `fork` | Provider that starts fork teammates |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-experimental-tool-agent-team) is the exhaustive source for every accepted field and its JSDoc.

Try it by asking the Lead model: "create a teammate named reviewer to check the diff, then send reviewer the change summary". The model calls the creation tool and then the messaging tool.

### What the model can do

The nine tools group into four capabilities:

- **Create a teammate** — `spawn_teammate` takes a name, a description, and the initial task; only the Lead can call it.
- **Send messages** — `send_message` steers a running member at its nearest step boundary, starts or resumes an inactive member.
- **See and wait** — `list_agents` returns each member’s `target` and availability; `wait_agent` waits for the next team change; `interrupt_agent` stops a teammate's current turn (Lead only).
- **Manage the task board** — `team_task_create`, `team_task_list`, `team_task_get`, and `team_task_update` add, browse, read, and update shared tasks.

Creation and listing results identify members by `target`, with no member Session ID. Use that value in message and interrupt calls or the task tools’ `owner` parameter; task `ownerName` uses the same value. `inactive` means no turn is executing, whether the member is loaded or must be resumed; it does not describe task completion or outcome. `provisioning` and `failed` describe member creation. Any member can message any other member and use the task board; only the Lead creates and interrupts teammates. Task updates keep the domain's owner and revision checks, so an outdated edit is rejected instead of overwriting newer work.

### Teammate LLM routes

The Host owns whether a Session may select child LLM routes and which exact `{ provider, model }` routes it may select; the Team tool adds no authority of its own. Enable **Subagent model selection** in the Plugins settings and add at least one route. A Lead Session composed after that records the routes before its first request, and keeps them across resume.

With a recorded route list, the Lead’s `spawn_teammate` accepts `provider`, `model`, and `reasoning_effort` and exposes `list_subagent_models` for discovery; without one, its schema stays fixed and those fields are rejected. Supply `provider` and `model` together; omitting them makes the teammate inherit the Lead’s route. The route is resolved and validated before the teammate exists, so an unregistered provider, an unsupported effort, or a route outside the list fails without creating a member. Fork teammates keep no route selection, because the inherited conversation prefix belongs to the Lead’s route. Teammates never select routes: only the Lead creates teammates.

### What success and failure look like

`send_message` returns `{ "sent": true }` after inbox acceptance, without exposing the message ID. Success does not confirm recipient processing or a synchronous storage flush; send failures are reported as tool errors. `wait_agent` returns `noProgress` right away when no other member is running or provisioning, telling the caller to wake a teammate first; otherwise it waits for the next change and the caller re-reads state afterward. Task edits based on an outdated revision are rejected rather than overwriting newer work.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

This section explains the design decisions behind the adapter and points at the code that realizes them; the observable behavior is fully covered in [Use this package](#use-this-package).

### Design philosophy

The adapter is built on three commitments:

- **Scoped, not global.** Every registration lives on the member Agent's own `ctx`; installation uses the member identity available when the Agent is published.
- **Declared results, compact JSON.** Every tool declares its complete result schema and renders that value as compact JSON, so the compiler checks `execute` against what the model is promised and no result spends tokens on indentation.
- **The domain owns authority.** Tools delegate to `ctx.agentTeams`, which enforces Lead authority and revision checks; the adapter adds no weaker path.

The [Agent Teams Agent Note](../../../.agents/notes/implemented/feature/2026-08-05-agent-teams.md) owns the model-facing and scoping decisions.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Plugin entry: config, the fixed policy text, and the nine scoped tool registrations |

### Policy and tools

One `team:policy` section on the member scope states the shared coordination rules; the fixed text and the nine tool registrations are declared in [`src/index.ts`](src/index.ts). The nine tool schemas are registered in scopes recognized as Team members at publication. Scoped registrations with the same names as the legacy global continuable-subagent controls shadow those globals for team members only.

Route selection reuses the owner of the user-facing authorization decision. `@deepseek-ai/dsh-tool-subagent/model-selection`, `.../model-selection-state`, and `.../list-models` supply route merging, adapter preflight, the durable per-Session policy, and the discovery tool; this package only decides which scope receives them. The route policy is resolved once per Agent, when its tools are installed, and only for a Lead.

### Scoped registration and teardown

`maybeInstall` runs for every live Agent and subscribes to `agent/created`; it skips Agents without Team membership. Disposal of an Agent runs the installed disposer, and plugin HMR disposes every installed scope before reinstall. Each disposer unwinds registrations in reverse order, so a failed install cannot leave a partial scope.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the package-level contract is not enough. They move from the domain service to the exact schemas and the decisions behind the design.

- [agent-team package](../agent-team/README.md) — the `ctx.agentTeams` domain service behind these tools.
- [Agent Teams subsystem](../../../docs/subsystems/agent-team.md) — durable Team types and service API.
- [Generated tool catalog](../../../docs/tool-catalog.md#deepseek-aidsh-experimental-tool-agent-team) — every tool schema the model receives.
- [Agent Teams Agent Note](../../../.agents/notes/implemented/feature/2026-08-05-agent-teams.md) — model-facing, scoping, and isolation decisions.

-----

<a id="model-experience"></a>
## Model Experience

### Team policy and tools

#### What the model sees

One shared system policy covers Team availability, shared-cwd safety, task coordination, Steer delivery, inbox acceptance, and the Lead’s duty to wait. All nine schemas are identical for Leads and teammates; execution enforces Lead-only operations. Required runtime context states `You are the Team Lead named "lead".` or `You are teammate "<name>".` with `Your Team Lead is named "lead".`, plus roster and messaging instructions. Identity comes from current Team membership, survives optional-context suppression, and is restored when compaction removes its snapshot. An ordinary fork from a teammate receives its current Lead identity.

#### Token effect

Fixed policy and schema cost on every Team member request. Identity is part of the complete runtime-context snapshot. An unchanged retained snapshot adds no message; changed or removed context causes the loop to append a complete snapshot, including identity. Tool calls add compact JSON roster, task, wait, or receipt results. Peer content is retained by the Team domain in the target's history.

#### KV Cache effect

With the same provider/model, shared system policy, and tool schemas, a fork retains the parent request prefix and appends its task and current runtime context. Tool results and peer messages append after the reusable request prefix. Sessions recorded with identity inside the system prompt can change that prefix on their first request under this layout; actual provider cache hits remain best-effort.

### Teammate LLM route selection

#### What the model sees

Only a Lead whose Session recorded an authorized route list sees the `provider`, `model`, and `reasoning_effort` parameters on `spawn_teammate`, the route wording in its description, and `list_subagent_models`. Every other scope keeps the fixed six-parameter creation schema and no discovery tool. Route selection changes the teammate’s own requests, never the Lead’s.

#### Token effect

Enabling route selection rewrites the Lead’s `spawn_teammate` description and adds three schema properties for the whole Session. `list_subagent_models` results enter the transcript only when the model calls it; the allowlist itself costs no tokens.

#### KV Cache effect

The Lead’s request prefix changes when the preference is enabled or the created schema changes, once per Session. A teammate created with a selected route differs from the Lead’s route, so its own requests no longer share the Lead’s provider-side prefix; a fork teammate keeps the Lead’s route and its inherited prefix.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits describe what the policy and tools cannot guarantee for a team. They are current package constraints, not a comparison with other collaboration surfaces.

- **Prompt policy is coordination, not confinement** — it cannot stop Bash or external processes from writing overlapping files.
- **No Web controls** — browser roster and task-board presentation is outside this runtime package.
- **Route selection needs the Host preference** — without it the Lead cannot choose teammate models at all, and an enabled preference reaches only Sessions composed after the change.
- **`list_subagent_models` has one global name** — the Team tool registers it only when the scope has no other definition, so a composition that also mounts `@deepseek-ai/dsh-tool-subagent` with model selection enabled keeps that instance’s discovery tool.
- **Roster model reporting needs the loaded child** — `list_agents` reports a teammate’s own route from its loaded Agent; once that Agent is released the row omits `model`, because the durable Team record stores no route and reporting the Lead’s would misrepresent a teammate that selected its own.
- **Experimental prototype with no stability promise** — the package is public, but its schemas can change freely while it incubates.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
