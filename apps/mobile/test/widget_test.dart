import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sabquick_app/design/tokens.dart';
import 'package:sabquick_app/screens/splash_screen.dart';
import 'package:sabquick_app/theme.dart';

void main() {
  testWidgets('Splash screen renders brand elements', (tester) async {
    await tester.pumpWidget(
      MaterialApp(theme: buildSabQuickTheme(), home: const SplashScreen()),
    );
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('SabQuick'), findsOneWidget);
    expect(find.text('Groceries at your door in minutes'), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
  });

  test('Design system theme uses brand tokens', () {
    final theme = buildSabQuickTheme();
    expect(theme.colorScheme.primary, SQColor.green);
    expect(theme.colorScheme.secondary, SQColor.lime);
    expect(theme.scaffoldBackgroundColor, SQColor.fog);
  });
}
