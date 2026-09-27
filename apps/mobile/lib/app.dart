import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'api_client.dart';
import 'design/status_bar.dart';
import 'screens/auth_screen.dart';
import 'screens/error_screen.dart';
import 'screens/home_screen.dart';
import 'screens/splash_screen.dart';
import 'theme.dart';

/// Broadcast whenever the app switches between logged-out (Auth) and
/// logged-in (Home). AuthScreen listens so a successful native Google
/// sign-in — which completes outside its own login calls — can navigate to
/// Home.
final StreamController<bool> authStateController =
    StreamController<bool>.broadcast();

/// Launch flow: stage 1 splash (brand, min 1.2s) → session bootstrap →
/// stage 2 auth or stage 3/4 home (loading board → main board).
///
/// Google sign-in is fully native and in-app (google_sign_in plugin): the
/// consent sheet opens inside the app and the ID token is exchanged for a
/// NextAuth session — no browser, no deep links, no dependency on the
/// website. The app is standalone from the website by design.
class SabQuickApp extends StatefulWidget {
  const SabQuickApp({super.key});

  @override
  State<SabQuickApp> createState() => _SabQuickAppState();
}

class _SabQuickAppState extends State<SabQuickApp> {
  bool _checkingSession = true;
  bool _loggedIn = false;

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

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SabQuick',
      debugShowCheckedModeBanner: false,
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
