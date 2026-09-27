import 'package:flutter/material.dart';

import '../api_client.dart';
import '../data/theme_presets.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

/// OWNER secondary console: pick a seasonal palette and apply it to the
/// storefront. Presets mirror the website's shared gallery (see
/// lib/data/theme_presets.dart); applying posts to /api/ops/theme/update.
/// The storefront picks the new colors up on its next /api/theme read.
class ThemeStudioScreen extends StatefulWidget {
  const ThemeStudioScreen({super.key});

  @override
  State<ThemeStudioScreen> createState() => _ThemeStudioScreenState();
}

class _ThemeStudioScreenState extends State<ThemeStudioScreen> {
  final _api = ApiClient.instance;
  String? _applyingKey;
  String? _appliedKey;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Reflect the currently live theme onto its preset card.
    _resolveActivePreset();
  }

  Future<void> _resolveActivePreset() async {
    try {
      final theme = await _api.fetchTheme();
      if (!mounted || theme == null) return;
      final name = theme['themeName'] as String?;
      if (name == null) return;
      final match = themePresets.where((p) => p.name == name).firstOrNull;
      if (match != null) setState(() => _appliedKey = match.key);
    } catch (_) {
      // Non-fatal: cards just render without a selection.
    }
  }

  Future<void> _apply(ThemePreset preset) async {
    setState(() {
      _applyingKey = preset.key;
      _error = null;
    });
    try {
      await _api.updateTheme(
        themeName: preset.name,
        primaryColor: preset.primaryColor,
        accentColor: preset.accentColor,
        saleTagText: preset.saleTagText,
      );
      if (!mounted) return;
      setState(() {
        _appliedKey = preset.key;
        _applyingKey = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('"${preset.name}" is live on the storefront'),
        backgroundColor: SQColor.success,
      ));
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _applyingKey = null;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _applyingKey = null;
        _error = 'Network error. Try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.fog,
      appBar: AppBar(
        title: const Text('Theme Studio'),
        backgroundColor: SQColor.card,
        surfaceTintColor: Colors.transparent,
      ),
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
              SQSpace.md, SQSpace.sm, SQSpace.md, SQSpace.xl),
          children: [
            Text('Seasonal palettes', style: SQType.display.copyWith(fontSize: 24)),
            const SizedBox(height: 4),
            Text(
              'One tap recolors the entire storefront — web and app.',
              style: SQType.body,
            ),
            if (_error != null) ...[
              const SizedBox(height: SQSpace.sm),
              Text(_error!,
                  style: const TextStyle(
                      color: SQColor.danger,
                      fontSize: 12,
                      fontWeight: FontWeight.w700)),
            ],
            const SizedBox(height: SQSpace.md),
            for (final preset in themePresets)
              _PresetCard(
                preset: preset,
                isApplied: _appliedKey == preset.key,
                isBusy: _applyingKey == preset.key,
                onApply: _applyingKey == null ? () => _apply(preset) : null,
              ),
          ],
        ),
      ),
    );
  }
}

class _PresetCard extends StatelessWidget {
  final ThemePreset preset;
  final bool isApplied;
  final bool isBusy;
  final VoidCallback? onApply;

  const _PresetCard({
    required this.preset,
    required this.isApplied,
    required this.isBusy,
    required this.onApply,
  });

  Color _parse(String hex) =>
      Color(int.parse(hex.substring(1, 7), radix: 16) | 0xFF000000);

  @override
  Widget build(BuildContext context) {
    final primary = _parse(preset.primaryColor);
    final accent = _parse(preset.accentColor);

    return NeonPressable(
      skewAmount: -0.02,
      onTap: onApply,
      glowColor: accent.withValues(alpha: 0.4),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: SQColor.card,
          borderRadius: BorderRadius.circular(SQRadius.sm),
          border: Border.all(
            color: isApplied ? primary : SQColor.line,
            width: isApplied ? 1.6 : 1,
          ),
        ),
        child: Row(
          children: [
            // Palette preview chip
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [primary, accent],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(SQRadius.xs),
              ),
              child: const Icon(Icons.storefront_rounded,
                  color: Colors.white, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(preset.name,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: SQColor.ink)),
                      ),
                      if (isApplied) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: SQColor.lime,
                            borderRadius: BorderRadius.circular(SQRadius.pill),
                          ),
                          child: const Text('LIVE',
                              style: TextStyle(
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                  color: SQColor.ink)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(preset.saleTagText,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 11, color: SQColor.inkSoft)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (isBusy)
              const SizedBox(
                width: 20,
                height: 20,
                child:
                    CircularProgressIndicator(strokeWidth: 2, color: SQColor.green),
              )
            else if (!isApplied)
              const Icon(Icons.arrow_upward_rounded,
                  size: 16, color: SQColor.inkFaint),
          ],
        ),
      ),
    );
  }
}
