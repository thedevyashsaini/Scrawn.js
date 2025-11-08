/**
 * Payload structure for SDK call tracking events.
 * 
 * @property userId - The user ID associated with this event
 * @property debitAmount - Amount to debit for billing tracking
 * 
 * @example
 * ```typescript
 * const payload: SdkCallEventPayload = {
 *   userId: 'u123',
 *   debitAmount: 5
 * };
 * ```
 */
export type SdkCallEventPayload = {
    /** User ID associated with this event */
    userId: string;
    /** Debit amount or count for billing purposes */
    debitAmount: number;
}
