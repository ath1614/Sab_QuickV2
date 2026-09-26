import 'package:flutter/material.dart';

import '../design/status_bar.dart';
import '../design/tokens.dart';

/// Stage 1 of the launch flow: brand splash.
/// Matches the website's SplashScreen: white background with the full
/// splash-logo lockup, fast (≤900ms) so it reads as a brand flash, not a
/// loading screen. Dark status-bar icons for contrast on white.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
  )..forward();

  late final Animation<double> _logo = Tween(begin: 0.94, end: 1.0).animate(
      CurvedAnimation(parent: _c, curve: SQMotion.springy));
  late final Animation<double> _fade = CurvedAnimation(
      parent: _c, curve: const Interval(0.0, 0.7, curve: SQMotion.curveOut));

  @override
  void initState() {
    super.initState();
    StatusBar.darkIcons();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: FadeTransition(
          opacity: _fade,
          child: ScaleTransition(
            scale: _logo,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: SQSpace.xl),
              child: Image.asset(
                'assets/brand/splash-logo.png',
                fit: BoxFit.contain,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
