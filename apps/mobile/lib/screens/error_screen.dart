import 'package:flutter/material.dart'; // also provides kReleaseMode

import '../design/tokens.dart';
import '../design/widgets.dart';

/// Branded crash screen. Used in two ways:
///  1. Global fallback via `ErrorWidget.builder` (set in app.dart) so a
///     build-phase exception can NEVER render the ugly grey release box.
///  2. Explicit per-screen error states with a retry action.
///
/// In debug/profile builds the exception + stack are shown for debugging;
/// release builds stay clean and friendly.
class BrandedErrorScreen extends StatelessWidget {
  final FlutterErrorDetails? details;
  final VoidCallback? onRetry;
  final bool showDetails;
  final String title;

  const BrandedErrorScreen({
    super.key,
    this.details,
    this.onRetry,
    this.showDetails = false,
    this.title = 'Something went wrong',
  });

  String get _summary {
    final exc = details?.exception;
    if (exc is FlutterError) {
      final msg = exc.message.toString();
      return msg.split('\n').first;
    }
    return exc?.toString().split('\n').first ?? 'An unexpected error occurred.';
  }

  String get _stackText {
    final buffer = StringBuffer();
    buffer.writeln(_summary);
    buffer.writeln();
    final stack = details?.stack?.toString();
    if (stack != null && stack.isNotEmpty) buffer.writeln(stack);
    final information = details?.informationCollector?.call() ?? const [];
    for (final line in information) {
      buffer.writeln(line.toString());
    }
    return buffer.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.fog,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(SQSpace.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 84,
                  height: 84,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: SQColor.card,
                    borderRadius: BorderRadius.circular(SQRadius.lg),
                    border: Border.all(color: SQColor.line),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Image.asset('assets/brand/app-icon.png',
                      fit: BoxFit.contain),
                ),
                const SizedBox(height: SQSpace.lg),
                Text(title, style: SQType.h1, textAlign: TextAlign.center),
                const SizedBox(height: 6),
                Text(
                  'The screen hit a snag while rendering.\n'
                  'A quick retry usually fixes it.',
                  style: SQType.body,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: SQSpace.lg),
                if (onRetry != null)
                  SQButton(
                    label: 'Try again',
                    icon: Icons.refresh_rounded,
                    onTap: onRetry,
                  ),
                if (showDetails && details != null) ...[
                  const SizedBox(height: SQSpace.lg),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text('DEBUG DETAILS', style: SQType.micro),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    constraints: const BoxConstraints(maxHeight: 320),
                    decoration: BoxDecoration(
                      color: SQColor.card,
                      borderRadius: BorderRadius.circular(SQRadius.sm),
                      border: Border.all(color: SQColor.danger.withValues(alpha: 0.4)),
                    ),
                    child: SingleChildScrollView(
                      child: Text(
                        _stackText,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 10.5,
                          height: 1.35,
                          color: SQColor.danger,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Custom 404 for unknown routes (onUnknownRoute in app.dart).
class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.fog,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Oversized ghost "404" in the brand lime.
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [SQColor.lime, SQColor.green],
                ).createShader(bounds),
                child: const Text(
                  '404',
                  style: TextStyle(
                    fontFamily: 'SpaceGrotesk',
                    fontSize: 96,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -4,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: SQSpace.sm),
              Text('This aisle does not exist', style: SQType.h2),
              const SizedBox(height: 6),
              Text(
                'The page you were looking for is not part of the store.',
                style: SQType.body,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: SQSpace.lg),
              SQButton(
                label: 'Back to the store',
                icon: Icons.storefront_rounded,
                onTap: () {
                  // Pop to root; from the root shell this exits gracefully.
                  Navigator.of(context).popUntil((r) => r.isFirst);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
