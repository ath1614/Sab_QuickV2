import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:app_links/app_links.dart';

import 'api_client.dart';
import 'design/status_bar.dart';
import 'design/tokens.dart';
import 'screens/auth_screen.dart';
import 'screens/error_screen.dart';
import 'screens/home_screen.dart';
import 'screens/splash_screen.dart';
import 'theme.dart';

/// Broadcast whenever the app switches between logged-out (Auth) and
/// logged-in (Home). AuthScreen listens so a successful Google handoff —
/// which completes outside its widget tree — can navigate to Home.
final StreamController<bool> authStateController =
    StreamController<bool>.broadcast();

/// Launch flow: stage 1 splash (brand, min 1.2s) → session bootstrap →
/// stage 2 auth or stage 3/4 home (loading board → main board).
///
/// Also owns the Google sign-in deep-link handoff: the web's
/// /auth/mobile-return page redirects to sabquick://auth-callback?token=...
/// which lands here (warm) or on cold start, and is exchanged for a
/// NextAuth session via the credentials callback.
class SabQuickApp extends StatefulWidget {
  const SabQuickApp({super.key});

  @override
  State<SabQuickApp> createState() => _SabQuickAppState();
}

class _SabQuickAppState extends State<SabQuickApp> {
  bool _checkingSession = true;
  bool _loggedIn = false;
  bool _exchangingToken = false;

  StreamSubscription<Uri>? _linkSub;
  final _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    // Blinkit-style edge-to-edge + brand splash icons while the first
    // frame paints (splash switches to dark icons on white immediately).
    StatusBar.configureSystemChrome();
    // A build-phase exception ANYWHERE renders the branded error screen
    // instead of the grey release box. Debug builds include the stack.
    ErrorWidget.builder = (details) => BrandedErrorScreen(
          details: details,
          showDetails: !kReleaseMode,
          title: 'Screen error',
        );
    _bootstrap();
    _initDeepLinks();
  }

  @override
  void dispose() {
    _linkSub?.cancel();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    // Hold the brand splash for at least 1.2s so the launch never "flashes".
    await Future.wait([
      ApiClient.instance.loadSession(),
      Future.delayed(const Duration(milliseconds: 1200)),
    ]);
    if (!mounted) return;
    setState(() {
      _loggedIn = ApiClient.instance.isLoggedIn;
      _checkingSession = false;
    });
  }

  /// Google handoff: browser → sabquick://auth-callback?token=...
  /// Handles warm returns (listener) AND cold starts (initialLink).
  Future<void> _initDeepLinks() async {
    final links = AppLinks();

    // Cold start: app was killed while the browser still had the return page.
    try {
      final initial = await links.getInitialLink();
      if (initial != null) {
        await _handleAuthCallback(initial);
      }
    } catch (_) {}

    // Warm returns while the app is alive in the background.
    _linkSub = links.uriLinkStream.listen(
      (uri) => _handleAuthCallback(uri),
      onError: (_) {},
    );
  }

  Future<void> _handleAuthCallback(Uri uri) async {
    if (uri.scheme != 'sabquick' || uri.host != 'auth-callback') return;
    final token = uri.queryParameters['token'];
    if (token == null || token.isEmpty || _exchangingToken) return;

    _exchangingToken = true;
    // Surface the brand splash while the exchange round-trips.
    if (mounted) setState(() => _checkingSession = true);
    try {
      await ApiClient.instance.completeGoogleLogin(token);
      if (!mounted) return;
      setState(() {
        _loggedIn = true;
        _checkingSession = false;
      });
      authStateController.add(true);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _checkingSession = false;
        _loggedIn = ApiClient.instance.isLoggedIn;
      });
      _showAuthError();
    } finally {
      _exchangingToken = false;
    }
  }

  void _showAuthError() {
    final ctx = _navigatorKey.currentContext;
    if (ctx == null) return;
    ScaffoldMessenger.of(ctx).showSnackBar(
      SnackBar(
        content:
            const Text('Google sign-in did not complete. Please try again.'),
        backgroundColor: SQColor.danger,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SabQuick',
      debugShowCheckedModeBanner: false,
      navigatorKey: _navigatorKey,
      theme: buildSabQuickTheme(),
      // Custom 404 for unknown routes instead of Flutter's red error page.
      onUnknownRoute: (settings) => MaterialPageRoute(
        builder: (_) => const NotFoundScreen(),
        settings: settings,
      ),
      routes: const {},
      home: _checkingSession
          ? const SplashScreen()
          : _loggedIn
              ? const HomeScreen()
              : const AuthScreen(),
    );
  }
}
