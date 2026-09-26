import 'package:flutter/material.dart';

import '../api_client.dart';
import '../cart_store.dart';
import '../theme.dart';
import '../widgets/product_card.dart';
import '../widgets/pressable.dart';
import 'aisles_screen.dart';
import 'cart_screen.dart';
import 'orders_screen.dart';
import 'account_screen.dart';
import 'staff_orders_screen.dart';
import 'rider_dashboard_screen.dart';

/// Storefront home: theme-aware header, category tiles and product rails.
/// Hosts the role-aware shell (customer 5-tab, packer/manager queue, rider dashboard).
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiClient.instance;
  final cart = CartStore();

  List<dynamic> _categories = [];
  List<dynamic> _products = [];
  bool _loading = true;
  int _tabIndex = 0;
  Color _primary = kBrandPrimary;
  Color _accent = kBrandAccent;
  String _saleTag = '⚡ 10-15 Min Delivery Guarantee';

  @override
  void initState() {
    super.initState();
    _loadCatalog();
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final theme = await _api.fetchTheme();
    if (!mounted || theme == null) return;
    setState(() {
      _primary = _parseColor(theme['primaryColor'], kBrandPrimary);
      _accent = _parseColor(theme['accentColor'], kBrandAccent);
      _saleTag = (theme['saleTagText'] ?? _saleTag) as String;
    });
  }

  Color _parseColor(dynamic hex, Color fallback) {
    if (hex is! String || hex.length < 7) return fallback;
    try {
      return Color(int.parse(hex.substring(1, 7), radix: 16) | 0xFF000000);
    } catch (_) {
      return fallback;
    }
  }

  Future<void> _loadCatalog() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      _api.fetchCategories(),
      _api.fetchProducts(),
    ]);
    if (!mounted) return;
    setState(() {
      _categories = results[0];
      _products = results[1];
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final role = (ApiClient.instance.user?['role'] ?? 'CUSTOMER') as String;

    // ---- Role-aware shell: staff land straight in their tooling ----
    if (role == 'RIDER') {
      return _buildShell(
        screens: [
          RiderDashboardScreen(primary: _primary, accent: _accent),
          AccountScreen(primary: _primary),
        ],
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.two_wheeler_outlined),
            selectedIcon: Icon(Icons.two_wheeler),
            label: 'Deliveries',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Account',
          ),
        ],
      );
    }

    if (role == 'PACKER' || role == 'MANAGER' || role == 'OWNER') {
      return _buildShell(
        screens: [
          StaffOrdersScreen(primary: _primary, accent: _accent),
          AccountScreen(primary: _primary),
        ],
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Queue',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Account',
          ),
        ],
      );
    }

    // ---- Customer storefront (5 tabs) ----
    return _buildShell(
      screens: [
        _buildHomeTab(),
        AislesScreen(
          categories: _categories,
          primary: _primary,
          accent: _accent,
          cart: cart,
          onNavigateToProducts: () => setState(() => _tabIndex = 0),
        ),
        CartScreen(cart: cart, primary: _primary, accent: _accent),
        OrdersScreen(primary: _primary, accent: _accent),
        AccountScreen(primary: _primary),
      ],
      floatingCart: _tabIndex != 2,
      destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          const NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view),
            label: 'Aisles',
          ),
          NavigationDestination(
            icon: Badge(
              label: Text('${cart.totalQuantity}'),
              isLabelVisible: cart.isNotEmpty,
              child: const Icon(Icons.shopping_bag_outlined),
            ),
            selectedIcon: Badge(
              label: Text('${cart.totalQuantity}'),
              isLabelVisible: cart.isNotEmpty,
              child: const Icon(Icons.shopping_bag),
            ),
            label: 'Cart',
          ),
          const NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Account',
          ),
        ],
    );
  }

  Widget _buildShell({
    required List<Widget> screens,
    required List<NavigationDestination> destinations,
    bool floatingCart = false,
  }) {
    if (_tabIndex >= screens.length) _tabIndex = 0;
    return Scaffold(
      body: IndexedStack(index: _tabIndex, children: screens),
      floatingActionButton:
          floatingCart && cart.isNotEmpty
              ? _FloatingCartPill(cart: cart, primary: _primary)
              : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (i) => setState(() => _tabIndex = i),
        backgroundColor: Colors.white,
        indicatorColor: _primary.withValues(alpha: 0.12),
        destinations: destinations,
      ),
    );
  }

  Widget _buildHomeTab() {
    return RefreshIndicator(
      onRefresh: _loadCatalog,
      color: _primary,
      child: CustomScrollView(
        slivers: [
          // Green header — Blinkit style
          SliverAppBar(
            pinned: true,
            expandedHeight: 120,
            toolbarHeight: 64,
            backgroundColor: _primary,
            surfaceTintColor: _primary,
            automaticallyImplyLeading: false,
            flexibleSpace: FlexibleSpaceBar(
              background: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'SabQuick',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const Spacer(),
                          Icon(Icons.flash_on, color: _accent, size: 18),
                          const SizedBox(width: 4),
                          Text(
                            '10-15 MIN',
                            style: TextStyle(
                              color: _accent,
                              fontWeight: FontWeight.w900,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _saleTag,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(56),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _SearchField(primary: _primary),
              ),
            ),
          ),

          // Category tiles
          SliverToBoxAdapter(
            child: _loading
                ? _HomeSkeleton(primary: _primary)
                : _CategoryTiles(
                    categories: _categories,
                    products: _products,
                    primary: _primary,
                    accent: _accent,
                    onSelect: (slug) async {
                      setState(() => _loading = true);
                      final products =
                          await _api.fetchProducts(categoryId: slug);
                      if (!mounted) return;
                      setState(() {
                        _products = products;
                        _loading = false;
                      });
                    },
                  ),
          ),

          // Product rails per category
          if (!_loading)
            ..._buildRails(),
        ],
      ),
    );
  }

  List<Widget> _buildRails() {
    final rails = <Widget>[];
    for (final cat in _categories) {
      final catId = cat['id'] as String;
      final catName = (cat['name'] ?? '') as String;
      final subs = (cat['subCategories'] as List?) ?? [];
      final subIds = subs.map((s) => s['id'] as String).toSet();
      final railProducts = _products.where((p) {
        final pcId = p['category']?['id'];
        return pcId == catId || subIds.contains(pcId);
      }).take(10).toList();
      if (railProducts.isEmpty) continue;
      rails.add(
        _ProductRail(
          title: catName,
          products: railProducts,
          cart: cart,
          primary: _primary,
          accent: _accent,
        ),
      );
    }
    // Anything not in a known parent gets a fallback rail.
    final knownIds = <String>{
      for (final c in _categories) c['id'] as String,
      for (final c in _categories)
        ...((c['subCategories'] as List?) ?? [])
            .map((s) => s['id'] as String),
    };
    final extras = _products
        .where((p) => !knownIds.contains(p['category']?['id']))
        .take(10)
        .toList();
    if (extras.isNotEmpty) {
      rails.add(
        _ProductRail(
          title: 'More for you',
          products: extras,
          cart: cart,
          primary: _primary,
          accent: _accent,
        ),
      );
    }
    rails.add(const SizedBox(height: 24));
    return rails;
  }
}

class _SearchField extends StatelessWidget {
  final Color primary;
  const _SearchField({required this.primary});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      alignment: Alignment.centerLeft,
      child: Row(
        children: [
          Icon(Icons.search, color: primary, size: 20),
          const SizedBox(width: 8),
          Text(
            'Search milk, bread, chips...',
            style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
          ),
        ],
      ),
    );
  }
}

class _CategoryTiles extends StatelessWidget {
  final List<dynamic> categories;
  final List<dynamic> products;
  final Color primary;
  final Color accent;
  final ValueChanged<String> onSelect;

  const _CategoryTiles({
    required this.categories,
    required this.products,
    required this.primary,
    required this.accent,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final tiles = categories.take(9).toList();
    if (tiles.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 0, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Shop by Category',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 108,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: tiles.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, i) {
                final cat = tiles[i] as Map<String, dynamic>;
                final name = (cat['name'] ?? '') as String;
                return Pressable(
                  onTap: () => onSelect(cat['slug'] as String? ?? ''),
                  child: Container(
                    width: 84,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE8EDF2)),
                    ),
                    padding: const EdgeInsets.all(8),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: primary.withValues(alpha: 0.08),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.storefront, color: primary, size: 20),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                            height: 1.15,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductRail extends StatelessWidget {
  final String title;
  final List<dynamic> products;
  final CartStore cart;
  final Color primary;
  final Color accent;

  const _ProductRail({
    required this.title,
    required this.products,
    required this.cart,
    required this.primary,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 230,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: products.length,
              itemBuilder: (context, i) => ProductCard(
                product: products[i] as Map<String, dynamic>,
                cart: cart,
                primary: primary,
                accent: accent,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeSkeleton extends StatelessWidget {
  final Color primary;
  const _HomeSkeleton({required this.primary});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            children: List.generate(
              3,
              (i) => Expanded(
                child: Container(
                  height: 84,
                  margin: const EdgeInsets.only(right: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
          ...List.generate(
            2,
            (i) => Container(
              height: 200,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FloatingCartPill extends StatelessWidget {
  final CartStore cart;
  final Color primary;

  const _FloatingCartPill({required this.cart, required this.primary});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: cart,
      builder: (context, _) {
        if (cart.isEmpty) return const SizedBox.shrink();
        return Pressable(
          onTap: () {},
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            decoration: BoxDecoration(
              color: primary,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: primary.withValues(alpha: 0.35),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.shopping_bag, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Text(
                  '${cart.totalQuantity} items • ₹${cart.itemTotal.toStringAsFixed(0)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.arrow_forward_ios,
                    color: Colors.white70, size: 12),
              ],
            ),
          ),
        );
      },
    );
  }
}
