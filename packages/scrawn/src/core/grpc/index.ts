/**
 * gRPC abstraction layer - Type-safe fluent API for gRPC calls.
 * 
 * This module provides a beautiful, type-safe interface for making gRPC calls
 * with automatic type inference, compile-time validation, and a fluent API.
 * 
 * @module grpc
 */

export { GrpcClient } from './client.js';
export { RequestBuilder } from './requestBuilder.js';
export type {
  ServiceMethodNames,
  MethodInput,
  MethodOutput,
  Headers,
  RequestState,
} from './types.js';
