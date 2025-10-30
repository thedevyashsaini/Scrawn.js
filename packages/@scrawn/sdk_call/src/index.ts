import { EVENT_SOURCE, BaseEvent, type Scrawn, type eventPayload } from '@scrawn/core';
import { sdkCallEventPayload } from './types/event.js';

/**
 * Event handler for tracking SDK/API call usage.
 * 
 * This plugin tracks SDK calls for billing and usage monitoring purposes.
 * Each call records the user ID and usage amount to the Scrawn backend.
 * 
 * @example
 * ```typescript
 * import { Scrawn } from '@scrawn/core';
 * import { SdkCallEvent } from '@scrawn/sdk_call';
 * 
 * const scrawn = new Scrawn({ apiKey: 'sk_test_...' });
 * await scrawn.init({ scope: ['sdk_call'] });
 * 
 * const sdkEvent = new SdkCallEvent(scrawn);
 * await sdkEvent.consume({
 *   userId: 'user_123',
 *   usage: 5
 * });
 * ```
 */
export class SdkCallEvent extends BaseEvent {
  /** Event type identifier */
  name = 'sdk_call';
  
  /** Authentication method used (API key) */
  authType = 'api';

  /**
   * Creates a new SDK call event handler.
   * 
   * @param scrawn - The Scrawn SDK instance
   */
  constructor(scrawn: Scrawn) {
    super(scrawn);
  }

  /**
   * Track an SDK call event.
   * 
   * Records the SDK usage to the Scrawn backend for billing tracking.
   * The event is authenticated using the API key provided during SDK initialization.
   * 
   * @param payload - The SDK call data to track
   * @param payload.userId - Unique identifier of the user making the call
   * @param payload.usage - Number of SDK calls or usage units
   * @returns A promise that resolves when the event is tracked
   * 
   * @example
   * ```typescript
   * await sdkEvent.consume({
   *   userId: 'user_abc123',
   *   usage: 10
   * });
   * ```
   */
  async consume(payload: sdkCallEventPayload): Promise<void> {
    return this.scrawn.consume({
      [EVENT_SOURCE]: this.name,
      ...payload,
    } as eventPayload);
  }
}

/**
 * Register the SDK call event handler with the Scrawn SDK.
 * 
 * This function is called automatically during SDK initialization when
 * 'sdk_call' is included in the scope array.
 * 
 * Users typically don't need to call this directly.
 * 
 * @param scrawn - The Scrawn SDK instance to register with
 * 
 * @internal
 */
export function register(scrawn: Scrawn) {
  const handler = new SdkCallEvent(scrawn);
  scrawn.registerEvent(handler.name, handler);
}

export * from './types/event.js';