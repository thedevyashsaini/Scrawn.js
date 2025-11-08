import type { AuthBase } from './auth/baseAuth.js';
import type { SdkCallEventPayload } from './types/event.js';
import type { AuthRegistry, AuthMethodName, AllCredentials } from './types/auth.js';
import { ApiKeyAuth } from './auth/apiKeyAuth.js';
import { ScrawnLogger } from '../utils/logger.js';
const log = new ScrawnLogger('Scrawn');

/**
 * Main SDK class for Scrawn billing infrastructure.
 * 
 * Manages authentication, event tracking, and credential caching.
 * All event consumption methods are available directly on the SDK instance.
 * 
 * @example
 * ```typescript
 * import { Scrawn } from '@scrawn/core';
 * 
 * // Initialize SDK
 * const scrawn = new Scrawn({ apiKey: process.env.SCRAWN_KEY });
 * await scrawn.init();
 * 
 * // Track SDK calls
 * await scrawn.sdkCallEventConsumer({ userId: 'u123', debitAmount: 3 });
 * ```
 */
export class Scrawn {
  /** Map of authentication method names to their implementations */
  private authMethods = new Map<AuthMethodName, AuthBase<AllCredentials>>();
  
  /** 
   * Cache of credentials keyed by auth method name for performance.
   * Keys are restricted to registered auth method names only.
   */
  private credCache = new Map<AuthMethodName, AllCredentials>();
  
  /** API key used for default authentication */
  private apiKey: AllCredentials['apiKey'];

  /**
   * Creates a new Scrawn SDK instance.
   * 
   * @param config - Configuration object
   * @param config.apiKey - Your Scrawn API key for authentication
   * 
   * @example
   * ```typescript
   * const scrawn = new Scrawn({ apiKey: 'sk_test_...' });
   * await scrawn.init();
   * ```
   */
  constructor(config: { apiKey: AllCredentials['apiKey'] }) {
    try {
      this.apiKey = config.apiKey;
      this.registerAuthMethod('api', new ApiKeyAuth(this.apiKey));
    } catch (error) {
      log.error('Failed to initialize Scrawn SDK');
      throw error;
    }
  }

  /**
   * Register an authentication method with the SDK.
   * 
   * Auth methods handle credential management and can be shared across multiple event types.
   * Only auth method names defined in AuthRegistry are allowed.
   * 
   * @param name - Unique identifier for this auth method (must be in AuthRegistry)
   * @param auth - Instance of an AuthBase implementation
   * 
   * @example
   * ```typescript
   * scrawn.registerAuthMethod('api', new ApiKeyAuth('sk_test_...'));
   * ```
   */
  registerAuthMethod<K extends AuthMethodName>(
    name: K,
    auth: AuthBase<AuthRegistry[K]>
  ) {
    this.authMethods.set(name, auth as AuthBase<AllCredentials>);
  }

  /**
   * Get credentials for a specific authentication method.
   * 
   * Credentials are cached after the first fetch for performance.
   * Subsequent calls return the cached value without re-fetching.
   * Only auth method names defined in AuthRegistry are allowed.
   * 
   * @param authMethodName - Name of the auth method to get credentials for (must be in AuthRegistry)
   * @returns A promise that resolves to the credentials object
   * @throws Error if the auth method is not registered
   * 
   * @example
   * ```typescript
   * const creds = await scrawn.getCredsFor('api');
   * // { apiKey: 'sk_test_...' }
   * ```
   */
  async getCredsFor<K extends AuthMethodName>(
    authMethodName: K
  ): Promise<AuthRegistry[K]> {
    // Check cache first
    if (this.credCache.has(authMethodName)) {
      return this.credCache.get(authMethodName)! as AuthRegistry[K];
    }

    // Get fresh creds from auth method
    const auth = this.authMethods.get(authMethodName);
    if (!auth) {
      throw new Error(`No auth method registered: ${authMethodName}`);
    }

    const creds = await auth.getCreds();
    this.credCache.set(authMethodName, creds);
    return creds as AuthRegistry[K];
  }

  /**
   * Track an SDK call event.
   * 
   * Records SDK usage to the Scrawn backend for billing tracking.
   * The event is authenticated using the API key provided during SDK initialization.
   * 
   * @param payload - The SDK call data to track
   * @param payload.userId - Unique identifier of the user making the call
   * @param payload.debitAmount - Amount to debit from the user's account 
   * @returns A promise that resolves when the event is tracked
   * 
   * @example
   * ```typescript
   * await scrawn.sdkCallEventConsumer({
   *   userId: 'user_abc123',
   *   debitAmount: 10
   * });
   * ```
   */
  async sdkCallEventConsumer(payload: SdkCallEventPayload): Promise<void> {
    // TODO: input validation using zod schema to be added here
    return this.consumeEvent(payload, 'api', 'SERVERLESS_FUNCTION_CALL'); // TODO: change this event type when jaydeep changes it in backend
  }

  /**
   * Internal method to consume and process an event.
   * 
   * This method:
   * 1. Validates authentication
   * 2. Fetches/caches credentials
   * 3. Executes any pre-run hooks
   * 4. Processes the event
   * 
   * @param payload - Event payload data
   * @param authMethodName - Name of the auth method to use (must be in AuthRegistry)
   * @param eventType - Type of event for categorization
   * @returns A promise that resolves when the event is processed
   * @throws Error if auth method is not registered
   * 
   * @internal
   */
  private async consumeEvent<K extends AuthMethodName>(
    payload: SdkCallEventPayload,
    authMethodName: K,
    eventType: string
  ): Promise<void> {
    const auth = this.authMethods.get(authMethodName);
    if (!auth) throw new Error(`No auth registered for type ${authMethodName}`);

    // Run pre-hook if exists
    if (auth.preRun) await auth.preRun();
    
    // Get creds (from cache or fresh)
    const creds = await this.getCredsFor(authMethodName);
    
    // Ingest the event here
    log.info(`Ingesting event (type: ${eventType}) with creds: ${JSON.stringify(creds)}, payload: ${JSON.stringify(payload)}`);
    // TODO: Actual API call to Scrawn backend will go here

    if (auth.postRun) await auth.postRun();
  }
}
