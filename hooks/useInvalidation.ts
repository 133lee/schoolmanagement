import { useEffect } from 'react';
import { invalidationBus, InvalidationKey } from '@/lib/invalidation';

/**
 * Hook: Subscribe to invalidation events
 *
 * USAGE:
 * ```typescript
 * // Lazy refetch (next mount)
 * useInvalidation('teacher-classes', () => {
 *   // Mark stale, refetch on next mount
 * });
 *
 * // Eager refetch (immediate)
 * useInvalidation('teacher-classes', () => {
 *   fetchMyClasses(); // Refetch now if page visible
 * });
 * ```
 *
 * WHEN TO USE:
 * - Operational pages: eager refetch
 * - Summary pages: lazy refetch or ignore
 * - Analytics: ignore (manual refresh button)
 *
 * @param key - Invalidation key to subscribe to
 * @param onInvalidate - Callback when key is invalidated
 */
export function useInvalidation(
  key: InvalidationKey,
  onInvalidate: () => void
): void {
  useEffect(() => {
    const unsubscribe = invalidationBus.subscribe(key, onInvalidate);
    return unsubscribe;
  }, [key, onInvalidate]);
}

/**
 * Hook: Subscribe to multiple invalidation keys
 *
 * USAGE:
 * ```typescript
 * useInvalidationMulti(['students', 'classes'], () => {
 *   refetchDashboard();
 * });
 * ```
 *
 * @param keys - Array of invalidation keys
 * @param onInvalidate - Callback when any key is invalidated
 */
export function useInvalidationMulti(
  keys: InvalidationKey[],
  onInvalidate: () => void
): void {
  useEffect(() => {
    const unsubscribers = keys.map(key =>
      invalidationBus.subscribe(key, onInvalidate)
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [keys, onInvalidate]);
}
