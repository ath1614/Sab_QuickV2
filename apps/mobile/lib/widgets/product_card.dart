import 'dart:io';

import 'package:flutter/material.dart';

import '../cart_store.dart';
import 'pressable.dart';

/// Blinkit-style product card: image, unit pill, title, price/MRP and the
/// animated ADD -> stepper morph. Opens the detail sheet on tap.
class ProductCard extends StatelessWidget {
  final Map<String, dynamic> product;
  final CartStore cart;
  final Color primary;
  final Color accent;

  const ProductCard({
    super.key,
    required this.product,
    required this.cart,
    required this.primary,
    required this.accent,
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

    return Pressable(
      onTap: () => _openDetail(context),
      child: Container(
        width: 150,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE8EDF2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image block with discount + speed chips
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(16)),
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
                        color: accent,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '$discount% OFF',
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: Colors.black,
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
                      color: Colors.white.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.bolt, size: 10, color: primary),
                        const Text(
                          '10 MINS',
                          style: TextStyle(
                            fontSize: 8,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
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
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        unit,
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF475569),
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
                      color: Color(0xFF0F172A),
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
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: kSurfaceDarkColor,
                              ),
                            ),
                            if (mrp > salePrice)
                              Text(
                                '₹${mrp.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: Color(0xFF94A3B8),
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                          ],
                        ),
                      ),
                      _isOutOfStock
                          ? Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Text(
                                'OUT',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                            )
                          : AnimatedBuilder(
                              animation: cart,
                              builder: (context, _) => AddToCartButton(
                                quantity:
                                    cart.quantityOf(product['id'] as String),
                                onAdd: () => cart.add(product),
                                onIncrement: () =>
                                    cart.increment(product['id'] as String),
                                onDecrement: () =>
                                    cart.decrement(product['id'] as String),
                                primary: primary,
                                accent: accent,
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
        accent: accent,
      ),
    );
  }
}

Color get kSurfaceDarkColor => const Color(0xFF0F172A);

class _ProductImage extends StatelessWidget {
  final String imageUrl;
  final String title;

  const _ProductImage({required this.imageUrl, required this.title});

  @override
  Widget build(BuildContext context) {
    if (imageUrl.isEmpty) {
      return _FallbackLetter(title: title);
    }
    final isRemote = imageUrl.startsWith('http');
    final file = File(imageUrl);
    final image = isRemote
        ? Image.network(
            imageUrl,
            fit: BoxFit.contain,
            errorBuilder: (_, _, _) => _FallbackLetter(title: title),
          )
        : Image.file(
            file,
            fit: BoxFit.contain,
            errorBuilder: (_, _, _) => _FallbackLetter(title: title),
          );
    return image;
  }
}

class _FallbackLetter extends StatelessWidget {
  final String title;
  const _FallbackLetter({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF1F5F9),
      alignment: Alignment.center,
      child: Text(
        title.isNotEmpty ? title.substring(0, 2).toUpperCase() : '?',
        style: const TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w900,
          color: Color(0xFF0B6E4F),
        ),
      ),
    );
  }
}

class _ProductDetailSheet extends StatelessWidget {
  final Map<String, dynamic> product;
  final CartStore cart;
  final Color primary;
  final Color accent;

  const _ProductDetailSheet({
    required this.product,
    required this.cart,
    required this.primary,
    required this.accent,
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
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: SizedBox(
                  width: 96,
                  height: 96,
                  child: _ProductImage(imageUrl: product['imageUrl'] ?? '', title: title),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    if (unit.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        unit,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF475569),
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          '₹${salePrice.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        if (mrp > salePrice) ...[
                          const SizedBox(width: 8),
                          Text(
                            '₹${mrp.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF94A3B8),
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
            const SizedBox(height: 14),
            Text(
              description,
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                height: 1.5,
                color: Color(0xFF475569),
              ),
            ),
          ],
          const SizedBox(height: 18),
          AnimatedBuilder(
            animation: cart,
            builder: (context, _) => AddToCartButton(
              quantity: cart.quantityOf(product['id'] as String),
              onAdd: () => cart.add(product),
              onIncrement: () => cart.increment(product['id'] as String),
              onDecrement: () => cart.decrement(product['id'] as String),
              primary: primary,
              accent: accent,
            ),
          ),
        ],
      ),
    );
  }
}
