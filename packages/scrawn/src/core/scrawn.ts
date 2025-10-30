import { EVENT_SOURCE } from '../symbols.js';
import type { AuthBase } from './auth/baseAuth.js';
import type { BaseEvent } from './events/baseEvent.js';
import { eventPayload } from './types/event.js';

/**
 * Main SDK class for Scrawn billing infrastructure.
 * 
 * Manages authentication methods, event handlers, and credential caching.
 * Automatically loads and registers plugins based on the configured scope.
 * 
 * @example
 * ```typescript
 * import { Scrawn } from '@scrawn/core';
 * import { SdkCallEvent } from '@scrawn/sdk_call';
 * 
 * // Initialize SDK
 * const scrawn = new Scrawn({ apiKey: process.env.SCRAWN_KEY });
 * await scrawn.init({ scope: ['sdk_call'] });
 * 
 * // Use event handler
 * const sdkEvent = new SdkCallEvent(scrawn);
 * await sdkEvent.consume({ userId: 'u123', usage: 3 });
 * ```
 */
export class Scrawn {
  /** Map of authentication method names to their implementations */
  private authMethods = new Map<string, AuthBase>();
  
  /** Map of event names to their handler instances */
  private eventRegistry = new Map<string, BaseEvent>();
  
  /** Cache of credentials keyed by auth method name for performance */
  private credCache = new Map<string, any>(); 
  
  /** API key used for default authentication */
  private apiKey: string;

  /**
   * Creates a new Scrawn SDK instance.
   * 
   * @param config - Configuration object
   * @param config.apiKey - Your Scrawn API key for authentication
   * 
   * @example
   * ```typescript
   * const scrawn = new Scrawn({ apiKey: 'sk_test_...' });
   * ```
   */
  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
  }

  /**
   * Initialize the SDK and auto-load plugins based on scope.
   * 
   * This method:
   * 1. Registers the default API key authentication method
   * 2. Dynamically imports and registers plugins specified in the scope
   * 3. Each plugin's `register()` function is called to set up event handlers
   * 
   * @param config - Initialization configuration
   * @param config.scope - Array of plugin names to load (e.g., ['sdk_call', 'serverless'])
   * @returns A promise that resolves when initialization is complete
   * 
   * @example
   * ```typescript
   * await scrawn.init({ scope: ['sdk_call'] });
   * // Plugins are now loaded and ready to use
   * ```
   */
  async init(config: { scope: string[] }) {
    // Register default auth method
    const { ApiKeyAuth } = await import('./auth/apiKeyAuth.js');
    this.registerAuthMethod('api', new ApiKeyAuth(this.apiKey));

    // Auto-load plugins based on scope
    // Each plugin in scope gets dynamically imported and auto-registers
    for (const pluginName of config.scope) {
      try {
        const plugin = await import(`@scrawn/${pluginName}`);
        if (plugin.register) {
          plugin.register(this); // Plugin registers its event handlers
        }
      } catch (err) {
        console.warn(`Failed to load plugin @scrawn/${pluginName}:`, err);
      }
    }
  }

  /**
   * Register an authentication method with the SDK.
   * 
   * Auth methods handle credential management and can be shared across multiple event types.
   * 
   * @param name - Unique identifier for this auth method (e.g., 'api', 'oauth')
   * @param auth - Instance of an AuthBase implementation
   * 
   * @example
   * ```typescript
   * scrawn.registerAuthMethod('oauth', new OAuthAuth({ clientId: '...' }));
   * ```
   */
  registerAuthMethod(name: string, auth: AuthBase) {
    this.authMethods.set(name, auth);
  }

  /**
   * Register an event handler with the SDK.
   * 
   * Called internally by plugins during initialization.
   * Users typically don't need to call this directly.
   * 
   * @param name - Unique event name (e.g., 'sdk_call')
   * @param handler - Instance of a BaseEvent implementation
   * 
   * @internal
   */
  registerEvent(name: string, handler: BaseEvent) {
    this.eventRegistry.set(name, handler);
  }

  /**
   * Get credentials for a specific authentication method.
   * 
   * Credentials are cached after the first fetch for performance.
   * Subsequent calls return the cached value without re-fetching.
   * 
   * @param authMethodName - Name of the auth method to get credentials for
   * @returns A promise that resolves to the credentials object
   * @throws Error if the auth method is not registered
   * 
   * @example
   * ```typescript
   * const creds = await scrawn.getCredsFor('api');
   * // { apiKey: 'sk_test_...' }
   * ```
   */
  async getCredsFor(authMethodName: string): Promise<any> {
    // Check cache first
    if (this.credCache.has(authMethodName)) {
      return this.credCache.get(authMethodName);
    }

    // Get fresh creds from auth method
    const auth = this.authMethods.get(authMethodName);
    if (!auth) {
      throw new Error(`No auth method registered: ${authMethodName}`);
    }

    const creds = await auth.getCreds();
    this.credCache.set(authMethodName, creds);
    return creds;
  }

  /**
   * Internal method to consume and route an event.
   * 
   * This method:
   * 1. Validates the event source
   * 2. Looks up the appropriate handler
   * 3. Fetches/caches credentials
   * 4. Executes any pre-run hooks
   * 5. Processes the event
   * 
   * Called internally by event handlers. Users should call the event's `consume()` method instead.
   * 
   * @param eventObj - Event payload with EVENT_SOURCE symbol
   * @returns A promise that resolves when the event is processed
   * @throws Error if event source is invalid or handler not found
   * 
   * @internal
   */
  async consume(eventObj: eventPayload) {
    const source = eventObj[EVENT_SOURCE];
    if (!source) throw new Error('Invalid event: missing source symbol');

    const eventHandler = this.eventRegistry.get(source);
    if (!eventHandler) throw new Error(`Unknown event source: ${source}`);

    const authMethodName = eventHandler.authType;
    const auth = this.authMethods.get(authMethodName);
    if (!auth) throw new Error(`No auth registered for type ${authMethodName}`);

    // Run pre-hook if exists
    if (auth.preRun) await auth.preRun();
    
    // Get creds (from cache or fresh)
    const creds = await this.getCredsFor(authMethodName);
    
    // Ingest the event here
    console.log(`Ingesting event from source: ${source} with creds:`, creds);
  }
}
