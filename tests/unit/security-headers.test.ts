import { describe, expect, it } from 'vitest';
import { addSecurityHeaders, SECURITY_HEADERS, handleCors } from '@/src/lib/middleware/security-headers';
import { NextResponse } from 'next/server';

describe('Security Headers', () => {
  describe('SECURITY_HEADERS configuration', () => {
    it('should include Strict-Transport-Security header', () => {
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toBeDefined();
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('includeSubDomains');
    });

    it('should include Content-Security-Policy header', () => {
      expect(SECURITY_HEADERS['Content-Security-Policy']).toBeDefined();
      expect(SECURITY_HEADERS['Content-Security-Policy']).toContain('default-src');
      expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("'self'");
    });

    it('should include X-Content-Type-Options header', () => {
      expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should include X-Frame-Options header', () => {
      expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    });

    it('should include X-XSS-Protection header', () => {
      expect(SECURITY_HEADERS['X-XSS-Protection']).toBe('1; mode=block');
    });

    it('should include Referrer-Policy header', () => {
      expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should include Permissions-Policy header', () => {
      expect(SECURITY_HEADERS['Permissions-Policy']).toBeDefined();
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain('camera=()');
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain('microphone=()');
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain('geolocation=()');
    });

    it('should remove X-Powered-By header', () => {
      expect(SECURITY_HEADERS['X-Powered-By']).toBeUndefined();
    });
  });

  describe('addSecurityHeaders', () => {
    it('should add all security headers to response', () => {
      const response = new NextResponse('test');
      const result = addSecurityHeaders(response);

      expect(result.headers.get('Strict-Transport-Security')).toBeDefined();
      expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(result.headers.get('X-Frame-Options')).toBe('DENY');
      expect(result.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should not remove undefined headers', () => {
      const response = new NextResponse('test');
      const result = addSecurityHeaders(response);

      // Should not have undefined headers
      const headerEntries = Array.from(result.headers.entries());
      const hasUndefined = headerEntries.some(([, value]) => value === 'undefined');
      expect(hasUndefined).toBe(false);
    });
  });

  describe('CORS handling', () => {
    describe('handleCors for OPTIONS requests', () => {
      it('should allow preflight requests from allowed origins', () => {
        const origin = process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:3000';
        const cors = handleCors(origin, 'OPTIONS');

        expect(cors.shouldAllowRequest).toBe(true);
        expect(cors.headers['Access-Control-Allow-Origin']).toBe(origin);
        expect(cors.headers['Access-Control-Allow-Methods']).toBeDefined();
        expect(cors.headers['Access-Control-Allow-Headers']).toBeDefined();
      });

      it('should include allow methods in preflight response', () => {
        const origin = 'http://localhost:3000';
        const cors = handleCors(origin, 'OPTIONS');

        expect(cors.headers['Access-Control-Allow-Methods']).toContain('GET');
        expect(cors.headers['Access-Control-Allow-Methods']).toContain('POST');
        expect(cors.headers['Access-Control-Allow-Methods']).toContain('DELETE');
      });

      it('should include allow headers in preflight response', () => {
        const origin = 'http://localhost:3000';
        const cors = handleCors(origin, 'OPTIONS');

        expect(cors.headers['Access-Control-Allow-Headers']).toContain('Content-Type');
        expect(cors.headers['Access-Control-Allow-Headers']).toContain('Authorization');
      });

      it('should set max-age for preflight cache', () => {
        const origin = 'http://localhost:3000';
        const cors = handleCors(origin, 'OPTIONS');

        expect(cors.headers['Access-Control-Max-Age']).toBe('86400');
      });
    });

    describe('handleCors for GET requests', () => {
      it('should allow GET from allowed origins', () => {
        const origin = 'http://localhost:3000';
        const cors = handleCors(origin, 'GET');

        expect(cors.shouldAllowRequest).toBe(true);
        expect(cors.headers['Access-Control-Allow-Origin']).toBe(origin);
      });

      it('should not include max-age for actual requests', () => {
        const origin = 'http://localhost:3000';
        const cors = handleCors(origin, 'GET');

        expect(cors.headers['Access-Control-Max-Age']).toBeUndefined();
      });
    });

    describe('Origin validation', () => {
      it('should allow requests with no origin', () => {
        const cors = handleCors(undefined, 'GET');
        expect(cors.shouldAllowRequest).toBe(true);
      });

      it('should deny requests from disallowed origins', () => {
        const cors = handleCors('http://evil.com', 'GET');
        // By default, only localhost:3000 and values from env are allowed
        // This should be denied if http://evil.com is not in ALLOWED_ORIGINS
        if (!process.env.ALLOWED_ORIGINS?.includes('http://evil.com')) {
          expect(cors.shouldAllowRequest).toBe(false);
        }
      });
    });

    describe('Credentials header', () => {
      it('should include credentials header', () => {
        const origin = 'http://localhost:3000';
        const cors = handleCors(origin, 'GET');

        expect(cors.headers['Access-Control-Allow-Credentials']).toBe('true');
      });
    });
  });

  describe('CSP policy', () => {
    it('should restrict script sources', () => {
      const csp = SECURITY_HEADERS['Content-Security-Policy'];
      expect(csp).toContain('script-src');
    });

    it('should restrict style sources', () => {
      const csp = SECURITY_HEADERS['Content-Security-Policy'];
      expect(csp).toContain("style-src 'self'");
    });

    it('should prevent framing', () => {
      const csp = SECURITY_HEADERS['Content-Security-Policy'];
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe('Header security', () => {
    it('should prevent MIME type sniffing', () => {
      const response = new NextResponse('test');
      const result = addSecurityHeaders(response);

      expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should prevent clickjacking', () => {
      const response = new NextResponse('test');
      const result = addSecurityHeaders(response);

      expect(result.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should protect against XSS', () => {
      const response = new NextResponse('test');
      const result = addSecurityHeaders(response);

      expect(result.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });
  });
});
