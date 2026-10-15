/** Durable per-session state for the user-controlled model-selection opt-in. */

import { z as zod } from 'zod'
import type { Context } from '@deepseek-ai/cordis'
import { SessionSeq } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import type SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import { assertAllowedModelRoutes, type AllowedModelRoute, type ModelSelectionPolicy } from './model-selection.ts'
import type { SubagentModelSelectionConfig } from './model-selection-settings.ts'

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Records that this session's delegation tool exposes child provider,
     * model, and reasoning-effort selection. Appended before the first model
     * request; absence means the fixed-route definition. Log-only: it carries
     * no `surfaceOp` and never enters model history.
     */
    'subagent/model-selection-policy': {
      /** Exact routes this Session may select explicitly for a child. */
      allowedModels: AllowedModelRoute[]
    }
  }
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    /** Exact routes authorized for child LLM selection, or null when disabled. */
    subagentModelSelectionPolicy: AllowedModelRoute[] | null
  }
}

const modelSelectionPolicySchema: zod.ZodType<AllowedModelRoute[] | null> = zod.array(zod.object({
  provider: zod.string().min(1),
  model: zod.string().min(1),
}).strict()).min(1).nullable()

/** Host-only projection of the durable model-selection policy. */
export const subagentModelSelectionProjectionDefinition = {
  key: 'subagentModelSelectionPolicy',
  stateVersion: 1,
  stateSchema: modelSelectionPolicySchema,
  init: () => null,
  apply: (policy, event) => {
    if (policy !== null || event.type !== 'subagent/model-selection-policy') return policy
    const { allowedModels } = event.data
    assertAllowedModelRoutes(allowedModels)
    if (allowedModels.length === 0) {
      throw new Error('subagent/model-selection-policy requires at least one route')
    }
    return allowedModels
  },
} satisfies ProjectionDefinition<'subagentModelSelectionPolicy', AllowedModelRoute[] | null>

/**
 * Read the exact route list captured for a model-selectable definition.
 * @param projections - registry that owns the policy projection.
 * @param session - session whose durable decision is read.
 * @returns a detached route list, or undefined for the fixed-route definition.
 */
export function subagentModelSelectionPolicy(
  projections: Pick<SessionProjectionRegistry, 'stateOf'>,
  session: Session,
): AllowedModelRoute[] | undefined {
  return projections.stateOf(session, 'subagentModelSelectionPolicy')?.map(route => ({ ...route }))
}

/**
 * Append the route policy once, before its definition can reach a model request.
 * @param projections - registry that owns the policy projection.
 * @param session - session receiving the model-selectable definition.
 * @param allowedModels - exact routes the definition may select explicitly.
 */
export function recordSubagentModelSelection(
  projections: Pick<SessionProjectionRegistry, 'stateOf'>,
  session: Session,
  allowedModels: readonly AllowedModelRoute[],
): void {
  if (subagentModelSelectionPolicy(projections, session) !== undefined) return
  session.append('subagent/model-selection-policy', {
    allowedModels: allowedModels.map(route => ({ ...route })),
  })
}

/**
 * Resolve the route policy one model-selectable delegation definition captures
 * for a Session, recording it before that definition can reach a request. A
 * Session already carrying the durable event keeps it, a child inherits its
 * live parent's recorded routes, and only a newly composed top-level Session
 * samples the current Host preference.
 * @param ctx - Context providing the projection registry and Session registry.
 * @param settings - Host preference owner, or undefined when the deployment mounts none.
 * @param target - Session receiving the model-selectable definition.
 * @returns the captured policy, or undefined for a fixed-route definition.
 */
export function resolveModelSelectionPolicy(
  ctx: Context,
  settings: SubagentModelSelectionConfig | undefined,
  target: Session,
): ModelSelectionPolicy | undefined {
  if (settings === undefined) return undefined
  const freshSession = target.firstLiveSeq === 0
    // oxlint-disable-next-line typescript/no-deprecated -- Existing Session history read; migration deferred.
    && target.eventAt(SessionSeq(0))?.type !== 'session/end-seed'
  let allowedModels = subagentModelSelectionPolicy(ctx.sessionProjections, target)
  if (allowedModels === undefined) {
    const parentId = target.header.origin === 'subagent' ? target.header.parentSession : undefined
    if (parentId !== undefined) {
      const sessions = ctx.get('sessions')
      if (sessions === undefined) {
        throw new Error('child model-selection inheritance requires the Session registry')
      }
      const parent = sessions.get(parentId)
      allowedModels = parent === undefined
        ? undefined
        : subagentModelSelectionPolicy(ctx.sessionProjections, parent)
    } else if (freshSession) {
      const current = settings.current()
      allowedModels = current.enabled ? current.allowedModels : undefined
    }
  }
  if (allowedModels !== undefined) {
    recordSubagentModelSelection(ctx.sessionProjections, target, allowedModels)
  }
  return allowedModels === undefined ? undefined : { routes: allowedModels }
}
