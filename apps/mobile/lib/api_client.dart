import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';

/// API client for the SabQuick Next.js backend.
///
/// Authentication mirrors the web exactly: NextAuth credentials flow over
/// `POST /api/auth/callback/credentials`, with the session JWT returned as an
/// `next-auth.session-token` httpOnly cookie. We persist that cookie and resend
/// it on every request — no backend changes required.
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

  /// Extracts the full cookie header from a response for session capture.
  String? _extractSessionCookie(http.Response response) {
    final setCookies = response.headers['set-cookie'];
    if (setCookies == null || setCookies.isEmpty) return null;
    // http package merges cookies; keep every cookie pair.
    final pairs = <String>[];
    for (final part in setCookies.split(RegExp(r'(?<=;),(?= )'))) {
      final firstSegment = part.split(';').first.trim();
      if (firstSegment.isNotEmpty) pairs.add(firstSegment);
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
    final csrf = await _getCsrfToken();
    final res = await _http.post(
      _uri('/api/auth/callback/credentials'),
      headers: _headers(extra: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      body: {
        'phone': phone,
        'otp': otp,
        if (name != null && name.isNotEmpty) 'name': name,
        'csrfToken': csrf,
        'json': 'true',
      },
    );

    final setCookie = _extractSessionCookie(res);
    if (res.statusCode >= 400 || setCookie == null) {
      String message = 'Login failed. Please try again.';
      try {
        final body = jsonDecode(res.body);
        if (body is Map && body['error'] != null) message = body['error'];
      } catch (_) {}
      throw ApiException(message);
    }

    _sessionCookie = setCookie;
    await _fetchAndStoreSessionUser();
    return _user ?? {};
  }

  /// Step 2b: owner / staff login via passcode or PIN.
  Future<Map<String, dynamic>> loginWithPin({
    required String phone,
    required String pin,
  }) async {
    return loginWithOtp(phone: phone, otp: pin);
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
    final res = await _http.get(_uri('/api/auth/session'), headers: _headers());
    if (res.statusCode == 200) {
      final body = jsonDecode(res.body);
      if (body is Map<String, dynamic> && body['user'] != null) {
        _user = Map<String, dynamic>.from(body['user'] as Map);
        await _persistSession();
        return;
      }
    }
    throw ApiException('Login succeeded but session could not be loaded');
  }

  /// Completes Google login after the external-browser deep-link handoff.
  /// [exchangeToken] comes from `sabquick://auth-callback?token=...`.
  Future<void> completeGoogleLogin(String exchangeToken) async {
    final csrf = await _getCsrfToken();
    final res = await _http.post(
      _uri('/api/auth/callback/credentials'),
      headers: _headers(extra: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      body: {
        'mobileExchangeToken': exchangeToken,
        'csrfToken': csrf,
        'json': 'true',
      },
    );
    final setCookie = _extractSessionCookie(res);
    if (res.statusCode >= 400 || setCookie == null) {
      throw ApiException('Google sign-in could not be completed');
    }
    _sessionCookie = setCookie;
    await _fetchAndStoreSessionUser();
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
