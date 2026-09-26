import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tokens.dart';

/// Primary filled button with springy press-scale + haptic.
class SQButton extends StatefulWidget {
  final String label;
  final VoidCallback? onTap;
  final bool loading;
  final bool destructive;
  final Color? color;
  final Color? textColor;
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
    this.height = 54,
    this.icon,
  });

  @override
  State<SQButton> createState() => _SQButtonState();
}

class _SQButtonState extends State<SQButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final bg = widget.color ??
        (widget.destructive ? SQColor.danger : SQColor.green);
    final fg = widget.textColor ?? Colors.white;

    return GestureDetector(
      onTapDown: (_) => widget.onTap != null ? setState(() => _pressed = true) : null,
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.onTap == null
          ? null
          : () {
              HapticFeedback.mediumImpact();
              widget.onTap!();
            },
      child: AnimatedScale(
        scale: _pressed ? 0.96 : 1,
        duration: SQMotion.fast,
        curve: SQMotion.curveOut,
        child: AnimatedOpacity(
          opacity: widget.onTap == null ? 0.55 : 1,
          duration: SQMotion.fast,
          child: Container(
            height: widget.height,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(SQRadius.md),
              boxShadow: widget.onTap == null
                  ? null
                  : [
                      BoxShadow(
                        color: bg.withValues(alpha: 0.35),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
            ),
            child: widget.loading
                ? SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                        strokeWidth: 2.4, color: fg),
                  )
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (widget.icon != null) ...[
                        Icon(widget.icon, size: 18, color: fg),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        widget.label,
                        style: TextStyle(
                          color: fg,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

/// ADD button that morphs into a stepper with a springy scale transition.
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
                  _Step(icon: Icons.remove, onTap: onDecrement),
                  SizedBox(
                    width: 26,
                    child: Text(
                      '$quantity',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 13.5),
                    ),
                  ),
                  _Step(icon: Icons.add, onTap: onIncrement),
                ],
              ),
            )
          : GestureDetector(
              key: const ValueKey('add'),
              onTap: () {
                HapticFeedback.selectionClick();
                onAdd();
              },
              child: Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: SQColor.lime,
                  borderRadius: BorderRadius.circular(SQRadius.sm),
                  boxShadow: [
                    BoxShadow(
                      color: SQColor.lime.withValues(alpha: 0.45),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Text(
                  'ADD',
                  style: TextStyle(
                    color: SQColor.ink,
                    fontWeight: FontWeight.w900,
                    fontSize: 12.5,
                    letterSpacing: 1.1,
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
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Icon(icon, size: 17, color: Colors.white),
      ),
    );
  }
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
            child: Text(title, style: SQType.h2),
          ),
          if (actionLabel != null)
            GestureDetector(
              onTap: onAction,
              child: Text(
                actionLabel!,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: SQColor.green,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Shimmering skeleton block (pulsing opacity — cheap and smooth).
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
          color: SQColor.line.withValues(alpha: 0.55),
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}

/// Card container used across every screen.
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
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          color: SQColor.card,
          borderRadius: BorderRadius.circular(SQRadius.md),
          border: Border.all(color: SQColor.line),
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
            decoration: const BoxDecoration(
              color: SQColor.fog,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 30, color: SQColor.inkSoft),
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
