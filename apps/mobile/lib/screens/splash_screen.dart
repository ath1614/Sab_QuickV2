import 'package:flutter/material.dart';

import '../design/tokens.dart';

/// Stage 1 of the launch flow: brand splash.
/// Real SabQuick logo, staged entrance (logo springs in, tagline fades up,
/// lime progress bar sweeps), auto-advances via the root bootstrap.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..forward();

  late final Animation<double> _logoScale = Tween(begin: 0.82, end: 1.0)
      .animate(CurvedAnimation(parent: _c, curve: SQMotion.springy));
  late final Animation<double> _tagline = Tween(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _c, curve: const Interval(0.35, 0.9, curve: SQMotion.curveOut)));
  late final Animation<double> _bar = Tween(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _c, curve: const Interval(0.5, 1.0, curve: Curves.easeOutCubic)));

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.greenDeep,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Brand logo in a white rounded card (matches website identity)
            ScaleTransition(
              scale: _logoScale,
              child: Container(
                width: 128,
                height: 128,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(SQRadius.lg),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.25),
                      blurRadius: 40,
                      offset: const Offset(0, 16),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(14),
                child: Image.asset(
                  'assets/brand/app-icon.png',
                  fit: BoxFit.contain,
                ),
              ),
            ),
            const SizedBox(height: SQSpace.lg),
            FadeTransition(
              opacity: _tagline,
              child: Column(
                children: [
                  const Text(
                    'SabQuick',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.6,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Groceries at your door in minutes',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.75),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: SQSpace.xl),
            // Lime progress sweep
            FadeTransition(
              opacity: _tagline,
              child: SizedBox(
                width: 120,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(SQRadius.pill),
                  child: LinearProgressIndicator(
                    value: _bar.value,
                    minHeight: 4,
                    backgroundColor: Colors.white.withValues(alpha: 0.15),
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(SQColor.lime),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
