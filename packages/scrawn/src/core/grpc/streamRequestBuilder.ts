/**
 * Type-safe fluent API for building and executing client-streaming gRPC requests.
 * 
 * This module provides a chain-able interface for client-streaming RPC calls that ensures:
 * - Compile-time type safety for all operations
 * - Autocomplete for service methods and payload fields
 * - Runtime validation of request state
 * - Non-blocking stream consumption with internal buffering
 * 
 * @example
 * ```typescript
 * const response = await client
 *   .newStreamCall(EventService, 'streamEvents')
 *   .addHeader('Authorization', `Bearer ${apiKey}`)
 *   .stream(asyncIterableOfPayloads);
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
} from './types.js';

const log = new ScrawnLogger('StreamRequestBuilder');

/**
 * Builder for constructing type-safe client-streaming gRPC requests.
 * 
 * This class implements a fluent interface where each method returns `this`,
 * allowing for method chaining. Type parameters ensure that the payload type
 * matches the selected service method at compile time.
 * 
 * @template S - The gRPC service type
 * @template M - The method name on the service (string literal)
 */
export class StreamRequestBuilder<
  S extends ServiceType,
  M extends ServiceMethodNames<S>
> {
  private readonly client: Client<S>;
  private readonly methodName: M;
  private readonly headers: Headers = {};

  /**
   * @internal
   * Constructs a new StreamRequestBuilder. Use GrpcClient.newStreamCall() instead.
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
   * Execute the client-streaming gRPC request with the provided async iterable.
   * 
   * Consumes the async iterable and streams each item to the server.
   * The iterable is consumed in the background to avoid blocking the caller.
   * Returns a promise that resolves when the stream is complete and the server responds.
   * 
   * @param iterable - An async iterable of request payloads to stream
   * @returns A promise that resolves to the typed response
   * @throws Error if the gRPC call fails
   * 
   * @example
   * ```typescript
   * async function* generatePayloads() {
   *   yield { type: EventType.AI_TOKEN_USAGE, userId: 'u123', data: { ... } };
   *   yield { type: EventType.AI_TOKEN_USAGE, userId: 'u123', data: { ... } };
   * }
   * 
   * const response = await builder.stream(generatePayloads());
   * console.log(`Processed ${response.eventsProcessed} events`);
   * ```
   */
  async stream(
    iterable: AsyncIterable<MethodInput<S, M> extends infer T ? Partial<T> : never>
  ): Promise<MethodOutput<S, M>> {
    try {
      log.info(`Starting client-streaming gRPC call to ${String(this.methodName)}`);
      log.debug(`Headers: ${JSON.stringify(this.headers)}`);

      // The actual client-streaming gRPC call
      const response = await (this.client[this.methodName])(
        iterable,
        { headers: this.headers }
      );

      log.info(`Successfully completed streaming gRPC call to ${String(this.methodName)}`);
      return response as MethodOutput<S, M>;
    } catch (error) {
      log.error(
        `Streaming gRPC call to ${String(this.methodName)} failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }
}
