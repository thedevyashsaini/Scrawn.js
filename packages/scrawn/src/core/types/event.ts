import { EVENT_SOURCE } from "../../symbols.js";

/**
 * Base type for event payloads processed by the Scrawn SDK.
 * 
 * All events must include the EVENT_SOURCE symbol to identify which handler should process them.
 * Additional properties can be added by specific event types.
 * 
 * @property [EVENT_SOURCE] - Unique symbol identifying the event source/handler
 * @property userId - The user ID associated with this event
 * @property usage - Usage amount/count for billing tracking
 * 
 * @example
 * ```typescript
 * const payload: eventPayload = {
 *   [EVENT_SOURCE]: 'sdk_call',
 *   userId: 'u123',
 *   usage: 5
 * };
 * ```
 */
export type eventPayload = {
    /** Unique symbol identifying which event handler should process this event */
    [EVENT_SOURCE]: string;
    /** User ID associated with this event */
    userId: string;
    /** Usage amount or count for billing purposes */
    usage: number;
}