import 'dart:io';

import 'package:flutter/material.dart';

import '../cart_store.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

/// Blinkit-class product card: brand imagery, discount chip, speed chip,
/// unit pill, and the springy ADD → stepper morph.
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
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: SQColor.card,
          borderRadius: BorderRadius.circular(SQRadius.md),
          border: Border.all(color: SQColor.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(SQRadius.md)),
                    child: _ProductImage(imageUrl: imageUrl, title: title),
                  ),
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
                          fontWeight: FontWeight.w900,
                          color: SQColor.ink,
                        ),
                      ),
                    ),
                  ),
                Positioned(
                  bottom: 6,
                  left: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: SQColor.ink.withValues(alpha: 0.85),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.bolt_rounded, size: 10, color: SQColor.lime),
                        SizedBox(width: 2),
                        Text(
                          '10 MINS',
                          style: TextStyle(
                            fontSize: 8,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (unit.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: SQColor.fog,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        unit,
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: SQColor.inkSoft,
                        ),
                      ),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: SQColor.ink,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '₹${salePrice.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: SQColor.ink,
                              ),
                            ),
                            if (mrp > salePrice)
                              Text(
                                '₹${mrp.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: Color(0xFFA8A29B),
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                          ],
                        ),
                      ),
                      _isOutOfStock
                          ? Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 9),
                              decoration: BoxDecoration(
                                color: SQColor.fog,
                                borderRadius:
                                    BorderRadius.circular(SQRadius.sm),
                              ),
                              child: const Text(
                                'OUT',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFFA8A29B),
                                ),
                              ),
                            )
                          : AnimatedBuilder(
                              animation: cart,
                              builder: (context, _) => SQAddButton(
                                quantity:
                                    cart.quantityOf(product['id'] as String),
                                onAdd: () => cart.add(product),
                                onIncrement: () =>
                                    cart.increment(product['id'] as String),
                                onDecrement: () =>
                                    cart.decrement(product['id'] as String),
                              ),
                            ),
                    ],
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
          fontWeight: FontWeight.w900,
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
