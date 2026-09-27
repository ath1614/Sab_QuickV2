import 'package:flutter/material.dart';

import '../design/tokens.dart';

/// TEMPORARY stopgap while the native consoles are built (standalone-app
/// round): the Account screen's console tiles used to open the website in a
/// WebView. The WebView stack is being removed from the app, so each console
/// now gets a purpose-built NATIVE Flutter screen (Owner Hub, Catalog &
/// Pricing, Manager Dispatch Kanban, Packer Floor Station). Until those
/// land, this screen marks the console as under construction instead of
/// ever linking out to the website.
class ConsolePlaceholderScreen extends StatelessWidget {
  final String title;
  final String path;

  const ConsolePlaceholderScreen({
    super.key,
    required this.title,
    required this.path,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.fog,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: SQColor.card,
        surfaceTintColor: Colors.transparent,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(SQSpace.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: SQColor.lime.withValues(alpha: 0.35),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.construction_rounded,
                  color: SQColor.greenDeep,
                  size: 34,
                ),
              ),
              const SizedBox(height: SQSpace.lg),
              Text('$title is going native', style: SQType.h1),
              const SizedBox(height: 6),
              Text(
                'A dedicated in-app screen for this console is on the way — '
                'no website needed. Keep the app updated.',
                textAlign: TextAlign.center,
                style: SQType.body,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
