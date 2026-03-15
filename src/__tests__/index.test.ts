import { describe, expect, it } from 'vitest';
import { corsHeaders, getAllowedOrigin } from '../index';

function makeRequest(origin?: string): Request {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  return new Request('https://chat.milkmaccya.com/chat', { headers });
}

describe('getAllowedOrigin', () => {
  it('allows exact match for blog.milkmaccya.com', () => {
    expect(getAllowedOrigin(makeRequest('https://blog.milkmaccya.com'))).toBe(
      'https://blog.milkmaccya.com'
    );
  });

  it('allows PR preview origins', () => {
    expect(getAllowedOrigin(makeRequest('https://abc-mm2-blog.milkmaccya2.workers.dev'))).toBe(
      'https://abc-mm2-blog.milkmaccya2.workers.dev'
    );
    expect(getAllowedOrigin(makeRequest('https://pr-42-mm2-blog.milkmaccya2.workers.dev'))).toBe(
      'https://pr-42-mm2-blog.milkmaccya2.workers.dev'
    );
  });

  it('allows localhost with any port', () => {
    expect(getAllowedOrigin(makeRequest('http://localhost:3000'))).toBe('http://localhost:3000');
    expect(getAllowedOrigin(makeRequest('http://localhost:8787'))).toBe('http://localhost:8787');
  });

  it('rejects unknown origins', () => {
    expect(getAllowedOrigin(makeRequest('https://evil.com'))).toBeNull();
    expect(getAllowedOrigin(makeRequest('https://milkmaccya.com'))).toBeNull();
  });

  it('returns null when Origin header is missing', () => {
    expect(getAllowedOrigin(makeRequest())).toBeNull();
  });

  it('rejects http for non-localhost origins', () => {
    expect(getAllowedOrigin(makeRequest('http://blog.milkmaccya.com'))).toBeNull();
  });

  it('rejects origins that partially match the pattern', () => {
    // Should not match without the subdomain prefix
    expect(getAllowedOrigin(makeRequest('https://mm2-blog.milkmaccya2.workers.dev'))).toBeNull();
  });
});

describe('corsHeaders', () => {
  it('returns correct CORS headers', () => {
    const headers = corsHeaders('https://blog.milkmaccya.com');
    expect(headers).toEqual({
      'Access-Control-Allow-Origin': 'https://blog.milkmaccya.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
  });
});
