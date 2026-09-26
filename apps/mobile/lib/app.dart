import 'package:flutter/material.dart';

import 'api_client.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';
import 'screens/splash_screen.dart';
import 'theme.dart';

/// Launch flow: stage 1 splash (brand, min 1.2s) → session bootstrap →
/// stage 2 auth or stage 3/4 home (loading board → main board).
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
      home: _checkingSession
          ? const SplashScreen()
          : _loggedIn
              ? const HomeScreen()
              : const AuthScreen(),
    );
  }
}
