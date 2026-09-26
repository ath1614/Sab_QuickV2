import 'package:flutter/material.dart';

/// ─────────────────────────────────────────────────────────────────
/// SabQuick Design System v3 — "Neon Market"
/// Apple-HIG-informed: content-first, depth via soft shadows not
/// borders, 8pt spacing grid, restrained color with one electric
/// accent. Space Grotesk display + Inter body, marker highlights.
/// ─────────────────────────────────────────────────────────────────

class SQColor {
  // Brand anchors (synced with the website theme engine)
  static const green = Color(0xFF0B6E4F);
  static const greenDeep = Color(0xFF05372A);

  // Electric accent
  static const lime = Color(0xFFC8F531);
  static const limeSoft = Color(0xFFEFFCC4);

  // Modern neutrals (Apple-style stepped grays, warm-shifted)
  static const ink = Color(0xFF0D0F12);
  static const inkSoft = Color(0xFF545A63);
  static const inkFaint = Color(0xFF9AA0A8);
  static const fog = Color(0xFFF7F6F2);
  static const card = Color(0xFFFFFFFF);
  static const line = Color(0xFFEBE9E2);

  // Functional
  static const danger = Color(0xFFE5484D);
  static const success = Color(0xFF12A150);
  static const amber = Color(0xFFF5A623);

  // Highlight spectrum (marker + neon effects)
  static const violet = Color(0xFF6C5CE7);
  static const cyan = Color(0xFF22D3EE);
}

class SQRadius {
  static const xs = 10.0;
  static const sm = 14.0;
  static const md = 20.0;
  static const lg = 28.0;
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
  // Display: Space Grotesk — headlines, prices, big numbers.
  static const display = TextStyle(
    fontFamily: 'SpaceGrotesk',
    fontSize: 32,
    height: 1.05,
    fontWeight: FontWeight.w700,
    letterSpacing: -1.2,
    color: SQColor.ink,
  );
  static const h1 = TextStyle(
    fontFamily: 'SpaceGrotesk',
    fontSize: 23,
    height: 1.1,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.6,
    color: SQColor.ink,
  );
  static const h2 = TextStyle(
    fontFamily: 'SpaceGrotesk',
    fontSize: 17,
    height: 1.2,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
    color: SQColor.ink,
  );

  // Body: Inter — UI copy, labels, captions.
  static const body = TextStyle(
    fontFamily: 'Inter',
    fontSize: 13.5,
    height: 1.5,
    fontWeight: FontWeight.w400,
    color: SQColor.inkSoft,
  );
  static const bodyStrong = TextStyle(
    fontFamily: 'Inter',
    fontSize: 13.5,
    height: 1.5,
    fontWeight: FontWeight.w600,
    color: SQColor.ink,
  );
  static const caption = TextStyle(
    fontFamily: 'Inter',
    fontSize: 11.5,
    height: 1.4,
    fontWeight: FontWeight.w600,
    color: SQColor.inkSoft,
  );
  static const micro = TextStyle(
    fontFamily: 'Inter',
    fontSize: 10.5,
    height: 1.2,
    fontWeight: FontWeight.w800,
    letterSpacing: 0.7,
    color: SQColor.inkSoft,
  );
}

/// Motion: fast-out, springy-in; neon press effects run on [fast].
class SQMotion {
  static const fast = Duration(milliseconds: 150);
  static const base = Duration(milliseconds: 260);
  static const slow = Duration(milliseconds: 480);
  static const curveOut = Curves.easeOutCubic;
  static const springy = Curves.easeOutBack;
}
