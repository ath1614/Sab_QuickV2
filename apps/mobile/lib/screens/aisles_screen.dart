import 'package:flutter/material.dart';

import '../api_client.dart';
import '../cart_store.dart';
import '../widgets/pressable.dart';

/// Blinkit-style two-pane aisle explorer: sticky parent rail on the left,
/// subcategory tiles on the right. Tap a parent to filter the product list.
class AislesScreen extends StatefulWidget {
  final List<dynamic> categories;
  final Color primary;
  final Color accent;
  final CartStore cart;
  final VoidCallback onNavigateToProducts;

  const AislesScreen({
    super.key,
    required this.categories,
    required this.primary,
    required this.accent,
    required this.cart,
    required this.onNavigateToProducts,
  });

  @override
  State<AislesScreen> createState() => _AislesScreenState();
}

class _AislesScreenState extends State<AislesScreen> {
  int _selectedParent = 0;
  final _api = ApiClient.instance;
  List<dynamic> _filtered = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Map<String, dynamic> get _currentParent =>
      widget.categories.isNotEmpty
          ? widget.categories[_selectedParent.clamp(0, widget.categories.length - 1)]
              as Map<String, dynamic>
          : const {};

  Future<void> _loadProducts() async {
    if (widget.categories.isEmpty) return;
    setState(() => _loading = true);
    final parent = _currentParent;
    final slug = (parent['slug'] ?? '') as String;
    final products = await _api.fetchProducts(categoryId: slug);
    if (!mounted) return;
    setState(() {
      _filtered = products;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.categories.isEmpty) {
      return const Scaffold(
        body: Center(child: Text('No aisles available yet')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('All Aisles')),
      body: Row(
        children: [
          // Parent rail
          Container(
            width: 130,
            color: const Color(0xFFF1F5F9),
            child: ListView.builder(
              itemCount: widget.categories.length,
              itemBuilder: (context, i) {
                final cat = widget.categories[i] as Map<String, dynamic>;
                final selected = i == _selectedParent;
                return InkWell(
                  onTap: () {
                    setState(() => _selectedParent = i);
                    _loadProducts();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 14),
                    decoration: BoxDecoration(
                      color: selected ? Colors.white : Colors.transparent,
                      border: Border(
                        left: BorderSide(
                          color: selected ? widget.primary : Colors.transparent,
                          width: 3,
                        ),
                      ),
                    ),
                    child: Text(
                      (cat['name'] ?? '') as String,
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight:
                            selected ? FontWeight.w900 : FontWeight.w600,
                        color: selected
                            ? const Color(0xFF0F172A)
                            : const Color(0xFF475569),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Subcategory tiles + products
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _loadProducts,
                    color: widget.primary,
                    child: GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.72,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                      ),
                      itemCount: _filtered.length,
                      itemBuilder: (context, i) => _AisleProductTile(
                        product: _filtered[i] as Map<String, dynamic>,
                        cart: widget.cart,
                        primary: widget.primary,
                        accent: widget.accent,
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _AisleProductTile extends StatelessWidget {
  final Map<String, dynamic> product;
  final CartStore cart;
  final Color primary;
  final Color accent;

  const _AisleProductTile({
    required this.product,
    required this.cart,
    required this.primary,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final title = (product['title'] ?? '') as String;
    final salePrice = ((product['salePrice'] ?? 0) as num).toDouble();
    final mrp = ((product['mrp'] ?? 0) as num).toDouble();
    final imageUrl = (product['imageUrl'] ?? '') as String;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8EDF2)),
      ),
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Center(
              child: imageUrl.startsWith('http')
                  ? Image.network(
                      imageUrl,
                      fit: BoxFit.contain,
                      errorBuilder: (_, _, _) =>
                          const Icon(Icons.image_outlined, size: 40, color: Color(0xFFCBD5E1)),
                    )
                  : const Icon(Icons.image_outlined, size: 40, color: Color(0xFFCBD5E1)),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text(
                '₹${salePrice.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                ),
              ),
              if (mrp > salePrice) ...[
                const SizedBox(width: 6),
                Text(
                  '₹${mrp.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF94A3B8),
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
              ],
              const Spacer(),
              Pressable(
                onTap: () => cart.add(product),
                child: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: primary,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: const Icon(Icons.add, color: Colors.white, size: 18),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
