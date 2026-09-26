import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Edge-to-edge status-bar styling, Blinkit-style: the app draws under the
/// system bars everywhere, and each screen picks the icon brightness that
/// contrasts with its surface so time/battery/signal stay readable.
///
/// Call once per screen build (it's a cheap no-op when unchanged):
///   StatusBar.lightIcons();  // on green/ink/owner boards
///   StatusBar.darkIcons();   // on white/fog surfaces (splash, cards)
class StatusBar {
  StatusBar._();

  /// White status-bar icons — for colored surfaces (brand green header,
  /// dark owner boards, ink surfaces).
  static void lightIcons() => _apply(
        SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: Colors.transparent,
        ),
      );

  /// Dark status-bar icons — for light surfaces (white splash, fog cards).
  static void darkIcons() => _apply(
        SystemUiOverlayStyle.dark.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: Colors.transparent,
        ),
      );

  static void _apply(SystemUiOverlayStyle style) {
    SystemChrome.setSystemUIOverlayStyle(style);
  }

  /// Global bootstrap: transparent bars, edge-to-edge, brand-green splash
  /// icons while the engine paints the first frame.
  static void configureSystemChrome() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    lightIcons();
  }
}
