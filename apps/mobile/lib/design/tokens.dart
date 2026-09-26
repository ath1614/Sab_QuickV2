import 'package:flutter/material.dart';

/// ─────────────────────────────────────────────────────────────────
/// SabQuick Design System — tokens
/// Deep "racing green" + kinetic lime accent, warm neutrals,
/// oversized black display type, generous 20–24px radii.
/// ─────────────────────────────────────────────────────────────────

class SQColor {
  static const green = Color(0xFF0B6E4F);
  static const greenDeep = Color(0xFF064E3B);
  static const lime = Color(0xFFB9F227);
  static const limeDark = Color(0xFF8FD400);
  static const ink = Color(0xFF101418);
  static const inkSoft = Color(0xFF3D4753);
  static const fog = Color(0xFFF5F4EF);
  static const card = Color(0xFFFFFFFF);
  static const line = Color(0xFFE8E6DE);
  static const danger = Color(0xFFDC2626);
  static const success = Color(0xFF059669);
  static const amber = Color(0xFFF59E0B);
}

class SQRadius {
  static const xs = 10.0;
  static const sm = 14.0;
  static const md = 20.0;
  static const lg = 26.0;
  static const pill = 999.0;
}

class SQSpace {
  static const xs = 6.0;
  static const sm = 10.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
}

class SQType {
  static const display = TextStyle(
    fontSize: 30,
    height: 1.08,
    fontWeight: FontWeight.w900,
    letterSpacing: -1.2,
    color: SQColor.ink,
  );
  static const h1 = TextStyle(
    fontSize: 22,
    height: 1.12,
    fontWeight: FontWeight.w900,
    letterSpacing: -0.6,
    color: SQColor.ink,
  );
  static const h2 = TextStyle(
    fontSize: 16.5,
    height: 1.2,
    fontWeight: FontWeight.w800,
    letterSpacing: -0.3,
    color: SQColor.ink,
  );
  static const body = TextStyle(
    fontSize: 13.5,
    height: 1.45,
    fontWeight: FontWeight.w500,
    color: SQColor.inkSoft,
  );
  static const caption = TextStyle(
    fontSize: 11.5,
    height: 1.35,
    fontWeight: FontWeight.w600,
    color: SQColor.inkSoft,
  );
  static const micro = TextStyle(
    fontSize: 10.5,
    height: 1.2,
    fontWeight: FontWeight.w800,
    letterSpacing: 0.6,
    color: SQColor.inkSoft,
  );
}

/// Motion: fast-out, springy-in. Used across every interactive element.
class SQMotion {
  static const fast = Duration(milliseconds: 160);
  static const base = Duration(milliseconds: 260);
  static const slow = Duration(milliseconds: 480);
  static const curveOut = Curves.easeOutCubic;
  static const springy = Curves.easeOutBack;
}
