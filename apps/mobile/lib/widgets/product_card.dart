import 'dart:io';

import 'package:flutter/material.dart';

import '../cart_store.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

/// Blinkit-class product card.
///
/// Layout mirrors the Blinkit reference screenshots: image block on top with
/// the ADD/stepper button OVERLAID on its bottom-right corner, then unit →
/// title → price row. Price and button never share a row, so nothing can
/// overflow or clip on narrow phones.
class ProductCard extends StatelessWidget {
  final Map<String, dynamic> product;
  final CartStore cart;
  final Color primary;

  const ProductCard({
    super.key,
    required this.product,
    required this.cart,
    required this.primary,
  });

  bool get _isOutOfStock {
    final available = product['isAvailable'];
    final stock = (product['stockCount'] ?? 0) as num;
    return available == false || stock <= 0;
  }

  @override
  Widget build(BuildContext context) {
    final title = (product['title'] ?? '') as String;
    final mrp = ((product['mrp'] ?? 0) as num).toDouble();
    final salePrice = ((product['salePrice'] ?? mrp) as num).toDouble();
    final unit = (product['unitQuantity'] ?? '') as String;
    final discount =
        mrp > salePrice ? (((mrp - salePrice) / mrp) * 100).round() : 0;
    final imageUrl = (product['imageUrl'] ?? '') as String;

    return GestureDetector(
      onTap: () => _openDetail(context),
      child: Container(
        width: 152,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: SQColor.card,
          borderRadius: BorderRadius.circular(SQRadius.md),
          border: Border.all(color: SQColor.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Image block with badges + overlaid ADD button ──
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: _ProductImage(imageUrl: imageUrl, title: title),
                ),
                if (discount > 0)
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: SQColor.lime,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '$discount% OFF',
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: SQColor.ink,
                        ),
                      ),
                    ),
                  ),
                // ADD / stepper pinned to the image's bottom-right — the
                // Blinkit pattern. Sits on a white disc so it reads on any
                // product photo.
                Positioned(
                  right: 6,
                  bottom: 6,
                  child: _isOutOfStock
                      ? const SizedBox.shrink()
                      : AnimatedBuilder(
                          animation: cart,
                          builder: (context, _) {
                            final qty =
                                cart.quantityOf(product['id'] as String);
                            return qty == 0
                                ? _AddDisc(onTap: () => cart.add(product))
                                : _StepperDisc(
                                    qty: qty,
                                    onIncrement: () => cart
                                        .increment(product['id'] as String),
                                    onDecrement: () => cart
                                        .decrement(product['id'] as String),
                                  );
                          },
                        ),
                ),
              ],
            ),

            // ── Details: unit → title → price (no button here) ──
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 7, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (unit.isNotEmpty)
                    Text(
                      unit,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                        color: SQColor.inkFaint,
                      ),
                    ),
                  const SizedBox(height: 3),
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: SQColor.ink,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 6),
                  // Price row — FittedBox guarantees no overflow even on the
                  // narrowest cards.
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      children: [
                        Text(
                          '₹${salePrice.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: SQColor.ink,
                          ),
                        ),
                        if (mrp > salePrice) ...[
                          const SizedBox(width: 5),
                          Text(
                            '₹${mrp.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 10,
                              color: SQColor.inkFaint,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProductDetailSheet(
        product: product,
        cart: cart,
        primary: primary,
      ),
    );
  }
}

/// Circular lime ADD button with a white ring — sits on product photos.
class _AddDisc extends StatelessWidget {
  final VoidCallback onTap;

  const _AddDisc({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return NeonPressable(
      onTap: onTap,
      glowColor: SQColor.lime,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: SQColor.lime,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2.5),
        ),
        child: const Icon(Icons.add_rounded, color: SQColor.ink, size: 22),
      ),
    );
  }
}

/// Stepper variant: qty between +/−, still a compact disc.
class _StepperDisc extends StatelessWidget {
  final int qty;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  const _StepperDisc({
    required this.qty,
    required this.onIncrement,
    required this.onDecrement,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 2),
      decoration: BoxDecoration(
        color: SQColor.green,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          NeonPressable(
            scaleDown: 0.8,
            skewAmount: 0,
            glowColor: Colors.white24,
            onTap: onDecrement,
            child: const SizedBox(
              width: 28,
              height: 36,
              child: Icon(Icons.remove_rounded,
                  color: Colors.white, size: 16),
            ),
          ),
          Text('$qty',
              style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 13)),
          NeonPressable(
            scaleDown: 0.8,
            skewAmount: 0,
            glowColor: Colors.white24,
            onTap: onIncrement,
            child: const SizedBox(
              width: 28,
              height: 36,
              child: Icon(Icons.add_rounded, color: Colors.white, size: 16),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductImage extends StatelessWidget {
  final String imageUrl;
  final String title;

  const _ProductImage({required this.imageUrl, required this.title});

  @override
  Widget build(BuildContext context) {
    if (imageUrl.isEmpty) return _FallbackLetter(title: title);
    Widget image;
    if (imageUrl.startsWith('http')) {
      image = Image.network(
        imageUrl,
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) => _FallbackLetter(title: title),
      );
    } else {
      image = Image.file(
        File(imageUrl),
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) => _FallbackLetter(title: title),
      );
    }
    return Container(color: SQColor.fog, child: image);
  }
}

class _FallbackLetter extends StatelessWidget {
  final String title;
  const _FallbackLetter({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: SQColor.fog,
      alignment: Alignment.center,
      child: Text(
        title.isNotEmpty ? title.substring(0, 2).toUpperCase() : '?',
        style: const TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: SQColor.green,
        ),
      ),
    );
  }
}

class _ProductDetailSheet extends StatelessWidget {
  final Map<String, dynamic> product;
  final CartStore cart;
  final Color primary;

  const _ProductDetailSheet({
    required this.product,
    required this.cart,
    required this.primary,
  });

  @override
  Widget build(BuildContext context) {
    final title = (product['title'] ?? '') as String;
    final description = (product['description'] ?? '') as String;
    final mrp = ((product['mrp'] ?? 0) as num).toDouble();
    final salePrice = ((product['salePrice'] ?? mrp) as num).toDouble();
    final unit = (product['unitQuantity'] ?? '') as String;

    return Container(
      decoration: const BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.vertical(top: Radius.circular(SQRadius.lg)),
      ),
      padding: const EdgeInsets.fromLTRB(
          SQSpace.lg, 12, SQSpace.lg, SQSpace.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: SQColor.line,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: SQSpace.lg),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(SQRadius.md),
                child: SizedBox(
                  width: 96,
                  height: 96,
                  child: _ProductImage(
                      imageUrl: product['imageUrl'] ?? '', title: title),
                ),
              ),
              const SizedBox(width: SQSpace.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: SQType.h2),
                    if (unit.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(unit, style: SQType.caption),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text('₹${salePrice.toStringAsFixed(0)}',
                            style: SQType.h1),
                        if (mrp > salePrice) ...[
                          const SizedBox(width: 8),
                          Text(
                            '₹${mrp.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFFA8A29B),
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (description.isNotEmpty) ...[
            const SizedBox(height: SQSpace.md),
            Text(
              description,
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
              style: SQType.body,
            ),
          ],
          const SizedBox(height: SQSpace.lg),
          AnimatedBuilder(
            animation: cart,
            builder: (context, _) => Row(
              children: [
                Expanded(
                  child: SQAddButton(
                    quantity: cart.quantityOf(product['id'] as String),
                    onAdd: () => cart.add(product),
                    onIncrement: () =>
                        cart.increment(product['id'] as String),
                    onDecrement: () =>
                        cart.decrement(product['id'] as String),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
