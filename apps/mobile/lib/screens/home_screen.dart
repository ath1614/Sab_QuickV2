import 'package:flutter/material.dart';

import '../api_client.dart';
import '../cart_store.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../widgets/product_card.dart';
import 'account_screen.dart';
import 'aisles_screen.dart';
import 'cart_screen.dart';
import 'coupons_screen.dart';
import 'ops_board_screen.dart';
import 'orders_screen.dart';
import 'rider_dashboard_screen.dart';
import 'staff_screen.dart';

/// Stage 3: skeleton "loading board" shown while catalog + theme resolve.
/// Stage 4: the main board — role-aware, theme-aware, unified app:
///   CUSTOMER → Home · Aisles · Cart · Orders · Account
///   OWNER    → Everything · Manager · Staff · Coupons · Account
///   MANAGER  → Everything · Manager · Account
///   PACKER   → Packer · Account
///   RIDER    → Deliveries · Account
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
  String? _loadError;

  Color _primary = SQColor.green;
  Color _accent = SQColor.lime;
  String _saleTag = '⚡ Super Fast Delivery';

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final results = await Future.wait([
        _api.fetchCategories(),
        _api.fetchProducts(),
        _api.fetchTheme(),
      ]);
      if (!mounted) return;
      final theme = results[2] as Map<String, dynamic>?;
      setState(() {
        _categories = results[0] as List<dynamic>;
        _products = results[1] as List<dynamic>;
        if (theme != null) {
          _primary = _parseColor(theme['primaryColor'], SQColor.green);
          _accent = _parseColor(theme['accentColor'], SQColor.lime);
          _saleTag = (theme['saleTagText'] ?? _saleTag) as String;
        }
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = 'Could not reach the store. Check your connection.';
      });
    }
  }

  Color _parseColor(dynamic hex, Color fallback) {
    if (hex is! String || hex.length < 7) return fallback;
    try {
      return Color(int.parse(hex.substring(1, 7), radix: 16) | 0xFF000000);
    } catch (_) {
      return fallback;
    }
  }

  @override
  Widget build(BuildContext context) {
    // Stage 3: placeholder loading board
    if (_loading) return _LoadingBoard();

    // Unrecoverable load failure (offline etc.)
    if (_loadError != null && _categories.isEmpty) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(SQSpace.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SQEmpty(
                    icon: Icons.wifi_off_rounded,
                    title: 'You appear to be offline',
                    subtitle: 'Pull down to retry once you are connected.',
                  ),
                  const SizedBox(height: SQSpace.lg),
                  SQButton(
                      label: 'Retry', icon: Icons.refresh_rounded, onTap: _loadAll),
                ],
              ),
            ),
          ),
        ),
      );
    }

    // Stage 4: main board (role-aware)
    final role = (ApiClient.instance.user?['role'] ?? 'CUSTOMER') as String;

    switch (role) {
      case 'OWNER':
        return _buildShell(
          screens: [
            OpsBoardScreen(
                primary: _primary, accent: _accent, mode: OpsMode.everything),
            OpsBoardScreen(
                primary: _primary, accent: _accent, mode: OpsMode.manager),
            StaffScreen(primary: _primary, accent: _accent),
            CouponsScreen(primary: _primary, accent: _accent),
            AccountScreen(primary: _primary),
          ],
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.dashboard_outlined),
                selectedIcon: Icon(Icons.dashboard),
                label: 'Everything'),
            NavigationDestination(
                icon: Icon(Icons.view_kanban_outlined),
                selectedIcon: Icon(Icons.view_kanban),
                label: 'Manager'),
            NavigationDestination(
                icon: Icon(Icons.groups_2_outlined),
                selectedIcon: Icon(Icons.groups_2),
                label: 'Staff'),
            NavigationDestination(
                icon: Icon(Icons.confirmation_number_outlined),
                selectedIcon: Icon(Icons.confirmation_number),
                label: 'Coupons'),
            NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Account'),
          ],
        );
      case 'MANAGER':
        return _buildShell(
          screens: [
            OpsBoardScreen(
                primary: _primary, accent: _accent, mode: OpsMode.everything),
            OpsBoardScreen(
                primary: _primary, accent: _accent, mode: OpsMode.manager),
            AccountScreen(primary: _primary),
          ],
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.dashboard_outlined),
                selectedIcon: Icon(Icons.dashboard),
                label: 'Everything'),
            NavigationDestination(
                icon: Icon(Icons.view_kanban_outlined),
                selectedIcon: Icon(Icons.view_kanban),
                label: 'Manager'),
            NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Account'),
          ],
        );
      case 'PACKER':
        return _buildShell(
          screens: [
            OpsBoardScreen(
                primary: _primary, accent: _accent, mode: OpsMode.packer),
            AccountScreen(primary: _primary),
          ],
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.inventory_2_outlined),
                selectedIcon: Icon(Icons.inventory_2),
                label: 'Packing'),
            NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Account'),
          ],
        );
      case 'RIDER':
        return _buildShell(
          screens: [
            RiderDashboardScreen(primary: _primary, accent: _accent),
            AccountScreen(primary: _primary),
          ],
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.two_wheeler_outlined),
                selectedIcon: Icon(Icons.two_wheeler),
                label: 'Deliveries'),
            NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Account'),
          ],
        );
      default:
        return _buildShell(
          floatingCart: _tabIndex != 2,
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
          destinations: [
            const NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'Home'),
            const NavigationDestination(
                icon: Icon(Icons.grid_view_outlined),
                selectedIcon: Icon(Icons.grid_view),
                label: 'Aisles'),
            NavigationDestination(
              icon: Badge(
                label: Text('${cart.totalQuantity}'),
                isLabelVisible: cart.isNotEmpty,
                backgroundColor: SQColor.lime,
                textColor: SQColor.ink,
                child: const Icon(Icons.shopping_bag_outlined),
              ),
              selectedIcon: Badge(
                label: Text('${cart.totalQuantity}'),
                isLabelVisible: cart.isNotEmpty,
                backgroundColor: SQColor.lime,
                textColor: SQColor.ink,
                child: const Icon(Icons.shopping_bag),
              ),
              label: 'Cart',
            ),
            const NavigationDestination(
                icon: Icon(Icons.receipt_long_outlined),
                selectedIcon: Icon(Icons.receipt_long),
                label: 'Orders'),
            const NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Account'),
          ],
        );
    }
  }

  Widget _buildShell({
    required List<Widget> screens,
    required List<NavigationDestination> destinations,
    bool floatingCart = false,
  }) {
    if (_tabIndex >= screens.length) _tabIndex = 0;
    return Scaffold(
      body: IndexedStack(index: _tabIndex, children: screens),
      floatingActionButton: floatingCart && cart.isNotEmpty
          ? _FloatingCartPill(
              cart: cart,
              primary: _primary,
              onOpenCart: () => setState(() => _tabIndex = 2),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (i) => setState(() => _tabIndex = i),
        destinations: destinations,
      ),
    );
  }

  Widget _buildHomeTab() {
    return RefreshIndicator(
      onRefresh: _loadAll,
      color: _primary,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // ── Brand header (logo asset, theme colors, SafeArea) ──
          SliverAppBar(
            pinned: true,
            expandedHeight: 132,
            toolbarHeight: 64,
            backgroundColor: _primary,
            surfaceTintColor: _primary,
            automaticallyImplyLeading: false,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: _primary,
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding:
                        const EdgeInsets.fromLTRB(SQSpace.md, 6, SQSpace.md, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              height: 30,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius:
                                    BorderRadius.circular(SQRadius.xs),
                              ),
                              child: Image.asset(
                                  'assets/brand/navbar-logo.png',
                                  fit: BoxFit.contain),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: SQColor.ink.withValues(alpha: 0.35),
                                borderRadius:
                                    BorderRadius.circular(SQRadius.pill),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.bolt_rounded,
                                      color: SQColor.lime, size: 14),
                                  const SizedBox(width: 4),
                                  Text(
                                    '10–15 MIN',
                                    style: TextStyle(
                                      color: SQColor.lime,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 11,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _saleTag,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(58),
              child: Padding(
                padding:
                    const EdgeInsets.fromLTRB(SQSpace.md, 0, SQSpace.md, 12),
                child: GestureDetector(
                  onTap: () => setState(() => _tabIndex = 1),
                  child: Container(
                    height: 48,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(SQRadius.md),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.10),
                          blurRadius: 14,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.search_rounded, color: _primary, size: 20),
                        const SizedBox(width: 8),
                        Text('Search milk, bread, chips...',
                            style: SQType.body.copyWith(
                                color: const Color(0xFFA8A29B))),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // ── Category tiles ──
          SliverToBoxAdapter(
            child: _CategoryTiles(
              categories: _categories,
              products: _products,
              primary: _primary,
              onSelect: (slug) async {
                setState(() => _loading = true);
                final products = await _api.fetchProducts(categoryId: slug);
                if (!mounted) return;
                setState(() {
                  _products = products;
                  _loading = false;
                });
              },
            ),
          ),

          // ── Product rails ──
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
        ),
      );
    }
    final knownIds = <String>{
      for (final c in _categories) c['id'] as String,
      for (final c in _categories)
        ...((c['subCategories'] as List?) ?? []).map((s) => s['id'] as String),
    };
    final extras = _products
        .where((p) => !knownIds.contains(p['category']?['id']))
        .take(10)
        .toList();
    if (extras.isNotEmpty) {
      rails.add(_ProductRail(
        title: 'More for you',
        products: extras,
        cart: cart,
        primary: _primary,
      ));
    }
    rails.add(const SizedBox(height: 28));
    return rails;
  }
}

// ═════════════════ Stage 3: skeleton loading board ═════════════════

class _LoadingBoard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.fog,
      appBar: AppBar(
        backgroundColor: SQColor.green,
        toolbarHeight: 96,
        automaticallyImplyLeading: false,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SQSkeleton(width: 120, height: 26, radius: 8),
            const SizedBox(height: 6),
            SQSkeleton(width: 200, height: 12, radius: 6),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(58),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: SQSkeleton(height: 48, radius: SQRadius.md),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(SQSpace.md),
        children: [
          Row(
            children: List.generate(
              3,
              (i) => const Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: 10),
                  child: SQSkeleton(height: 92, radius: SQRadius.md),
                ),
              ),
            ),
          ),
          const SizedBox(height: SQSpace.lg),
          const SQSkeleton(height: 18, radius: 6),
          const SizedBox(height: SQSpace.sm),
          SizedBox(
            height: 220,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 3,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (_, _) => const SQSkeleton(
                  width: 150, height: 220, radius: SQRadius.md),
            ),
          ),
          const SizedBox(height: SQSpace.md),
          const SQSkeleton(height: 18, radius: 6),
          const SizedBox(height: SQSpace.sm),
          SizedBox(
            height: 220,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 3,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (_, _) => const SQSkeleton(
                  width: 150, height: 220, radius: SQRadius.md),
            ),
          ),
        ],
      ),
    );
  }
}

// ═════════════════ Home board pieces ═════════════════

class _CategoryTiles extends StatelessWidget {
  final List<dynamic> categories;
  final List<dynamic> products;
  final Color primary;
  final ValueChanged<String> onSelect;

  const _CategoryTiles({
    required this.categories,
    required this.products,
    required this.primary,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final tiles = categories.take(9).toList();
    if (tiles.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SQSectionHeader(title: 'Shop by category'),
        SizedBox(
          height: 104,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding:
                const EdgeInsets.symmetric(horizontal: SQSpace.md),
            itemCount: tiles.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final cat = tiles[i] as Map<String, dynamic>;
              final name = (cat['name'] ?? '') as String;
              return GestureDetector(
                onTap: () => onSelect(cat['slug'] as String? ?? ''),
                child: Container(
                  width: 86,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(SQRadius.md),
                    border: Border.all(color: SQColor.line),
                  ),
                  padding: const EdgeInsets.all(8),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: primary.withValues(alpha: 0.08),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.storefront_rounded,
                            color: primary, size: 20),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: SQColor.ink,
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
    );
  }
}

class _ProductRail extends StatelessWidget {
  final String title;
  final List<dynamic> products;
  final CartStore cart;
  final Color primary;

  const _ProductRail({
    required this.title,
    required this.products,
    required this.cart,
    required this.primary,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SQSectionHeader(title: title),
        SizedBox(
          height: 236,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: SQSpace.md),
            itemCount: products.length,
            itemBuilder: (context, i) => ProductCard(
              product: products[i] as Map<String, dynamic>,
              cart: cart,
              primary: primary,
            ),
          ),
        ),
      ],
    );
  }
}

class _FloatingCartPill extends StatelessWidget {
  final CartStore cart;
  final Color primary;
  final VoidCallback onOpenCart;

  const _FloatingCartPill({
    required this.cart,
    required this.primary,
    required this.onOpenCart,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: cart,
      builder: (context, _) {
        if (cart.isEmpty) return const SizedBox.shrink();
        return GestureDetector(
          onTap: onOpenCart,
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            decoration: BoxDecoration(
              color: SQColor.ink,
              borderRadius: BorderRadius.circular(SQRadius.pill),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${cart.totalQuantity} item${cart.totalQuantity == 1 ? '' : 's'} • ₹${cart.itemTotal.toStringAsFixed(0)}',
                  style: const TextStyle(
                      color: SQColor.lime,
                      fontWeight: FontWeight.w700,
                      fontSize: 13),
                ),
                const SizedBox(width: 10),
                const Icon(Icons.arrow_forward_rounded,
                    color: SQColor.lime, size: 16),
              ],
            ),
          ),
        );
      },
    );
  }
}
