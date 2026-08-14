/**
 * API key management.
 *
 * The key is stored once at createClient() time and never passed into
 * individual API functions as a plain string. All API functions receive
 * pre-built HTTP headers from getHeaders(). This prevents accidental
 * key leakage into logging, caching, or business logic layers.
 */
export interface Auth {
  getHeaders(): Record<string, string>;
}

export function createAuth(apiKey: string): Auth {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('Pexels API key is required. Pass it to createClient({ apiKey: "..." }).');
  }

  const headers: Record<string, string> = {
    Authorization: apiKey,
    'Content-Type': 'application/json',
  };

  // Freeze the headers object — nobody should mutate it after creation
  Object.freeze(headers);

  return {
    getHeaders(): Record<string, string> {
      return headers;
    },
  };
}
