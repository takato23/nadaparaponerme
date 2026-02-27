import {
  assert,
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { assertAllowedOrigin, isAllowedHost, isForbiddenHost } from './security.ts';

Deno.test('isForbiddenHost blocks local and private targets', () => {
  assertEquals(isForbiddenHost('localhost'), true);
  assertEquals(isForbiddenHost('127.0.0.1'), true);
  assertEquals(isForbiddenHost('10.0.0.5'), true);
  assertEquals(isForbiddenHost('192.168.1.1'), true);
  assertEquals(isForbiddenHost('::1'), true);
  assertEquals(isForbiddenHost('fc00::1'), true);
});

Deno.test('isForbiddenHost allows public domains', () => {
  assertEquals(isForbiddenHost('cdn.shopify.com'), false);
  assertEquals(isForbiddenHost('images.asos-media.com'), false);
});

Deno.test('isAllowedHost supports exact and subdomain matches', () => {
  const allowed = new Set(['cdn.shopify.com', 'images.asos-media.com']);
  assertEquals(isAllowedHost('cdn.shopify.com', allowed), true);
  assertEquals(isAllowedHost('assets.cdn.shopify.com', allowed), true);
  assertEquals(isAllowedHost('evilshopify.com', allowed), false);
});

Deno.test('assertAllowedOrigin enforces configured origins', () => {
  const original = Deno.env.get('ALLOWED_WEB_ORIGINS');
  try {
    Deno.env.set('ALLOWED_WEB_ORIGINS', 'https://app.example.com,http://localhost:3000');

    const allowedReq = new Request('https://edge.example.com', {
      headers: { Origin: 'http://localhost:3000' },
    });
    const blockedReq = new Request('https://edge.example.com', {
      headers: { Origin: 'https://evil.com' },
    });

    assert(assertAllowedOrigin(allowedReq).allowed);
    assertEquals(assertAllowedOrigin(blockedReq).allowed, false);
  } finally {
    if (typeof original === 'string') {
      Deno.env.set('ALLOWED_WEB_ORIGINS', original);
    } else {
      Deno.env.delete('ALLOWED_WEB_ORIGINS');
    }
  }
});
