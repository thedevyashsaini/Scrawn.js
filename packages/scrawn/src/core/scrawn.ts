import type { AuthBase } from './auth/baseAuth.js';
import type { 
  EventPayload, 
  MiddlewareRequest, 
  MiddlewareResponse, 
  MiddlewareNext,
  MiddlewareEventConfig 
} from './types/event.js';
import type { AuthRegistry, AuthMethodName, AllCredentials } from './types/auth.js';
import { ApiKeyAuth } from './auth/apiKeyAuth.js';
import { ScrawnLogger } from '../utils/logger.js';
import { matchPath } from '../utils/pathMatcher.js';
import { EventPayloadSchema } from './types/event.js';
import { GrpcClient } from './grpc/index.js';
import { EventService } from '../gen/event/v1/event_connect.js';
import { EventType, SDKCallType, SDKCall } from '../gen/event/v1/event_pb.js';
import { PaymentService } from '../gen/payment/v1/payment_connect.js';
import { 
  ScrawnConfigError, 
  ScrawnValidationError,
  convertGrpcError 
} from './errors/index.js';

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

  /** gRPC client for making type-safe API calls */
  private grpcClient: GrpcClient;

  /**
   * Creates a new Scrawn SDK instance.
   * 
   * @param config - Configuration object
   * @param config.apiKey - Your Scrawn API key for authentication
   * @param config.baseURL - Base URL for the Scrawn API (e.g., 'https://api.scrawn.dev')
   * 
   * @example
   * ```typescript
   * const scrawn = new Scrawn({ 
   *   apiKey: 'sk_test_...',
   *   baseURL: 'https://api.scrawn.dev'
   * });
   * await scrawn.init();
   * ```
   */
  constructor(config: { apiKey: AllCredentials['apiKey']; baseURL: string }) {
    try {
      // Validate configuration
      if (!config.apiKey || typeof config.apiKey !== 'string') {
        throw new ScrawnConfigError('API key is required and must be a string', {
          details: { provided: typeof config.apiKey }
        });
      }
      
      if (!config.baseURL || typeof config.baseURL !== 'string') {
        throw new ScrawnConfigError('baseURL is required and must be a string', {
          details: { provided: typeof config.baseURL }
        });
      }

      this.apiKey = config.apiKey;
      this.grpcClient = new GrpcClient(config.baseURL);
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
  private registerAuthMethod<K extends AuthMethodName>(
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
  private async getCredsFor<K extends AuthMethodName>(
    authMethodName: K
  ): Promise<AuthRegistry[K]> {
    // Check cache first
    if (this.credCache.has(authMethodName)) {
      return this.credCache.get(authMethodName)! as AuthRegistry[K];
    }

    // Get fresh creds from auth method
    const auth = this.authMethods.get(authMethodName);
    if (!auth) {
      throw new ScrawnConfigError(`No auth method registered: ${authMethodName}`, {
        details: { requestedMethod: authMethodName }
      });
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
   * @throws Error if payload validation fails
   * 
   * @example
   * ```typescript
   * await scrawn.sdkCallEventConsumer({
   *   userId: 'user_abc123',
   *   debitAmount: 10
   * });
   * ```
   */
  async sdkCallEventConsumer(payload: EventPayload): Promise<void> {
    const validationResult = EventPayloadSchema.safeParse(payload);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      log.error(`Invalid payload for sdkCallEventConsumer: ${errors}`);
      throw new ScrawnValidationError('Payload validation failed', {
        details: {
          errors: validationResult.error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }
    
    return this.consumeEvent(validationResult.data, 'api', 'SDK_CALL');
  }

  /**
   * Create an Express-compatible middleware for tracking API endpoint usage.
   * 
   * This middleware automatically tracks requests to your API endpoints for billing purposes.
   * You provide an extractor function that determines the userId and debitAmount from each request.
   * Optionally, you can provide a whitelist array to only track specific endpoints,
   * or a blacklist array to exclude specific endpoints from tracking.
   * 
   * The middleware is framework-agnostic and works with Express, Fastify, and similar frameworks.
   * 
   * @param config - Configuration object for the middleware
   * @param config.extractor - Function that extracts userId and debitAmount from the request. Return null to skip tracking.
   * @param config.whitelist - Optional array of endpoint patterns to track. Supports wildcards:
   *                            - Exact match: /api/users
   *                            - Single segment (*): /api/* matches /api/users but not /api/users/123
   *                            - Multi-segment (**): /api/** matches any path starting with /api/
   *                            - Mixed: /api/star/profile, **.php
   *                            Takes precedence over blacklist. If omitted, all requests will be tracked.
   * @param config.blacklist - Optional array of endpoint patterns to exclude. Same wildcard support as whitelist.
   *                            Only applies to endpoints not in the whitelist.
   * 
   * @returns Express-compatible middleware function
   * 
   * @example
   * ```typescript
   * // Track all endpoints
   * app.use(scrawn.middlewareEventConsumer({
   *   extractor: (req) => ({
   *     userId: req.user.id,
   *     debitAmount: 1
   *   })
   * }));
   * 
   * // Track only specific endpoints with wildcards
   * app.use(scrawn.middlewareEventConsumer({
   *   extractor: (req) => ({
   *     userId: req.headers['x-user-id'] as string,
   *     debitAmount: req.body.tokens || 1
   *   }),
   *   whitelist: ['/api/generate', '/api/analyze', '/api/v1/*']
   * }));
   * 
   * // Exclude specific endpoints from tracking
   * app.use(scrawn.middlewareEventConsumer({
   *   extractor: (req) => ({
   *     userId: req.user.id,
   *     debitAmount: 1
   *   }),
   *   blacklist: ['/health', '/api/collect-payment', '/internal/**', '**.tmp']
   * }));
   * ```
   */
  middlewareEventConsumer(config: MiddlewareEventConfig) {
    return async (req: MiddlewareRequest, res: MiddlewareResponse, next: MiddlewareNext) => {
      try {
        const requestPath = req.path || req.url || '';
        
        // Check whitelist first (takes precedence)
        if (config.whitelist && config.whitelist.length > 0) {
          const isWhitelisted = config.whitelist.some(pattern => matchPath(requestPath, pattern));
          
          if (!isWhitelisted) {
            return next();
          }
        }
        
        // Then check blacklist
        if (config.blacklist && config.blacklist.length > 0) {
          const isBlacklisted = config.blacklist.some(pattern => matchPath(requestPath, pattern));
          
          if (isBlacklisted) {
            return next();
          }
        }

        const extractedPayload = await config.extractor(req);
        
        // If extractor returns null, skip tracking
        if (extractedPayload === null) {
          log.warn(`Extractor returned null for path: ${requestPath}. Skipping event tracking.`);
          return next();
        }
        
        const validationResult = EventPayloadSchema.safeParse(extractedPayload);
        if (!validationResult.success) {
          const errors = validationResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          log.error(`Invalid payload extracted in middlewareEventConsumer: ${errors}`); // TODO: for error shit implement the callback shit
          return next();
        }

        this.consumeEvent(validationResult.data, 'api', 'MIDDLEWARE_CALL') 
          .catch(error => {
            log.error(`Failed to track middleware event: ${error.message}`);
          }); // TODO: for error shit implement the callback shit

        next();
      } catch (error) {
        log.error(`Error in middlewareEventConsumer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        next();
      } // TODO: for error shit implement the callback shit
    };
  }

  /**
   * Collect payment by creating a checkout link for a user.
   * 
   * Generates a payment checkout link for the specified user via the Scrawn payment service.
   * The checkout link can be used to direct users to complete their payment.
   * 
   * @param userId - Unique identifier of the user to collect payment from
   * @returns A promise that resolves to the checkout link URL
   * @throws Error if the gRPC call fails or if authentication is invalid
   * 
   * @example
   * ```typescript
   * const checkoutLink = await scrawn.collectPayment('user_abc123');
   * // Returns: 'https://checkout.scrawn.dev/...'
   * // Redirect user to this URL to complete payment
   * ```
   */
  async collectPayment(userId: string): Promise<string> {
    // Validate input
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      log.error('Invalid userId provided to collectPayment');
      throw new ScrawnValidationError('userId must be a non-empty string', {
        details: { provided: typeof userId }
      });
    }

    // Get credentials for authentication
    const creds = await this.getCredsFor('api');

    try {
      log.info(`Creating checkout link for user: ${userId}`);
      
      const response = await this.grpcClient
        .newCall(PaymentService, 'createCheckoutLink')
        .addHeader('Authorization', `Bearer ${creds.apiKey}`)
        .addPayload({ userId })
        .request();

      log.info(`Checkout link created successfully: ${response.checkoutLink}`);
      return response.checkoutLink;
    } catch (error) {
      log.error(`Failed to create checkout link: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw convertGrpcError(error);
    }
  }

  

  /**
   * Internal method to consume and process an event.
   * 
   * This method:
   * 1. Validates authentication
   * 2. Fetches/caches credentials
   * 3. Executes any pre-run hooks
   * 4. Processes the event via gRPC call to RegisterEvent
   * 
   * @param payload - Event payload data
   * @param authMethodName - Name of the auth method to use (must be in AuthRegistry)
   * @param eventType - Type of event for categorization (RAW or MIDDLEWARE_CALL)
   * @returns A promise that resolves when the event is processed
   * @throws Error if auth method is not registered or gRPC call fails
   * 
   * @internal
   */
  private async consumeEvent<K extends AuthMethodName>(
    payload: EventPayload,
    authMethodName: K,
    eventType: 'SDK_CALL' | 'MIDDLEWARE_CALL'
  ): Promise<void> {
    const auth = this.authMethods.get(authMethodName);
    if (!auth) {
      throw new ScrawnConfigError(`No auth registered for type ${authMethodName}`, {
        details: { requestedAuth: authMethodName }
      });
    }

    // Run pre-hook if exists
    if (auth.preRun) await auth.preRun();
    
    // Get creds (from cache or fresh)
    const creds = await this.getCredsFor(authMethodName);
    
    // Map event type to SDKCallType
    const sdkCallType = eventType === 'SDK_CALL' 
      ? SDKCallType.RAW 
      : SDKCallType.MIDDLEWARE_CALL;

    try {
      log.info(`Ingesting event (type: ${eventType}) with creds: ${JSON.stringify(creds)}, payload: ${JSON.stringify(payload)}`);
      
      const response = await this.grpcClient
        .newCall(EventService, 'registerEvent')
        .addHeader('Authorization', `Bearer ${creds.apiKey}`)
        .addPayload({
          type: EventType.SDK_CALL,
          userId: payload.userId,
          data: {
            case: 'sdkCall',
            value: new SDKCall({
              sdkCallType: sdkCallType,
              debitAmount: payload.debitAmount,
            }),
          },
        })
        .request();

      log.info(`Event registered successfully: ${JSON.stringify(response)}`);
    } catch (error) {
      log.error(`Failed to register event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw convertGrpcError(error);
    }

    if (auth.postRun) await auth.postRun();
  }
}
