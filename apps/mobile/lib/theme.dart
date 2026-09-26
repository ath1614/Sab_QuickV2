import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

/// SabQuick brand + Material 3 theme with shared-axis page transitions.
///
/// The default colors mirror the web theme engine defaults; `HomeScreen`
/// re-resolves them from `GET /api/theme` (campaign > manual > default) and
/// hot-swaps the MaterialApp theme when a seasonal campaign is live.
const Color kBrandPrimary = Color(0xFF0B6E4F);
const Color kBrandAccent = Color(0xFF00C853);
const Color kSurfaceDark = Color(0xFF0F172A);

ThemeData buildSabQuickTheme({
  Color primary = kBrandPrimary,
  Color accent = kBrandAccent,
}) {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: primary,
    primary: primary,
    secondary: accent,
    surface: Colors.white,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      iconTheme: IconThemeData(color: kSurfaceDark),
      titleTextStyle: TextStyle(
        color: kSurfaceDark,
        fontSize: 18,
        fontWeight: FontWeight.w900,
        letterSpacing: -0.3,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primary,
        side: BorderSide(color: primary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: primary, width: 1.6),
      ),
    ),
    pageTransitionsTheme: PageTransitionsTheme(
      builders: {
        // Forward: slide+fade (shared-axis X). Back: iOS-style swipe gesture.
        TargetPlatform.android: const CupertinoPageTransitionsBuilder(),
        TargetPlatform.iOS: const CupertinoPageTransitionsBuilder(),
      },
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}
