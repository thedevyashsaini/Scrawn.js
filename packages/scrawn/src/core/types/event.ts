import { z } from 'zod';

/**
 * Zod schema for event payload validation.
 * 
 * Used by all event consumer methods to ensure consistent validation.
 * 
 * Validates:
 * - userId: non-empty string
 * - debitAmount: positive number
 */
export const EventPayloadSchema = z.object({
    userId: z.string().min(1, 'userId must be a non-empty string'),
    debitAmount: z.number().positive('debitAmount must be a positive number'),
});

/**
 * Payload structure for event tracking.
 * 
 * Used by both sdkCallEventConsumer and middlewareEventConsumer.
 * 
 * @property userId - The user ID associated with this event
 * @property debitAmount - Amount to debit for billing tracking
 * 
 * @example
 * ```typescript
 * const payload: EventPayload = {
 *   userId: 'u123',
 *   debitAmount: 5
 * };
 * ```
 */
export type EventPayload = z.infer<typeof EventPayloadSchema>;

/**
 * Generic request object type for middleware compatibility.
 * Supports Express, Fastify, and other Node.js frameworks.
 */
export interface MiddlewareRequest {
    /** HTTP method (GET, POST, etc.) */
    method?: string;
    /** Request URL path */
    url?: string;
    /** Request path (alternative to url) */
    path?: string;
    /** Request body */
    body?: any;
    /** Request headers */
    headers?: Record<string, string | string[] | undefined>;
    /** Request query parameters */
    query?: Record<string, any>;
    /** Request params (route parameters) */
    params?: Record<string, any>;
    /** Any additional custom properties */
    [key: string]: any;
}

/**
 * Generic response object type for middleware compatibility.
 */
export interface MiddlewareResponse {
    /** Status code setter */
    status?: (code: number) => MiddlewareResponse;
    /** JSON response sender */
    json?: (data: any) => void;
    /** Send response */
    send?: (data: any) => void;
    /** Any additional custom properties */
    [key: string]: any;
}

/**
 * Generic next function type for middleware compatibility.
 */
export type MiddlewareNext = (error?: any) => void;

/**
 * Extractor function that derives userId and debitAmount from a request.
 * 
 * @param req - The incoming request object
 * @returns An object containing userId and debitAmount, or a Promise resolving to it
 * 
 * @example
 * ```typescript
 * const extractor: PayloadExtractor = (req) => ({
 *   userId: req.headers['x-user-id'] as string,
 *   debitAmount: 1
 * });
 * ```
 */
export type PayloadExtractor = (
    req: MiddlewareRequest
) => EventPayload | Promise<EventPayload>;

/**
 * Configuration options for the Express middleware event consumer.
 * 
 * @property extractor - Function to extract userId and debitAmount from request
 * @property whitelist - Optional array of endpoint paths to track (if provided, only these endpoints will be tracked)
 * 
 * @example
 * ```typescript
 * const config: MiddlewareEventConfig = {
 *   extractor: (req) => ({
 *     userId: req.user?.id,
 *     debitAmount: calculateCost(req)
 *   }),
 *   whitelist: ['/api/expensive-operation', '/api/premium-feature']
 * };
 * ```
 */
export interface MiddlewareEventConfig {
    /** Function to extract event payload from request */
    extractor: PayloadExtractor;
    /** Optional list of endpoint paths to track. If undefined, tracks all endpoints */
    whitelist?: string[];
}
