import 'package:flutter/material.dart';

import '../api_client.dart';
import '../cart_store.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../widgets/pressable.dart';

/// Blinkit-style two-pane aisle explorer: sticky parent rail on the left,
/// products on the right.
///
/// WHY client-side filtering: the public `/api/products` endpoint resolves
/// `categoryId` against SUB-category ids only — filtering by a parent slug
/// that has no subcategories (e.g. Beverages) returns an empty list. So we
/// fetch the full catalog once (the home tab already does exactly this) and
/// filter locally: a product belongs to the selected parent when its
/// category id/slug matches the parent OR one of its subcategories.
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
  String? _selectedSubId; // null = whole parent aisle
  final _api = ApiClient.instance;
  final _searchController = TextEditingController();

  List<dynamic> _all = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Map<String, dynamic> get _currentParent => widget.categories.isNotEmpty
      ? widget.categories[_selectedParent.clamp(0, widget.categories.length - 1)]
          as Map<String, dynamic>
      : const {};

  Future<void> _loadProducts({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      // Full catalog, one request — filtered locally below.
      final products = await _api.fetchProducts();
      if (!mounted) return;
      setState(() {
        _all = products;
        _loading = false;
        _error = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Could not load products. Pull to retry.';
      });
    }
  }

  List<dynamic> get _filtered {
    final parent = _currentParent;
    final parentId = parent['id'] as String?;
    final parentSlug = parent['slug'] as String?;
    final subs = (parent['subCategories'] as List?) ?? const [];
    final subIds = subs.map((s) => (s as Map)['id'] as String).toSet();

    bool inParent(dynamic p) {
      final c = p['category'];
      if (c is! Map) return false;
      final cid = c['id'] as String?;
      final cslug = c['slug'] as String?;
      return cid == parentId || cslug == parentSlug || subIds.contains(cid);
    }

    Iterable<dynamic> result = _all.where(inParent);

    // Subcategory chip narrows further.
    if (_selectedSubId != null) {
      result = result.where((p) {
        final c = p['category'];
        return c is Map && c['id'] == _selectedSubId;
      });
    }

    // Search narrows across the whole catalog (not just this aisle).
    final q = _searchController.text.trim().toLowerCase();
    if (q.isNotEmpty) {
      result = _all.where((p) =>
          (p['title'] as String? ?? '').toLowerCase().contains(q));
    }
    return result.toList();
  }

  List<dynamic> get _currentSubs =>
      ((_currentParent['subCategories'] as List?) ?? const [])
          .where((s) => _all.any((p) =>
              p['category'] is Map &&
              p['category']['id'] == (s as Map)['id']))
          .toList();

  @override
  Widget build(BuildContext context) {
    if (widget.categories.isEmpty) {
      return const Scaffold(
        body: SafeArea(child: Center(child: Text('No aisles available yet'))),
      );
    }

    return Scaffold(
      backgroundColor: SQColor.fog,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // ── Header + search ──
            Padding(
              padding:
                  const EdgeInsets.fromLTRB(SQSpace.md, SQSpace.sm, SQSpace.md, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text('All Aisles',
                        style: SQType.display.copyWith(fontSize: 24)),
                  ),
                  NeonPressable(
                    scaleDown: 0.88,
                    skewAmount: -0.03,
                    onTap: () => _loadProducts(),
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: SQColor.card,
                        borderRadius: BorderRadius.circular(SQRadius.sm),
                        border: Border.all(color: SQColor.line),
                      ),
                      child: const Icon(Icons.refresh_rounded,
                          color: SQColor.green, size: 20),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding:
                  const EdgeInsets.fromLTRB(SQSpace.md, 0, SQSpace.md, 8),
              child: TextField(
                controller: _searchController,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: 'Search the full catalog...',
                  prefixIcon:
                      const Icon(Icons.search_rounded, color: SQColor.green),
                  isDense: true,
                  suffixIcon: _searchController.text.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.close_rounded,
                              size: 18, color: SQColor.inkFaint),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {});
                          },
                        ),
                ),
              ),
            ),

            // ── Two-pane body ──
            Expanded(
              child: _loading
                  ? _AislesSkeleton()
                  : _error != null
                      ? RefreshIndicator(
                          onRefresh: () => _loadProducts(),
                          color: widget.primary,
                          child: ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: [
                              const SizedBox(height: 100),
                              SQEmpty(
                                icon: Icons.wifi_off_rounded,
                                title: 'Could not load aisles',
                                subtitle: _error,
                              ),
                            ],
                          ),
                        )
                      : Row(
                          children: [
                            _buildParentRail(),
                            Expanded(child: _buildProductPane()),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildParentRail() {
    return Container(
      width: 132,
      color: SQColor.card,
      child: ListView.builder(
        itemCount: widget.categories.length,
        itemBuilder: (context, i) {
          final cat = widget.categories[i] as Map<String, dynamic>;
          final selected = i == _selectedParent;
          return InkWell(
            onTap: () {
              setState(() {
                _selectedParent = i;
                _selectedSubId = null;
              });
            },
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
              decoration: BoxDecoration(
                color: selected ? SQColor.fog : Colors.transparent,
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
                  fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                  color: selected ? SQColor.ink : SQColor.inkSoft,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProductPane() {
    final products = _filtered;
    final subs = _currentSubs;
    final query = _searchController.text.trim();

    return RefreshIndicator(
      onRefresh: () => _loadProducts(),
      color: widget.primary,
      child: products.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(SQSpace.lg),
              children: [
                const SizedBox(height: 60),
                SQEmpty(
                  icon: query.isNotEmpty
                      ? Icons.search_off_rounded
                      : Icons.inventory_2_outlined,
                  title: query.isNotEmpty
                      ? 'Nothing matches "$query"'
                      : 'This aisle is empty',
                  subtitle: query.isNotEmpty
                      ? 'Try a different spelling or browse the aisles.'
                      : 'Products will appear here as soon as the store adds them.',
                ),
              ],
            )
          : GridView.builder(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, SQSpace.xl),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.68,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
              ),
              itemCount: products.length + (subs.isEmpty ? 0 : 1),
              itemBuilder: (context, i) {
                // First cell: subcategory chips when this parent has them.
                if (subs.isNotEmpty && i == 0) {
                  return _SubcategoryCard(
                    subs: subs,
                    selectedSubId: _selectedSubId,
                    onSelect: (id) => setState(() {
                      _selectedSubId =
                          _selectedSubId == id ? null : id;
                    }),
                    primary: widget.primary,
                  );
                }
                final index = subs.isNotEmpty ? i - 1 : i;
                return _AisleProductTile(
                  product: products[index] as Map<String, dynamic>,
                  cart: widget.cart,
                  primary: widget.primary,
                  accent: widget.accent,
                );
              },
            ),
    );
  }
}

/// Spanning card holding the subcategory chips for the current parent.
class _SubcategoryCard extends StatelessWidget {
  final List<dynamic> subs;
  final String? selectedSubId;
  final ValueChanged<String> onSelect;
  final Color primary;

  const _SubcategoryCard({
    required this.subs,
    required this.selectedSubId,
    required this.onSelect,
    required this.primary,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.circular(SQRadius.sm),
        border: Border.all(color: SQColor.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Refine', style: SQType.micro),
          const SizedBox(height: 6),
          Expanded(
            child: SingleChildScrollView(
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final s in subs)
                    GestureDetector(
                      onTap: () => onSelect((s as Map)['id'] as String),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: selectedSubId == s['id']
                              ? SQColor.lime
                              : SQColor.fog,
                          borderRadius: BorderRadius.circular(SQRadius.xs),
                          border: Border.all(
                            color: selectedSubId == s['id']
                                ? SQColor.green
                                : SQColor.line,
                          ),
                        ),
                        child: Text(
                          (s['name'] ?? '') as String,
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: selectedSubId == s['id']
                                ? SQColor.greenDeep
                                : SQColor.inkSoft,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AislesSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 132,
          color: SQColor.card,
          padding: const EdgeInsets.all(SQSpace.md),
          child: Column(
            children: [
              for (int i = 0; i < 6; i++)
                const Padding(
                  padding: EdgeInsets.only(bottom: 16),
                  child: SQSkeleton(height: 14, radius: 6),
                ),
            ],
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(12),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.68,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
            ),
            itemCount: 6,
            itemBuilder: (_, _) => const SQSkeleton(
                height: 220, radius: SQRadius.sm),
          ),
        ),
      ],
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
    final unit = (product['unitQuantity'] ?? '') as String;
    final discount =
        mrp > salePrice ? (((mrp - salePrice) / mrp) * 100).round() : 0;
    final isOut = product['isAvailable'] == false ||
        ((product['stockCount'] ?? 0) as num) <= 0;

    return Container(
      decoration: BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.circular(SQRadius.sm),
        border: Border.all(color: SQColor.line),
      ),
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Stack(
              children: [
                Center(
                  child: imageUrl.startsWith('http')
                      ? Image.network(
                          imageUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (_, _, _) => const Icon(
                              Icons.image_outlined,
                              size: 40,
                              color: Color(0xFFCBD5E1)),
                        )
                      : const Icon(Icons.image_outlined,
                          size: 40, color: Color(0xFFCBD5E1)),
                ),
                if (discount > 0)
                  Positioned(
                    top: 0,
                    left: 0,
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
                            color: SQColor.ink),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          if (unit.isNotEmpty)
            Text(unit,
                style: const TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: SQColor.inkFaint)),
          Text(
            title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: SQColor.ink,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text(
                '₹${salePrice.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: SQColor.ink,
                ),
              ),
              if (mrp > salePrice) ...[
                const SizedBox(width: 6),
                Text(
                  '₹${mrp.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 10,
                    color: SQColor.inkFaint,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
              ],
              const Spacer(),
              isOut
                  ? Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: SQColor.fog,
                        borderRadius: BorderRadius.circular(SQRadius.xs),
                      ),
                      child: const Text(
                        'OUT',
                        style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                            color: SQColor.inkFaint),
                      ),
                    )
                  : AnimatedBuilder(
                      animation: cart,
                      builder: (context, _) {
                        final qty =
                            cart.quantityOf(product['id'] as String);
                        if (qty == 0) {
                          return Pressable(
                            onTap: () => cart.add(product),
                            child: Container(
                              width: 34,
                              height: 34,
                              decoration: BoxDecoration(
                                color: SQColor.lime,
                                borderRadius:
                                    BorderRadius.circular(SQRadius.xs),
                              ),
                              child: const Icon(Icons.add_rounded,
                                  color: SQColor.ink, size: 19),
                            ),
                          );
                        }
                        return Container(
                          height: 34,
                          decoration: BoxDecoration(
                            color: SQColor.green,
                            borderRadius:
                                BorderRadius.circular(SQRadius.xs),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Pressable(
                                scaleDown: 0.8,
                                onTap: () => cart
                                    .decrement(product['id'] as String),
                                child: const SizedBox(
                                  width: 30,
                                  height: 34,
                                  child: Icon(Icons.remove_rounded,
                                      color: Colors.white, size: 16),
                                ),
                              ),
                              Text('\$qty',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13)),
                              Pressable(
                                scaleDown: 0.8,
                                onTap: () => cart
                                    .increment(product['id'] as String),
                                child: const SizedBox(
                                  width: 30,
                                  height: 34,
                                  child: Icon(Icons.add_rounded,
                                      color: Colors.white, size: 16),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ],
          ),
        ],
      ),
    );
  }
}
