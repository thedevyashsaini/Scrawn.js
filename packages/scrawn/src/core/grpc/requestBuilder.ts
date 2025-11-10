/**
 * Type-safe fluent API for building and executing gRPC requests.
 * 
 * This module provides a beautiful chain-able interface that ensures:
 * - Compile-time type safety for all operations
 * - Autocomplete for service methods and payload fields
 * - Runtime validation of request state
 * - Clean separation of concerns
 * 
 * @example
 * ```typescript
 * const response = await client
 *   .newCall(EventService, 'registerEvent')
 *   .addHeader('x-request-id', '123')
 *   .addPayload({
 *     type: EventType.SDK_CALL,
 *     userId: 'user_123',
 *     data: { case: 'sdkCall', value: { sdkCallType: SDKCallType.RAW, debitAmount: 10 } }
 *   })
 *   .request();
 * ```
 */

import type { Client, Transport } from '@connectrpc/connect';
import type { ServiceType } from '@bufbuild/protobuf';
import { createClient } from '@connectrpc/connect';
import { ScrawnLogger } from '../../utils/logger.js';
import type {
  ServiceMethodNames,
  MethodInput,
  MethodOutput,
  Headers,
  RequestState,
} from './types.js';

const log = new ScrawnLogger('RequestBuilder');

/**
 * Builder for constructing type-safe gRPC requests.
 * 
 * This class implements a fluent interface where each method returns `this`,
 * allowing for method chaining. Type parameters ensure that the payload type
 * matches the selected service method at compile time.
 * 
 * @template S - The gRPC service type
 * @template M - The method name on the service (string literal)
 */
export class RequestBuilder<
  S extends ServiceType,
  M extends ServiceMethodNames<S>
> {
  private readonly client: Client<S>;
  private readonly methodName: M;
  private readonly headers: Headers = {};
  private payload: any = null;
  private readonly state: RequestState = { hasPayload: false };

  /**
   * @internal
   * Constructs a new RequestBuilder. Use GrpcClient.newCall() instead.
   */
  constructor(
    transport: Transport,
    service: S,
    methodName: M
  ) {
    // Create a typed client for this service
    this.client = createClient(service, transport);
    this.methodName = methodName;
  }

  /**
   * Add a header to the request.
   * 
   * Headers are sent with the gRPC call and can be used for authentication,
   * tracing, or custom metadata. This method can be called multiple times
   * to add multiple headers.
   * 
   * @param key - Header name (e.g., 'authorization', 'x-request-id')
   * @param value - Header value
   * @returns The builder instance for chaining
   * 
   * @example
   * ```typescript
   * builder
   *   .addHeader('authorization', 'Bearer token123')
   *   .addHeader('x-request-id', 'abc-def-123')
   * ```
   */
  addHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  /**
   * Set the request payload.
   * 
   * The payload type is automatically inferred from the service method,
   * providing full autocomplete and type checking. This method can only
   * be called once per request to prevent accidental overwrites.
   * 
   * @param payload - The request payload (type-checked against the method's input type)
   * @returns The builder instance for chaining
   * @throws Error if payload has already been set
   * 
   * @example
   * ```typescript
   * builder.addPayload({
   *   type: EventType.SDK_CALL,
   *   userId: 'user_123',
   *   data: {
   *     case: 'sdkCall',
   *     value: {
   *       sdkCallType: SDKCallType.RAW,
   *       debitAmount: 10
   *     }
   *   }
   * })
   * ```
   */
  addPayload(payload: MethodInput<S, M> extends infer T ? Partial<T> : never): this {
    if (this.state.hasPayload) {
      throw new Error(
        'Payload has already been set. Cannot add payload multiple times. ' +
        'Create a new request builder if you need to make another call.'
      );
    }
    
    this.payload = payload;
    this.state.hasPayload = true;
    return this;
  }

  /**
   * Execute the gRPC request.
   * 
   * Validates that a payload has been set, then makes the actual gRPC call
   * using the configured service, method, headers, and payload. The response
   * type is automatically inferred from the service method.
   * 
   * @returns A promise that resolves to the typed response
   * @throws Error if no payload has been set
   * @throws Error if the gRPC call fails
   * 
   * @example
   * ```typescript
   * const response = await builder
   *   .addPayload({ userId: 'user_123', ... })
   *   .request();
   * 
   * // response is fully typed based on the method's output type
   * console.log(response.random);
   * ```
   */
  async request(): Promise<MethodOutput<S, M>> {
    if (!this.state.hasPayload || this.payload === null) {
      throw new Error(
        'Cannot make request without payload. Call addPayload() first.'
      );
    }

    try {
      log.info(`Making gRPC call to ${this.methodName}`);
      log.debug(`Headers: ${JSON.stringify(this.headers)}`);
      log.debug(`Payload: ${JSON.stringify(this.payload)}`);

      // The actual gRPC call - fully type-safe!
      const response = await (this.client[this.methodName] as any)(
        this.payload,
        { headers: this.headers }
      );

      log.info(`Successfully completed gRPC call to ${this.methodName}`);
      return response as MethodOutput<S, M>;
    } catch (error) {
      log.error(
        `gRPC call to ${this.methodName} failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }
}
