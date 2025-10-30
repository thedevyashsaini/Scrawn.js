/**
 * Unique symbol used to identify the source of an event.
 * This symbol is attached to event payloads to route them to the correct handler.
 * 
 * @example
 * ```typescript
 * const eventObj = {
 *   [EVENT_SOURCE]: 'sdk_call',
 *   userId: 'u123',
 *   usage: 3
 * };
 * ```
 */
export const EVENT_SOURCE = Symbol('scrawn_event_source');
