import 'package:flutter/material.dart';

import '../api_client.dart';
import '../cart_store.dart';
import '../design/status_bar.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../widgets/pressable.dart';

/// Blinkit-style aisle explorer: parent rail on the left, a horizontal
/// subcategory-chip row above a clean 2-column product grid on the right.
///
/// WHY client-side filtering: the public `/api/products` endpoint resolves
/// `categoryId` against SUB-category ids only — filtering by a parent slug
/// that has no subcategories (e.g. Beverages) returns an empty list. So we
/// fetch the full catalog once (home already does) and filter locally.
///
/// [initialCategorySlug] lets Home deep-link straight into an aisle.
class AislesScreen extends StatefulWidget {
  final List<dynamic> categories;
  final Color primary;
  final Color accent;
  final CartStore cart;
  final VoidCallback onNavigateToProducts;
  final String? initialCategorySlug;

  const AislesScreen({
    super.key,
    required this.categories,
    required this.primary,
    required this.accent,
    required this.cart,
    required this.onNavigateToProducts,
    this.initialCategorySlug,
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
    StatusBar.darkIcons();
    if (widget.initialCategorySlug != null) {
      final idx = widget.categories
          .indexWhere((c) => (c as Map)['slug'] == widget.initialCategorySlug);
      if (idx >= 0) _selectedParent = idx;
    }
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

    if (_selectedSubId != null) {
      result = result.where((p) {
        final c = p['category'];
        return c is Map && c['id'] == _selectedSubId;
      });
    }

    final q = _searchController.text.trim().toLowerCase();
    if (q.isNotEmpty) {
      result = _all.where(
          (p) => (p['title'] as String? ?? '').toLowerCase().contains(q));
    }
    return result.toList();
  }

  /// Subcategories that actually contain products (chips row).
  List<Map<String, dynamic>> get _currentSubs {
    final subs = ((_currentParent['subCategories'] as List?) ?? const [])
        .cast<Map<String, dynamic>>();
    return subs
        .where((s) =>
            _all.any((p) => p['category'] is Map && p['category']['id'] == s['id']))
        .toList();
  }

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
              padding: const EdgeInsets.fromLTRB(SQSpace.md, 0, SQSpace.md, 8),
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
      width: 118,
      color: SQColor.card,
      child: ListView.builder(
        itemCount: widget.categories.length,
        itemBuilder: (context, i) {
          final cat = widget.categories[i] as Map<String, dynamic>;
          final selected = i == _selectedParent;
          final imageUrl = (cat['imageUrl'] ?? '') as String? ?? '';
          return InkWell(
            onTap: () {
              setState(() {
                _selectedParent = i;
                _selectedSubId = null;
              });
            },
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
              decoration: BoxDecoration(
                color: selected ? SQColor.fog : Colors.transparent,
                border: Border(
                  left: BorderSide(
                    color: selected ? widget.primary : Colors.transparent,
                    width: 3,
                  ),
                ),
              ),
              child: Column(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: selected
                          ? widget.primary.withValues(alpha: 0.1)
                          : SQColor.fog,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: selected ? widget.primary : SQColor.line,
                      ),
                      image: imageUrl.startsWith('http')
                          ? DecorationImage(
                              image: NetworkImage(imageUrl),
                              fit: BoxFit.cover,
                              onError: (_, _) {},
                            )
                          : null,
                    ),
                    child: imageUrl.startsWith('http')
                        ? null
                        : Icon(Icons.storefront_rounded,
                            color: widget.primary, size: 18),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    (cat['name'] ?? '') as String,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                      color: selected ? SQColor.ink : SQColor.inkSoft,
                      height: 1.15,
                    ),
                  ),
                ],
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
          : CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // Subcategory chips ABOVE the grid (Blinkit pattern) — the
                // old "Refine" grid cell broke the column rhythm and is gone.
                if (subs.isNotEmpty)
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 46,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.fromLTRB(12, 4, 12, 6),
                        itemCount: subs.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 8),
                        itemBuilder: (context, i) {
                          final sub = subs[i];
                          final selected = _selectedSubId == sub['id'];
                          return Pressable(
                            onTap: () => setState(() {
                              _selectedSubId =
                                  _selectedSubId == sub['id'] ? null : sub['id'] as String;
                            }),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: selected
                                    ? SQColor.green
                                    : SQColor.card,
                                borderRadius:
                                    BorderRadius.circular(SQRadius.pill),
                                border: Border.all(
                                  color: selected
                                      ? SQColor.green
                                      : SQColor.line,
                                ),
                              ),
                              child: Text(
                                (sub['name'] ?? '') as String,
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w800,
                                  color: selected
                                      ? Colors.white
                                      : SQColor.inkSoft,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(12, 2, 12, SQSpace.xl),
                  sliver: SliverGrid(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      mainAxisExtent: 246,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, i) => _AisleProductCard(
                        product: products[i] as Map<String, dynamic>,
                        cart: widget.cart,
                        primary: widget.primary,
                      ),
                      childCount: products.length,
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
          width: 118,
          color: SQColor.card,
          padding: const EdgeInsets.all(SQSpace.md),
          child: Column(
            children: [
              for (int i = 0; i < 6; i++)
                const Padding(
                  padding: EdgeInsets.only(bottom: 18),
                  child: SQSkeleton(height: 44, radius: 22),
                ),
            ],
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(12),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              mainAxisExtent: 246,
            ),
            itemCount: 6,
            itemBuilder: (_, _) =>
                const SQSkeleton(height: 246, radius: SQRadius.sm),
          ),
        ),
      ],
    );
  }
}

/// Blinkit card: image block on top with the ADD disc overlaid, then
/// unit → title → price row. Price and button never share a row.
class _AisleProductCard extends StatelessWidget {
  final Map<String, dynamic> product;
  final CartStore cart;
  final Color primary;

  const _AisleProductCard({
    required this.product,
    required this.cart,
    required this.primary,
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
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.circular(SQRadius.sm),
        border: Border.all(color: SQColor.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Image block + badges + ADD disc ──
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                Container(
                  color: SQColor.fog,
                  padding: const EdgeInsets.all(10),
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
                            color: SQColor.ink),
                      ),
                    ),
                  ),
                if (!isOut)
                  Positioned(
                    right: 6,
                    bottom: 6,
                    child: AnimatedBuilder(
                      animation: cart,
                      builder: (context, _) {
                        final qty = cart.quantityOf(product['id'] as String);
                        if (qty == 0) {
                          return NeonPressable(
                            onTap: () => cart.add(product),
                            glowColor: SQColor.lime,
                            child: Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: SQColor.lime,
                                shape: BoxShape.circle,
                                border: Border.all(
                                    color: Colors.white, width: 2.5),
                              ),
                              child: const Icon(Icons.add_rounded,
                                  color: SQColor.ink, size: 22),
                            ),
                          );
                        }
                        return Container(
                          height: 40,
                          padding: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            color: SQColor.green,
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: Colors.white, width: 2.5),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              NeonPressable(
                                scaleDown: 0.8,
                                skewAmount: 0,
                                glowColor: Colors.white24,
                                onTap: () =>
                                    cart.decrement(product['id'] as String),
                                child: const SizedBox(
                                  width: 26,
                                  height: 36,
                                  child: Icon(Icons.remove_rounded,
                                      color: Colors.white, size: 15),
                                ),
                              ),
                              Text('$qty',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12.5)),
                              NeonPressable(
                                scaleDown: 0.8,
                                skewAmount: 0,
                                glowColor: Colors.white24,
                                onTap: () =>
                                    cart.increment(product['id'] as String),
                                child: const SizedBox(
                                  width: 26,
                                  height: 36,
                                  child: Icon(Icons.add_rounded,
                                      color: Colors.white, size: 15),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),

          // ── Details ──
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
                        color: SQColor.inkFaint),
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
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Row(
                    children: [
                      Text(
                        '₹${salePrice.toStringAsFixed(0)}',
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: SQColor.ink),
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
    );
  }
}
