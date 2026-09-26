import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tokens.dart';

/// ─────────────────────────────────────────────────────────────────
/// NeonPressable — the signature interaction of the app.
///
/// On press the child simultaneously:
///   1. scales down to 0.96 (Apple press-in feel),
///   2. skews -0.05 rad (the "skew morphism"),
///   3. blooms a neon glow of [glowColor] beneath itself.
/// All three animate on one controller so the effect reads as a single
/// morph, not three separate animations.
/// ─────────────────────────────────────────────────────────────────
class NeonPressable extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final Color glowColor;
  final double scaleDown;
  final double skewAmount;

  const NeonPressable({
    super.key,
    required this.child,
    this.onTap,
    this.glowColor = SQColor.lime,
    this.scaleDown = 0.96,
    this.skewAmount = -0.05,
  });

  @override
  State<NeonPressable> createState() => _NeonPressableState();
}

class _NeonPressableState extends State<NeonPressable>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: SQMotion.fast,
    reverseDuration: SQMotion.base,
  );

  late final Animation<double> _t =
      CurvedAnimation(parent: _c, curve: SQMotion.curveOut);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  void _press(bool down) {
    if (widget.onTap == null) return;
    HapticFeedback.lightImpact();
    down ? _c.forward() : _c.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _press(true),
      onTapUp: (_) => _press(false),
      onTapCancel: () => _press(false),
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _t,
        builder: (context, child) {
          final glow = _t.value;
          final scale =
              1.0 - (1.0 - widget.scaleDown) * _t.value;
          final skew = widget.skewAmount * _t.value;
          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.diagonal3Values(scale, scale, 1.0)
              ..setEntry(0, 1, skew),
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(SQRadius.md),
                boxShadow: glow > 0.01
                    ? [
                        BoxShadow(
                          color: widget.glowColor.withValues(alpha: 0.45 * glow),
                          blurRadius: 26 * glow + 4,
                          spreadRadius: 1,
                        ),
                      ]
                    : const [],
              ),
              child: child,
            ),
          );
        },
        child: widget.child,
      ),
    );
  }
}

/// Primary button with the full neon skew-press morph.
class SQButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool loading;
  final bool destructive;
  final Color? color;
  final Color? textColor;
  final Color? glowColor;
  final double height;
  final IconData? icon;

  const SQButton({
    super.key,
    required this.label,
    this.onTap,
    this.loading = false,
    this.destructive = false,
    this.color,
    this.textColor,
    this.glowColor,
    this.height = 56,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final bg = color ?? (destructive ? SQColor.danger : SQColor.green);
    final fg = textColor ?? Colors.white;

    return NeonPressable(
      onTap: onTap,
      glowColor: glowColor ?? bg,
      child: Opacity(
        opacity: onTap == null ? 0.5 : 1,
        child: Container(
          height: height,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(SQRadius.md),
          ),
          child: loading
              ? SizedBox(
                  width: 22,
                  height: 22,
                  child:
                      CircularProgressIndicator(strokeWidth: 2.4, color: fg),
                )
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, size: 18, color: fg),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      label,
                      style: TextStyle(
                        fontFamily: 'Inter',
                        color: fg,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

/// ADD button that morphs into a stepper; both states carry the neon press.
class SQAddButton extends StatelessWidget {
  final int quantity;
  final VoidCallback onAdd;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  const SQAddButton({
    super.key,
    required this.quantity,
    required this.onAdd,
    required this.onIncrement,
    required this.onDecrement,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: SQMotion.base,
      switchInCurve: SQMotion.springy,
      switchOutCurve: SQMotion.curveOut,
      transitionBuilder: (child, animation) => ScaleTransition(
        scale: animation,
        child: child,
      ),
      child: quantity > 0
          ? Container(
              key: const ValueKey('stepper'),
              height: 36,
              decoration: BoxDecoration(
                color: SQColor.green,
                borderRadius: BorderRadius.circular(SQRadius.sm),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _Step(icon: Icons.remove_rounded, onTap: onDecrement),
                  SizedBox(
                    width: 26,
                    child: Text(
                      '$quantity',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'SpaceGrotesk',
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  _Step(icon: Icons.add_rounded, onTap: onIncrement),
                ],
              ),
            )
          : NeonPressable(
              key: const ValueKey('add'),
              onTap: onAdd,
              glowColor: SQColor.lime,
              child: Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: SQColor.lime,
                  borderRadius: BorderRadius.circular(SQRadius.sm),
                ),
                child: const Text(
                  'ADD',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    color: SQColor.ink,
                    fontWeight: FontWeight.w800,
                    fontSize: 12.5,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
            ),
    );
  }
}

class _Step extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _Step({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return NeonPressable(
      scaleDown: 0.8,
      skewAmount: 0,
      glowColor: Colors.white24,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Icon(icon, size: 17, color: Colors.white),
      ),
    );
  }
}

/// ─────────────────────────────────────────────────────────────────
/// HighlightText — marker-style highlighted text.
///
/// Wrap words in [text] with =word= to get a neon-lime marker swipe
/// behind them:  "Fresh =groceries= delivered =fast=."
/// The marker is drawn behind the glyphs with rounded ends.
/// ─────────────────────────────────────────────────────────────────
class HighlightText extends StatelessWidget {
  final String text;
  final TextStyle style;
  final Color highlightColor;
  final Color highlightTextColor;

  const HighlightText({
    super.key,
    required this.text,
    required this.style,
    this.highlightColor = SQColor.lime,
    this.highlightTextColor = SQColor.ink,
  });

  @override
  Widget build(BuildContext context) {
    final spans = <InlineSpan>[];
    final regex = RegExp(r'=([^=]+)=');
    int cursor = 0;

    for (final match in regex.allMatches(text)) {
      if (match.start > cursor) {
        spans.add(TextSpan(text: text.substring(cursor, match.start)));
      }
      spans.add(_MarkerSpan(
        color: highlightColor,
        textColor: highlightTextColor,
        child: TextSpan(text: match.group(1)),
      ));
      cursor = match.end;
    }
    if (cursor < text.length) {
      spans.add(TextSpan(text: text.substring(cursor)));
    }

    return RichText(
      text: TextSpan(style: style, children: spans),
    );
  }
}

class _MarkerSpan extends WidgetSpan {
  _MarkerSpan({
    required Color color,
    required Color textColor,
    required TextSpan child,
  }) : super(
          alignment: PlaceholderAlignment.middle,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(6),
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.4),
                  blurRadius: 10,
                ),
              ],
            ),
            child: Text.rich(
              TextSpan(
                style: child.style?.copyWith(
                  color: textColor,
                  fontWeight: FontWeight.w800,
                ),
                children: child.children,
              ),
            ),
          ),
        );
}

/// Section header with optional trailing action.
class SQSectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const SQSectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          SQSpace.md, SQSpace.lg, SQSpace.md, SQSpace.sm),
      child: Row(
        children: [
          Expanded(
            child: HighlightText(
              text: title.contains('·') ? '=${title.split('·')[0].trim()}= · ${title.split('·')[1].trim()}' : title,
              style: SQType.h2,
            ),
          ),
          if (actionLabel != null)
            NeonPressable(
              skewAmount: -0.03,
              onTap: onAction,
              glowColor: SQColor.lime,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  actionLabel!,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: SQColor.green,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Shimmering skeleton block.
class SQSkeleton extends StatefulWidget {
  final double width;
  final double height;
  final double radius;

  const SQSkeleton({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.radius = SQRadius.sm,
  });

  @override
  State<SQSkeleton> createState() => _SQSkeletonState();
}

class _SQSkeletonState extends State<SQSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1000),
  )..repeat(reverse: true);

  late final Animation<double> _opacity = Tween(begin: 0.5, end: 1.0)
      .animate(CurvedAnimation(parent: _c, curve: Curves.easeInOut));

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacity,
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: SQColor.line.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}

/// Card container — soft shadow instead of hard border (Apple-style depth).
class SQCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;

  const SQCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(SQSpace.md),
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return NeonPressable(
      onTap: onTap,
      glowColor: SQColor.lime.withValues(alpha: 0.3),
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          color: SQColor.card,
          borderRadius: BorderRadius.circular(SQRadius.md),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: child,
      ),
    );
  }
}

/// Minimal empty state.
class SQEmpty extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;

  const SQEmpty({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: SQColor.limeSoft,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 30, color: SQColor.greenDeep),
          ),
          const SizedBox(height: SQSpace.md),
          Text(title, style: SQType.h2, textAlign: TextAlign.center),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              style: SQType.caption,
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}
