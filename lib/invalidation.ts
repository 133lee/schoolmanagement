/**
 * Lightweight Invalidation Bus
 *
 * PURPOSE:
 * Signals when data snapshots become stale due to mutations.
 * NOT a cache, NOT shared state, NOT derived state.
 *
 * USAGE:
 * - Mutations invalidate keys after success
 * - Hooks/pages subscribe to relevant keys
 * - Subscribers decide: refetch now OR next mount
 *
 * ARCHITECTURE PRINCIPLE:
 * Backend remains single source of truth.
 * This only coordinates "when to ask backend again."
 */

/**
 * Invalidation Keys
 *
 * Semantic, role-agnostic keys representing data domains.
 *
 * Naming Convention:
 * - Entity-level: 'students', 'teachers', 'classes'
 * - View-level: 'teacher-classes', 'hod-dashboard'
 * - Feature-level: 'attendance-analytics', 'assessments'
 */
export type InvalidationKey =
  // Core entities
  | 'students'
  | 'teachers'
  | 'classes'
  | 'subjects'
  | 'departments'
  | 'parents'

  // Role-specific views
  | 'teacher-classes'       // Teacher's assigned classes view
  | 'hod-dashboard'         // HOD department summary
  | 'admin-dashboard'       // Admin system stats

  // Feature-specific
  | 'attendance-analytics'  // Attendance reports/analytics
  | 'assessments'           // Assessment data
  | 'report-cards'          // Report card generation
  | 'enrollments';          // Student enrollments

type InvalidationListener = () => void;

/**
 * Invalidation Bus
 *
 * Simple pub/sub for cache invalidation signals.
 * No state, no data, just coordination.
 */
class InvalidationBus {
  private listeners = new Map<InvalidationKey, Set<InvalidationListener>>();

  /**
   * Subscribe to invalidation events for a key
   *
   * @param key - Data domain to watch
   * @param listener - Callback when domain is invalidated
   * @returns Unsubscribe function
   */
  subscribe(key: InvalidationKey, listener: InvalidationListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    this.listeners.get(key)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(listener);
    };
  }

  /**
   * Invalidate one or more data domains
   *
   * RULE: Only call after successful mutations.
   * NEVER call on optimistic updates or before server confirmation.
   *
   * @param keys - Domain(s) that are now stale
   */
  invalidate(...keys: InvalidationKey[]): void {
    keys.forEach(key => {
      this.listeners.get(key)?.forEach(listener => {
        // Call listener (may trigger refetch, mark stale, etc.)
        listener();
      });
    });
  }

  /**
   * Get current subscriber count (debugging)
   */
  getSubscriberCount(key: InvalidationKey): number {
    return this.listeners.get(key)?.size ?? 0;
  }

  /**
   * Clear all listeners (testing only)
   */
  clear(): void {
    this.listeners.clear();
  }
}

/**
 * Global invalidation bus instance
 *
 * Singleton pattern - one bus for entire app.
 */
export const invalidationBus = new InvalidationBus();
