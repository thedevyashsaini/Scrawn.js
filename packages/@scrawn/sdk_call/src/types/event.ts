/**
 * Payload structure for SDK call tracking events.
 * 
 * Used to track API/SDK usage for billing purposes.
 * 
 * @property userId - The unique identifier of the user making the SDK call
 * @property usage - The number of SDK calls or usage units to track
 * 
 * @example
 * ```typescript
 * const payload: sdkCallEventPayload = {
 *   userId: 'user_abc123',
 *   usage: 5
 * };
 * 
 * await sdkEvent.consume(payload);
 * ```
 */
export type sdkCallEventPayload = {
    /** Unique identifier for the user making the SDK call */
    userId: string;
    /** Number of SDK calls or usage units to track for billing */
    usage: number;
}