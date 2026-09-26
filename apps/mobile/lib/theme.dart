import 'package:flutter/material.dart';

import 'design/tokens.dart';

/// SabQuick Material 3 theme driven by the design-system tokens.
ThemeData buildSabQuickTheme({
  Color primary = SQColor.green,
  Color accent = SQColor.lime,
}) {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: primary,
    primary: primary,
    secondary: accent,
    surface: SQColor.card,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    // Inter is the default UI face; Space Grotesk is applied per-style via
    // SQType (display/h1/h2) for headlines and numbers.
    fontFamily: 'Inter',
    scaffoldBackgroundColor: SQColor.fog,
    appBarTheme: const AppBarTheme(
      backgroundColor: SQColor.fog,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      iconTheme: IconThemeData(color: SQColor.ink),
      titleTextStyle: SQType.h2,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: SQColor.card,
      indicatorColor: SQColor.green.withValues(alpha: 0.10),
      elevation: 0,
      height: 68,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 10.5,
          fontWeight: selected ? FontWeight.w900 : FontWeight.w600,
          color: selected ? SQColor.ink : SQColor.inkSoft,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          size: 23,
          color: selected ? SQColor.green : SQColor.inkSoft,
        );
      }),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: SQColor.green,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(54),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(SQRadius.md),
        ),
        textStyle: const TextStyle(
            fontFamily: 'Inter', fontSize: 14.5, fontWeight: FontWeight.w800),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: SQColor.card,
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(SQRadius.md),
        borderSide: const BorderSide(color: SQColor.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(SQRadius.md),
        borderSide: const BorderSide(color: SQColor.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(SQRadius.md),
        borderSide: const BorderSide(color: SQColor.green, width: 1.6),
      ),
      hintStyle: SQType.body.copyWith(color: const Color(0xFFA8A29B)),
    ),
    pageTransitionsTheme: PageTransitionsTheme(
      builders: {
        TargetPlatform.android: const CupertinoPageTransitionsBuilder(),
        TargetPlatform.iOS: const CupertinoPageTransitionsBuilder(),
      },
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: SQColor.ink,
      contentTextStyle: const TextStyle(
          fontFamily: 'Inter',
          color: Colors.white,
          fontSize: 13,
          fontWeight: FontWeight.w700),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(SQRadius.sm),
      ),
    ),
  );
}
