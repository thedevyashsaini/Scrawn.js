import { AuthBase } from './baseAuth.js';
import type { Scrawn } from '../scrawn.js';

/**
 * Simple API key authentication method.
 * 
 * Provides authentication using a static API key.
 * This is the default authentication method registered by the SDK.
 * 
 * @example
 * ```typescript
 * const auth = new ApiKeyAuth('sk_test_...');
 * scrawn.registerAuthMethod('api', auth);
 * ```
 */
export class ApiKeyAuth extends AuthBase {
  /** Authentication method identifier */
  name = 'api';
  
  /**
   * Creates a new API key authentication instance.
   * 
   * @param apiKey - Your Scrawn API key
   */
  constructor(private apiKey: string) { 
    super(); 
  }

  /**
   * Initialize the API key auth method.
   * No additional setup is required for API key authentication.
   * 
   * @param scrawn - The Scrawn SDK instance (optional, unused)
   */
  async init(scrawn?: Scrawn) {
    // nothing extra for now
    return;
  }

  /**
   * Get the API key credentials.
   * 
   * @returns A promise that resolves to an object containing the API key
   * 
   * @example
   * ```typescript
   * const creds = await auth.getCreds();
   * // { apiKey: 'sk_test_...' }
   * ```
   */
  async getCreds() {
    return { apiKey: this.apiKey };
  }
}
