import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';

/// Splits a merged `Set-Cookie` header value (as returned by the `http`
/// package when the server sends multiple cookies) into individual cookie
/// strings WITHOUT being fooled by commas inside HTTP dates.
///
/// NextAuth sends its cookies comma-joined:
/// ```
/// __Host-next-auth.csrf-token=abc; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT, __Secure-next-auth.session-token=eyJ..; Path=/; HttpOnly; Secure
/// ```
/// NOTE the boundary: the next cookie's NAME comes directly after the comma
/// ("GMT, __Secure-..."), with NO leading attribute. A comma therefore starts
/// a new cookie exactly when the text after it (ignoring whitespace) matches
/// `token=` — a run of cookie-name characters immediately followed by '='.
/// Date commas never match ("Wed, 21 Oct..." / "Thu, 01 Jan..." have a space
/// after the day, never '='), and quoted values are protected too.
List<String> splitSetCookieHeader(String header) {
  final result = <String>[];
  int cookieStart = 0;

  // A name token: cookie-name chars only (no space/comma/semicolon/equals)
  // immediately followed by '='. "__Secure-next-auth.session-token" matches;
  // "21" in "Wed, 21 Oct" does not (next char is a space, not '=').
  final nameEq = RegExp(r'^[^,;=\s]+=');

  bool commaStartsNewCookie(int pos) {
    int i = pos + 1;
    while (i < header.length && (header[i] == ' ' || header[i] == '\t')) {
      i++;
    }
    if (i >= header.length) return false;
    return nameEq.hasMatch(header.substring(i));
  }

  for (int i = 0; i < header.length; i++) {
    if (header.codeUnitAt(i) == 0x2C /* , */ && commaStartsNewCookie(i)) {
      result.add(header.substring(cookieStart, i).trim());
      cookieStart = i + 1;
    }
  }
  result.add(header.substring(cookieStart).trim());
  return result;
}

/// API client for the SabQuick Next.js backend.
///
/// Authentication mirrors the web exactly: NextAuth v4 credentials flow over
/// `POST /api/auth/callback/credentials`. That endpoint answers HTTP 302 and
/// the `http` package transparently follows the redirect, so we re-send the
/// request manually (redirects disabled) to capture the `Set-Cookie` headers
/// from every hop. The session cookie(s) are persisted and resent on every
/// request — no backend changes required.
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  static const _cookieKey = 'sq_session_cookie';
  static const _userKey = 'sq_session_user';

  final http.Client _http = http.Client();

  String? _sessionCookie;
  Map<String, dynamic>? _user;
  bool _loaded = false;

  Map<String, dynamic>? get user => _user;
  bool get isLoggedIn => _sessionCookie != null && _user != null;

  Future<void> loadSession() async {
    if (_loaded) return;
    final prefs = await SharedPreferences.getInstance();
    _sessionCookie = prefs.getString(_cookieKey);
    final rawUser = prefs.getString(_userKey);
    if (rawUser != null) {
      try {
        _user = jsonDecode(rawUser) as Map<String, dynamic>;
      } catch (_) {
        _user = null;
      }
    }
    _loaded = true;
  }

  Future<void> _persistSession() async {
    final prefs = await SharedPreferences.getInstance();
    if (_sessionCookie != null) {
      await prefs.setString(_cookieKey, _sessionCookie!);
    } else {
      await prefs.remove(_cookieKey);
    }
    if (_user != null) {
      await prefs.setString(_userKey, jsonEncode(_user));
    } else {
      await prefs.remove(_userKey);
    }
  }

  Map<String, String> _headers({Map<String, String>? extra}) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...?extra,
    };
    if (_sessionCookie != null) {
      headers['Cookie'] = _sessionCookie!;
    }
    return headers;
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    return Uri.parse('${AppConfig.baseUrl}$path').replace(
      queryParameters: query,
    );
  }

  /// Extracts every cookie pair from a response's (possibly merged)
  /// Set-Cookie header, safe against HTTP-date commas.
  String? _extractSessionCookie(http.Response response) {
    final setCookie = response.headers['set-cookie'];
    if (setCookie == null || setCookie.isEmpty) return null;
    final pairs = <String>[];
    for (final cookie in splitSetCookieHeader(setCookie)) {
      final pair = cookie.split(';').first.trim();
      if (pair.isNotEmpty && pair.contains('=')) pairs.add(pair);
    }
    return pairs.isEmpty ? null : pairs.join('; ');
  }

  // ------------------------------------------------------------------
  // AUTH
  // ------------------------------------------------------------------

  /// Step 1: ask the backend to send an OTP to [phone].
  /// Returns the response map (`requirePin` / `isOwner` flags matter).
  Future<Map<String, dynamic>> sendOtp(String phone) async {
    final res = await _http.post(
      _uri('/api/auth/otp/send'),
      headers: _headers(),
      body: jsonEncode({'phone': phone}),
    );
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw ApiException(body['error'] ?? 'Failed to send OTP');
    }
    return body;
  }

  /// Step 2a: customer login/registration via OTP.
  Future<Map<String, dynamic>> loginWithOtp({
    required String phone,
    required String otp,
    String? name,
  }) async {
    return _credentialsLogin(phone: phone, fields: {
      'otp': otp,
      if (name != null && name.isNotEmpty) 'name': name,
    });
  }

  /// Step 2b: owner / staff login via passcode or PIN.
  /// IMPORTANT: the backend authorize() checks the `pin` field FIRST —
  /// sending a passcode in the `otp` field breaks owner/staff login.
  Future<Map<String, dynamic>> loginWithPin({
    required String phone,
    required String pin,
  }) async {
    return _credentialsLogin(phone: phone, fields: {'pin': pin});
  }

  Future<Map<String, dynamic>> _credentialsLogin({
    required String phone,
    required Map<String, String> fields,
  }) async {
    return _nextAuthFormLogin({
      'phone': phone,
      ...fields,
    }, 'Login failed. Please try again.');
  }

  /// Shared NextAuth form exchange used by PIN / OTP / Google-token logins.
  ///
  /// NextAuth answers with HTTP 302 and puts the session cookie on that
  /// redirect response. The `http` package follows redirects transparently
  /// and DROPS those headers, so we send with redirects disabled, capture
  /// every Set-Cookie ourselves, and follow the chain manually.
  Future<Map<String, dynamic>> _nextAuthFormLogin(
    Map<String, String> fields,
    String failureMessage,
  ) async {
    final csrf = await _getCsrfToken();
    final form = {
      ...fields,
      'csrfToken': csrf,
      'json': 'true',
    };

    var res = await _sendNoRedirect('POST', _uri('/api/auth/callback/credentials'), form);
    String? captured = _extractSessionCookie(res);

    // Follow the redirect chain manually, collecting cookies at every hop.
    int hops = 0;
    while (res.statusCode >= 300 && res.statusCode < 400 && hops < 5) {
      final location = res.headers['location'];
      if (location == null) break;
      res = await _sendNoRedirect('GET', _resolveRedirect(location), null);
      final hopCookies = _extractSessionCookie(res);
      if (hopCookies != null) {
        captured = _mergeCookies(captured, hopCookies);
      }
      hops++;
    }

    if (res.statusCode >= 400 || captured == null) {
      throw ApiException(_extractAuthError(res, fallback: failureMessage));
    }

    _sessionCookie = captured;
    await _fetchAndStoreSessionUser();
    return _user ?? {};
  }

  /// One HTTP exchange with redirects disabled so Set-Cookie stays readable.
  Future<http.Response> _sendNoRedirect(
    String method,
    Uri url,
    Map<String, String>? form,
  ) async {
    final request = http.Request(method, url)
      ..followRedirects = false
      ..maxRedirects = 0
      ..headers['Accept'] = 'application/json';
    if (form != null) {
      request.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      request.bodyFields = form;
    }
    if (_sessionCookie != null) {
      request.headers['Cookie'] = _sessionCookie!;
    }
    final streamed = await _http.send(request);
    return http.Response.fromStream(streamed);
  }

  /// NextAuth reports credential failures as HTTP 401 with the body
  /// `{"url":".../api/auth/error?error=<urlencoded message>"}` — there is no
  /// `error` FIELD in the JSON. Parse every shape so the user sees the real
  /// server reason (expired code, wrong PIN, cooldown lock) instead of a
  /// generic "Login failed. Please try again."
  String _extractAuthError(http.Response res, {required String fallback}) {
    // Shape 1: query param — ?error=Invalid%20or%20expired%20OTP...
    final urlMatch = RegExp(r'[?&]error=([^"&\\s]+)').firstMatch(res.body);
    if (urlMatch != null) {
      final decoded = Uri.decodeComponent(urlMatch.group(1)!);
      if (decoded.trim().isNotEmpty) return decoded;
    }
    // Shape 2: plain JSON {"error": "..."}
    try {
      final body = jsonDecode(res.body);
      if (body is Map && body['error'] is String) return body['error'] as String;
    } catch (_) {}
    // Shape 3: {"url": "...error=..."} already covered above; else fallback.
    return fallback;
  }

  Uri _resolveRedirect(String location) {
    final uri = Uri.parse(location);
    if (uri.hasScheme && uri.host.isNotEmpty) return uri;
    final base = AppConfig.baseUrl.endsWith('/')
        ? AppConfig.baseUrl.substring(0, AppConfig.baseUrl.length - 1)
        : AppConfig.baseUrl;
    return Uri.parse('$base${location.startsWith('/') ? '' : '/'}$location');
  }

  Future<String> _getCsrfToken() async {
    final res = await _http.get(_uri('/api/auth/csrf'), headers: _headers());
    if (res.statusCode != 200) {
      throw ApiException('Could not initialize login session');
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final csrf = body['csrfToken'] as String?;
    if (csrf == null) throw ApiException('Could not initialize login session');
    // Capture any cookie issued with the CSRF handshake.
    final cookie = _extractSessionCookie(res);
    if (cookie != null) {
      _sessionCookie = _mergeCookies(_sessionCookie, cookie);
    }
    return csrf;
  }

  Future<void> _fetchAndStoreSessionUser() async {
    // Two attempts: NextAuth can finish rotating its cookie chunk on the
    // request right after login; a single immediate retry removes that race
    // without ever masking a genuinely failed session.
    for (int attempt = 1; attempt <= 2; attempt++) {
      final res = await _http.get(_uri('/api/auth/session'), headers: _headers());
      if (res.statusCode == 200) {
        try {
          final body = jsonDecode(res.body);
          if (body is Map<String, dynamic> && body['user'] != null) {
            _user = Map<String, dynamic>.from(body['user'] as Map);
            await _persistSession();
            return;
          }
        } catch (_) {}
      }
      if (attempt == 1) {
        await Future<void>.delayed(const Duration(milliseconds: 350));
      }
    }
    throw ApiException('Login succeeded but session could not be loaded');
  }

  /// Completes Google login after the external-browser deep-link handoff.
  /// [exchangeToken] comes from `sabquick://auth-callback?token=...`.
  Future<void> completeGoogleLogin(String exchangeToken) async {
    await _nextAuthFormLogin({
      'mobileExchangeToken': exchangeToken,
    }, 'Google sign-in could not be completed');
  }

  Future<void> logout() async {
    try {
      await _http.post(
        _uri('/api/auth/signout'),
        headers: _headers(extra: {'Content-Type': 'application/x-www-form-urlencoded'}),
        body: {'csrfToken': await _getCsrfToken(), 'json': 'true'},
      );
    } catch (_) {}
    _sessionCookie = null;
    _user = null;
    await _persistSession();
  }

  String? _mergeCookies(String? existing, String incoming) {
    if (existing == null) return incoming;
    final map = <String, String>{};
    for (final pair in existing.split('; ')) {
      final idx = pair.indexOf('=');
      if (idx > 0) map[pair.substring(0, idx)] = pair.substring(idx + 1);
    }
    for (final pair in incoming.split('; ')) {
      final idx = pair.indexOf('=');
      if (idx > 0) map[pair.substring(0, idx)] = pair.substring(idx + 1);
    }
    return map.entries.map((e) => '${e.key}=${e.value}').join('; ');
  }

  // ------------------------------------------------------------------
  // CATALOG
  // ------------------------------------------------------------------

  Future<List<dynamic>> fetchCategories() async {
    final res = await _http.get(_uri('/api/categories'), headers: _headers());
    if (res.statusCode != 200) return [];
    final body = jsonDecode(res.body);
    return (body['categories'] as List?) ?? [];
  }

  Future<List<dynamic>> fetchProducts({String? categoryId, String? search}) async {
    final query = <String, String>{};
    if (categoryId != null && categoryId.isNotEmpty) {
      query['categoryId'] = categoryId;
    }
    if (search != null && search.trim().isNotEmpty) {
      query['search'] = search.trim();
    }
    final res = await _http.get(_uri('/api/products', query), headers: _headers());
    if (res.statusCode != 200) return [];
    final body = jsonDecode(res.body);
    return (body['products'] as List?) ?? [];
  }

  /// Resolved theme (campaign > manual > default). Returns null on failure.
  Future<Map<String, dynamic>?> fetchTheme() async {
    try {
      final res = await _http.get(_uri('/api/theme'), headers: _headers());
      if (res.statusCode != 200) return null;
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // ------------------------------------------------------------------
  // ADDRESSES + ORDERS
  // ------------------------------------------------------------------

  Future<List<dynamic>> fetchAddresses() async {
    final res = await _http.get(_uri('/api/addresses'), headers: _headers());
    if (res.statusCode != 200) return [];
    final body = jsonDecode(res.body);
    return (body['addresses'] as List?) ?? [];
  }

  Future<Map<String, dynamic>> createAddress({
    required String label,
    required String flatBuilding,
    required String streetArea,
    String? landmark,
    required double latitude,
    required double longitude,
  }) async {
    final res = await _http.post(
      _uri('/api/addresses'),
      headers: _headers(),
      body: jsonEncode({
        'label': label,
        'flatBuilding': flatBuilding,
        'streetArea': streetArea,
        if (landmark != null && landmark.isNotEmpty) 'landmark': landmark,
        'latitude': latitude,
        'longitude': longitude,
      }),
    );
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw ApiException(body['error'] ?? 'Failed to save address');
    }
    return body['address'] as Map<String, dynamic>;
  }

  /// Places an order. Payment method mirrors the web enum.
  Future<Map<String, dynamic>> placeOrder({
    required String addressId,
    required List<Map<String, dynamic>> items,
    String paymentMethod = 'CASH_ON_DELIVERY',
    double tipAmount = 0,
    String? couponCode,
  }) async {
    final res = await _http.post(
      _uri('/api/orders'),
      headers: _headers(),
      body: jsonEncode({
        'addressId': addressId,
        'items': items,
        'paymentMethod': paymentMethod,
        'tipAmount': tipAmount,
        if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
      }),
    );
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw ApiException(body['error'] ?? 'Failed to place order');
    }
    return body;
  }

  Future<List<dynamic>> fetchOrders() async {
    final res = await _http.get(_uri('/api/orders'), headers: _headers());
    if (res.statusCode != 200) return [];
    final body = jsonDecode(res.body);
    return (body['orders'] as List?) ?? [];
  }

  Future<Map<String, dynamic>> fetchActiveOrder() async {
    final res = await _http.get(_uri('/api/orders/active'), headers: _headers());
    if (res.statusCode != 200) return {};
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<void> cancelOrder(String orderNumber) async {
    final res = await _http.post(
      _uri('/api/orders/cancel'),
      headers: _headers(),
      body: jsonEncode({'orderNumber': orderNumber}),
    );
    if (res.statusCode >= 400) {
      final body = jsonDecode(res.body);
      throw ApiException(body['error'] ?? 'Failed to cancel order');
    }
  }

  // ------------------------------------------------------------------
  // STAFF: PACKER / MANAGER / OWNER operations
  // ------------------------------------------------------------------

  /// Operations queue (grouped by status) — requires PACKER/MANAGER/OWNER.
  Future<Map<String, dynamic>> fetchOpsOrders() async {
    final res = await _http.get(_uri('/api/ops/orders'), headers: _headers());
    if (res.statusCode != 200) {
      throw ApiException('Failed to load operations queue');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Advance an order through the fulfillment flow.
  Future<void> updateOrderStatus(String orderId, String status) async {
    final res = await _http.post(
      _uri('/api/ops/orders/status'),
      headers: _headers(),
      body: jsonEncode({'orderId': orderId, 'status': status}),
    );
    if (res.statusCode >= 400) {
      final body = jsonDecode(res.body);
      throw ApiException(body['error'] ?? 'Failed to update order status');
    }
  }

  // ------------------------------------------------------------------
  // OWNER: analytics, staff directory, coupons
  // ------------------------------------------------------------------

  /// Owner analytics payload (`/api/ops/analytics`) — OWNER only.
  /// Throws [ApiException] with the server message when unauthorized.
  Future<Map<String, dynamic>> fetchOpsAnalytics() async {
    final res = await _http.get(_uri('/api/ops/analytics'), headers: _headers());
    final body = jsonDecode(res.body);
    if (res.statusCode >= 400) {
      throw ApiException(
        (body is Map && body['error'] != null)
            ? body['error'] as String
            : 'Failed to load analytics',
      );
    }
    return body as Map<String, dynamic>;
  }

  /// Today's KPI metrics for the Everything/Manager header. Returns null on
  /// any failure so boards render without the strip (staff roles get 403).
  Future<Map<String, dynamic>?> fetchOpsMetrics() async {
    try {
      final data = await fetchOpsAnalytics();
      return (data['metrics'] ?? data) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Staff directory — OWNER only (`/api/owner/staff`).
  Future<List<dynamic>> fetchStaff() async {
    final res = await _http.get(_uri('/api/owner/staff'), headers: _headers());
    final body = jsonDecode(res.body);
    if (res.statusCode >= 400) {
      throw ApiException(
        (body is Map && body['error'] != null)
            ? body['error'] as String
            : 'Failed to load staff',
      );
    }
    return (body['staff'] as List?) ?? [];
  }

  /// Create or update a staff member — OWNER only.
  Future<void> saveStaff({
    String? id,
    required String name,
    required String phone,
    required String pin,
    required List<String> roles,
    String? email,
    String? vehicleDetails,
  }) async {
    final res = await _http.post(
      _uri('/api/owner/staff'),
      headers: _headers(),
      body: jsonEncode({
        'id': ?id,
        'name': name,
        'phone': phone,
        'pin': pin,
        'roles': roles,
        'role': roles.isNotEmpty ? roles.first : 'PACKER',
        'email': ?(email != null && email.isNotEmpty ? email : null),
        'vehicleDetails':
            ?(vehicleDetails != null && vehicleDetails.isNotEmpty
                ? vehicleDetails
                : null),
      }),
    );
    if (res.statusCode >= 400) {
      final body = jsonDecode(res.body);
      throw ApiException(
        (body is Map && body['error'] != null)
            ? body['error'] as String
            : 'Failed to save staff member',
      );
    }
  }

  /// Deactivate a staff member — OWNER only.
  Future<void> deleteStaff(String id) async {
    final res = await _http.delete(
      _uri('/api/owner/staff', {'id': id}),
      headers: _headers(),
    );
    if (res.statusCode >= 400) {
      final body = jsonDecode(res.body);
      throw ApiException(
        (body is Map && body['error'] != null)
            ? body['error'] as String
            : 'Failed to deactivate staff member',
      );
    }
  }

  /// Coupon list — OWNER only (`/api/owner/coupons`).
  Future<List<dynamic>> fetchCoupons() async {
    final res = await _http.get(_uri('/api/owner/coupons'), headers: _headers());
    final body = jsonDecode(res.body);
    if (res.statusCode >= 400) {
      throw ApiException(
        (body is Map && body['error'] != null)
            ? body['error'] as String
            : 'Failed to load coupons',
      );
    }
    return (body['coupons'] as List?) ?? [];
  }

  /// Create a coupon — OWNER only.
  Future<void> createCoupon({
    required String code,
    required String discountType,
    required double discountValue,
    double minOrderAmount = 0,
    double? maxDiscount,
    DateTime? validTill,
    int? usageLimit,
    String? description,
  }) async {
    final res = await _http.post(
      _uri('/api/owner/coupons'),
      headers: _headers(),
      body: jsonEncode({
        'code': code,
        'description': description,
        'discountType': discountType,
        'discountValue': discountValue,
        'minOrderAmount': minOrderAmount,
        'maxDiscount': ?maxDiscount,
        'validTill': (validTill ?? DateTime.now().add(const Duration(days: 30)))
            .toIso8601String(),
        'usageLimit': ?usageLimit,
        'isActive': true,
      }),
    );
    if (res.statusCode >= 400) {
      final body = jsonDecode(res.body);
      throw ApiException(
        (body is Map && body['error'] != null)
            ? body['error'] as String
            : 'Failed to create coupon',
      );
    }
  }

  /// Toggle a coupon active/paused — OWNER only.
  Future<void> toggleCoupon(String id, bool isActive) async {
    final res = await _http.patch(
      _uri('/api/owner/coupons'),
      headers: _headers(),
      body: jsonEncode({'id': id, 'isActive': isActive}),
    );
    if (res.statusCode >= 400) {
      final body = jsonDecode(res.body);
      throw ApiException(
        (body is Map && body['error'] != null)
            ? body['error'] as String
            : 'Failed to update coupon',
      );
    }
  }

  // ------------------------------------------------------------------
  // STAFF: RIDER
  // ------------------------------------------------------------------

  /// Rider dashboard payload: online flag, stats, active + available orders.
  Future<Map<String, dynamic>> fetchRiderStatus() async {
    final res =
        await _http.get(_uri('/api/rider/status'), headers: _headers());
    if (res.statusCode != 200) {
      throw ApiException('Failed to load rider status');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<void> toggleRiderShift() async {
    final res = await _http.post(
      _uri('/api/rider/toggle-shift'),
      headers: _headers(),
      body: jsonEncode({}),
    );
    if (res.statusCode >= 400) {
      final body = jsonDecode(res.body);
      throw ApiException(body['error'] ?? 'Failed to toggle shift');
    }
  }

  Future<void> acceptOrder(String orderId) async {
    final res = await _http.post(
      _uri('/api/rider/orders/accept'),
      headers: _headers(),
      body: jsonEncode({'orderId': orderId}),
    );
    if (res.statusCode >= 400) {
      final body = jsonDecode(res.body);
      throw ApiException(body['error'] ?? 'Failed to accept order');
    }
  }

  Future<void> verifyDeliveryOtp(String orderId, String otp) async {
    final res = await _http.post(
      _uri('/api/rider/orders/verify-otp'),
      headers: _headers(),
      body: jsonEncode({'orderId': orderId, 'enteredOtp': otp}),
    );
    if (res.statusCode >= 400) {
      final body = jsonDecode(res.body);
      throw ApiException(body['error'] ?? 'Invalid delivery OTP');
    }
  }

  void dispose() {
    _http.close();
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}
