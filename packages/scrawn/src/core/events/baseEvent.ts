import type { Scrawn } from '../scrawn.js';
import { eventPayload } from '../types/event.js';

/**
 * Abstract base class for all Scrawn event handlers.
 * 
 * All plugins must extend this class and implement the required properties and methods.
 * The base class provides access to the Scrawn instance for credential management and event routing.
 * 
 * @example
 * ```typescript
 * export class MyEvent extends BaseEvent {
 *   name = 'my_event';
 *   authType = 'api';
 * 
 *   constructor(scrawn: Scrawn) {
 *     super(scrawn);
 *   }
 * 
 *   async consume(payload: eventPayload): Promise<void> {
 *     // Handle event consumption
 *   }
 * }
 * ```
 */
export abstract class BaseEvent {
  /**
   * Unique name identifier for this event type.
   * Used to register and route events to the correct handler.
   */
  abstract name: string;
  
  /**
   * Name of the authentication method this event requires.
   * Must match a registered auth method name (e.g., 'api', 'oauth').
   */
  abstract authType: string;
  
  /**
   * Protected reference to the Scrawn SDK instance.
   * Provides access to credential management and event routing.
   */
  protected scrawn: Scrawn;

  /**
   * Creates a new event handler instance.
   * 
   * @param scrawn - The Scrawn SDK instance that manages this event handler
   */
  constructor(scrawn: Scrawn) {
    this.scrawn = scrawn;
  }

  /**
   * Consume an event with the given payload.
   * 
   * This method should be called by users to trigger event processing.
   * It internally routes the event through the Scrawn SDK for authentication and ingestion.
   * 
   * @param payload - The event data to process
   * @returns A promise that resolves when the event has been processed
   * 
   * @example
   * ```typescript
   * const event = new SdkCallEvent(scrawn);
   * await event.consume({ userId: 'u123', usage: 3 });
   * ```
   */
  abstract consume(payload: eventPayload): Promise<void>;
}
