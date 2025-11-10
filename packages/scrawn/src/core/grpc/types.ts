/**
 * Core type system for the gRPC client abstraction layer.
 * 
 * This module provides compile-time type safety for all gRPC operations,
 * ensuring that payloads, headers, and responses are correctly typed based
 * on the service and method being called.
 */

import type { ServiceType } from '@bufbuild/protobuf';
import type { MessageType } from '@bufbuild/protobuf';

/**
 * Extract all method names from a service as a union of string literals.
 * This provides autocomplete and compile-time validation of method names.
 */
export type ServiceMethodNames<S extends ServiceType> = keyof S['methods'] & string;

/**
 * Get the input MessageType (constructor) for a specific method on a service.
 */
export type MethodInputType<
  S extends ServiceType,
  M extends ServiceMethodNames<S>
> = S['methods'][M] extends { I: infer I } ? I : never;

/**
 * Get the output MessageType (constructor) for a specific method on a service.
 */
export type MethodOutputType<
  S extends ServiceType,
  M extends ServiceMethodNames<S>
> = S['methods'][M] extends { O: infer O } ? O : never;

/**
 * Convert a MessageType to its Message instance type.
 * This extracts the actual Message type from a MessageType constructor.
 */
export type MessageTypeToMessage<T> = T extends MessageType<infer M> ? M : never;

/**
 * Get the input Message type for a specific method on a service.
 * This is what you'll use for the payload type.
 */
export type MethodInput<
  S extends ServiceType,
  M extends ServiceMethodNames<S>
> = MessageTypeToMessage<MethodInputType<S, M>>;

/**
 * Get the output Message type for a specific method on a service.
 * This is what you'll get back from the request.
 */
export type MethodOutput<
  S extends ServiceType,
  M extends ServiceMethodNames<S>
> = MessageTypeToMessage<MethodOutputType<S, M>>;

/**
 * HTTP headers as key-value pairs.
 */
export interface Headers {
  [key: string]: string;
}

/**
 * State tracking for the request builder to prevent duplicate operations.
 */
export interface RequestState {
  hasPayload: boolean;
}
