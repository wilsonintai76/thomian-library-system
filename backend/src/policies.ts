/**
 * PBAC (Policy-Based Access Control) System
 *
 * Instead of hardcoded role checks (RBAC), each action maps to one or more
 * policies. A policy is a function that receives the authenticated user's
 * context and returns true if the action is allowed.
 *
 * This makes it easy to add fine-grained rules later (e.g. "only between 8am
 * and 6pm", "only for own patron record", "department-head can override").
 */

import { Context } from 'hono'
import { Bindings, Variables } from './utils'

// ── Policy identifiers ──────────────────────────────────────────────────────
// Every protected action in the system is identified by a unique string.
export const Policy = {
  // Catalog
  CATALOG_CREATE:       'catalog:create',
  CATALOG_UPDATE:       'catalog:update',
  CATALOG_DELETE:       'catalog:delete',
  CATALOG_PREDICT_DDC: 'catalog:predict_ddc',
  CATALOG_RECLASSIFY:   'catalog:reclassify',
  CATALOG_PRINT_LABELS: 'catalog:print_labels',

  // Circulation
  CIRCULATION_CHECKOUT:     'circulation:checkout',
  CIRCULATION_RETURN:       'circulation:return',
  CIRCULATION_RENEW:        'circulation:renew',
  CIRCULATION_PLACE_HOLD:   'circulation:place_hold',
  CIRCULATION_VIEW_LOANS:   'circulation:view_loans',
  CIRCULATION_VIEW_OVERDUE: 'circulation:view_overdue',

  // Patrons
  PATRON_CREATE:      'patron:create',
  PATRON_UPDATE:      'patron:update',
  PATRON_DELETE:      'patron:delete',
  PATRON_UPDATE_SELF: 'patron:update_self',

  // Transactions
  TRANSACTION_VIEW:  'transaction:view',
  TRANSACTION_CREATE: 'transaction:create',

  // System / Admin
  SYSTEM_UPLOAD:        'system:upload',
  SYSTEM_MANAGE_CLASSES: 'system:manage_classes',
  SYSTEM_MANAGE_RULES:   'system:manage_rules',
  SYSTEM_UPDATE_CONFIG:  'system:update_config',
  SYSTEM_MANAGE_ALERTS:  'system:manage_alerts',
  SYSTEM_MANAGE_EVENTS:  'system:manage_events',
  SYSTEM_EXPORT:        'system:export',
  SYSTEM_IMPORT:        'system:import',

  // AI
  AI_ANALYZE_BLUEPRINT: 'ai:analyze_blueprint',
} as const

export type PolicyKey = (typeof Policy)[keyof typeof Policy]

// ── Policy evaluation ───────────────────────────────────────────────────────
export type UserContext = {
  id: string
  username: string
  role: 'ADMINISTRATOR' | 'LIBRARIAN' | 'TEACHER' | 'STUDENT'
}

/**
 * The policy store maps each PolicyKey to a list of authorisation checks.
 * A check can be:
 *  - A string role name (simple RBAC-style)
 *  - A function that receives the user context and returns boolean
 *
 * This hybrid approach lets us start simple but grow into rich rules such as
 * "own record only", "time-bounded access", or "department-scoped".
 */
type PolicyCheck = string | ((user: UserContext, c: Context<{ Bindings: Bindings, Variables: Variables }>) => boolean | Promise<boolean>)

const policies: Record<PolicyKey, PolicyCheck[]> = {
  // ── Catalog ──────────────────────────────────────────────────────────────
  [Policy.CATALOG_CREATE]:       ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.CATALOG_UPDATE]:       ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.CATALOG_DELETE]:       ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.CATALOG_PREDICT_DDC]: ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.CATALOG_RECLASSIFY]:   ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.CATALOG_PRINT_LABELS]: ['ADMINISTRATOR', 'LIBRARIAN'],

  // ── Circulation ──────────────────────────────────────────────────────────
  [Policy.CIRCULATION_CHECKOUT]:     ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.CIRCULATION_RETURN]:       ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.CIRCULATION_RENEW]:        ['ADMINISTRATOR', 'LIBRARIAN', 'TEACHER', 'STUDENT'],
  [Policy.CIRCULATION_PLACE_HOLD]:   ['ADMINISTRATOR', 'LIBRARIAN', 'TEACHER', 'STUDENT'],
  [Policy.CIRCULATION_VIEW_LOANS]:   ['ADMINISTRATOR', 'LIBRARIAN', 'TEACHER'],
  [Policy.CIRCULATION_VIEW_OVERDUE]: ['ADMINISTRATOR', 'LIBRARIAN'],

  // ── Patrons ──────────────────────────────────────────────────────────────
  [Policy.PATRON_CREATE]:      ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.PATRON_UPDATE]:      ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.PATRON_DELETE]:      ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.PATRON_UPDATE_SELF]: ['TEACHER', 'STUDENT'],

  // ── Transactions ─────────────────────────────────────────────────────────
  [Policy.TRANSACTION_VIEW]:   ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.TRANSACTION_CREATE]: ['ADMINISTRATOR', 'LIBRARIAN'],

  // ── System / Admin ───────────────────────────────────────────────────────
  [Policy.SYSTEM_UPLOAD]:          ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.SYSTEM_MANAGE_CLASSES]:  ['ADMINISTRATOR', 'LIBRARIAN', 'TEACHER'],
  [Policy.SYSTEM_MANAGE_RULES]:    ['ADMINISTRATOR'],
  [Policy.SYSTEM_UPDATE_CONFIG]:   ['ADMINISTRATOR'],
  [Policy.SYSTEM_MANAGE_ALERTS]:   ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.SYSTEM_MANAGE_EVENTS]:   ['ADMINISTRATOR', 'LIBRARIAN'],
  [Policy.SYSTEM_EXPORT]:         ['ADMINISTRATOR'],
  [Policy.SYSTEM_IMPORT]:         ['ADMINISTRATOR'],

  // ── AI ───────────────────────────────────────────────────────────────────
  [Policy.AI_ANALYZE_BLUEPRINT]: ['ADMINISTRATOR', 'LIBRARIAN'],
}

// ── Middleware factory ──────────────────────────────────────────────────────
/**
 * `enforcePolicy` replaces the old `requireRole`.
 *
 * Usage:
 *   app.get('/active_loans', enforcePolicy(Policy.CIRCULATION_VIEW_LOANS), handler)
 */
export function enforcePolicy(...policyKeys: PolicyKey[]) {
  return async (c: Context<{ Bindings: Bindings, Variables: Variables }>, next: () => Promise<void>) => {
    const user = c.get('user') as UserContext | undefined
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized', message: 'Authentication required' }, 401)
    }

    // If ANY of the listed policies pass, the request is allowed.
    for (const key of policyKeys) {
      const checks = policies[key]
      if (!checks) continue

      for (const check of checks) {
        if (typeof check === 'string') {
          // Simple role string match
          if (user.role === check) return next()
        } else {
          // Advanced predicate function
          const allowed = await check(user, c)
          if (allowed) return next()
        }
      }
    }

    return c.json({
      success: false,
      error: 'Forbidden',
      message: 'You do not have the required permissions for this action.',
      requiredPolicies: policyKeys,
    }, 403)
  }
}
