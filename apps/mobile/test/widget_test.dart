import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sabquick_app/screens/splash_screen.dart';
import 'package:sabquick_app/theme.dart';

void main() {
  testWidgets('Splash screen renders brand elements', (tester) async {
    await tester.pumpWidget(
      MaterialApp(theme: buildSabQuickTheme(), home: const SplashScreen()),
    );

    expect(find.text('SabQuick'), findsOneWidget);
    expect(find.text('Groceries in 10-15 minutes'), findsOneWidget);
    expect(find.byIcon(Icons.flash_on), findsNothing);
  });

  test('SabQuick theme uses brand colors', () {
    final theme = buildSabQuickTheme();
    expect(theme.colorScheme.primary, const Color(0xFF0B6E4F));
    expect(theme.colorScheme.secondary, const Color(0xFF00C853));
  });
}
