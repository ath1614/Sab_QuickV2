import 'package:flutter/material.dart';

import 'api_client.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';
import 'screens/splash_screen.dart';
import 'theme.dart';

/// Root widget: builds the SabQuick Material 3 theme and routes between
/// splash, auth and storefront based on the persisted session.
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
    await ApiClient.instance.loadSession();
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
