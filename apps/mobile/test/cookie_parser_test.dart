import 'package:flutter_test/flutter_test.dart';

import 'package:sabquick_app/api_client.dart';

void main() {
  group('splitSetCookieHeader — real NextAuth shapes (regression)', () {
    // Captured verbatim from production (srv1985371.hstgr.cloud):
    // POST /api/auth/callback/credentials merges BOTH cookies into one
    // header, and the boundary comma sits right after "GMT" with the next
    // cookie's NAME directly following it (no leading attribute).
    const productionShape =
        '__Host-next-auth.csrf-token=abc123; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT, '
        '__Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..token-value; '
        'Path=/; Expires=Mon, 26 Oct 2026 15:26:26 GMT; HttpOnly; Secure; SameSite=Lax';

    test('extracts BOTH cookies from the production merged header', () {
      final parts = splitSetCookieHeader(productionShape);
      expect(parts.length, 2, reason: 'session cookie must not be swallowed');
      expect(parts[0], startsWith('__Host-next-auth.csrf-token=abc123'));
      expect(parts[0], contains('Expires=Wed, 21 Oct 2026 07:28:00 GMT'),
          reason: 'date must stay intact inside its own cookie');
      expect(parts[1], startsWith('__Secure-next-auth.session-token='));
    });

    test('never splits inside HTTP-date commas', () {
      final parts = splitSetCookieHeader(productionShape);
      final csrf = parts[0];
      expect(csrf, contains('Expires=Wed, 21 Oct 2026 07:28:00 GMT'));
      expect(csrf, isNot(contains('__Secure')));
    });

    test('plain http dev shape (no Secure prefixes) also splits', () {
      const devShape =
          'csrf-token=devcsrf; Path=/; Expires=Thu, 01 Jan 2026 00:00:00 GMT, '
          'next-auth.session-token=devsession; Path=/; HttpOnly';
      final parts = splitSetCookieHeader(devShape);
      expect(parts.length, 2);
      expect(parts[1], startsWith('next-auth.session-token=devsession'));
    });

    test('single cookie passes through untouched', () {
      const single =
          '__Secure-next-auth.session-token=only-one; Path=/; HttpOnly; Secure';
      expect(splitSetCookieHeader(single), [single]);
    });

    test('attribute-style boundary (Path=/; name=) still splits', () {
      const attrShape =
          'first=1; Path=/, Path=/; second=2; HttpOnly';
      // Path=/ then "Path=/; second=2" — the comma precedes an attribute run
      // followed by name=. Tolerated even though NextAuth does not emit it.
      final parts = splitSetCookieHeader(attrShape);
      expect(parts.join('|'), contains('second=2'));
    });

    test('Max-Age date commas are respected too', () {
      const maxAgeShape =
          'a=1; Max-Age=3600, b=2; Path=/';
      final parts = splitSetCookieHeader(maxAgeShape);
      expect(parts.length, 2);
      expect(parts[0], 'a=1; Max-Age=3600');
      expect(parts[1], 'b=2; Path=/');
    });
  });
}
