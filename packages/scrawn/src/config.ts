/**
 * Central configuration for the Scrawn SDK.
 * All configuration values should be defined here for easy maintenance.
 */

export const ScrawnConfig = {
  /**
   * gRPC client configuration
   */
  grpc: {
    /**
     * HTTP version to use for gRPC transport.
     */
    httpVersion: '1.1' as const,

  },

  /**
   * Logging configuration
   */
  logging: {
    /**
     * Enable debug logs
     */
    enableDebug: false,
  },
} as const;

export type ScrawnConfig = typeof ScrawnConfig;
