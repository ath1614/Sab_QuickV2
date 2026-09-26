import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sabquick_app/design/tokens.dart';
import 'package:sabquick_app/screens/splash_screen.dart';
import 'package:sabquick_app/theme.dart';

void main() {
  testWidgets('Splash matches the website: white bg + full logo lockup',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(theme: buildSabQuickTheme(), home: const SplashScreen()),
    );
    await tester.pump(const Duration(milliseconds: 300));

    // The full splash-logo lockup is the hero (wordmark lives inside the
    // asset — no separate Text widgets anymore).
    expect(find.byType(Image), findsOneWidget);
    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.backgroundColor, Colors.white);
  });

  test('Design system theme uses brand tokens', () {
    final theme = buildSabQuickTheme();
    expect(theme.colorScheme.primary, SQColor.green);
    expect(theme.colorScheme.secondary, SQColor.lime);
    expect(theme.scaffoldBackgroundColor, SQColor.fog);
  });
}
