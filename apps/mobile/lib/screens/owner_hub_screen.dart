import 'package:flutter/material.dart';

import '../api_client.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import 'catalog_screen.dart';
import 'coupons_screen.dart';
import 'customers_screen.dart';
import 'theme_studio_screen.dart';

/// OWNER tab 1: the hub. Today's KPIs (GMV, orders, packing speed, stock),
/// a glance at the live floor, low-stock attention list and entry cards into
/// the secondary native consoles (Catalog, Theme Studio, Customers, Coupons).
/// Mirrors the web Owner Hub overview — no WebView, no website.
class OwnerHubScreen extends StatefulWidget {
  final Color primary;
  final Color accent;

  const OwnerHubScreen({
    super.key,
    required this.primary,
    required this.accent,
  });

  @override
  State<OwnerHubScreen> createState() => _OwnerHubScreenState();
}

class _OwnerHubScreenState extends State<OwnerHubScreen> {
  final _api = ApiClient.instance;
  Map<String, dynamic>? _analytics;
  List<dynamic> _lowStock = [];
  int _activeOrders = 0;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.fetchOpsAnalytics();
      // Live floor count comes from the ops queue (same source as the
      // Manager tab); a failure here must not blank the KPIs.
      int active = 0;
      try {
        final queue = await _api.fetchOpsOrders();
        final grouped = (queue['grouped'] as Map<String, dynamic>?) ?? {};
        for (final status in const [
          'PENDING',
          'CONFIRMED',
          'PACKING',
          'READY_FOR_PICKUP',
          'OUT_FOR_DELIVERY',
        ]) {
          active += ((grouped[status] as List?) ?? const []).length;
        }
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _analytics = (data['metrics'] ?? data) as Map<String, dynamic>;
        _lowStock = (data['lowStockProducts'] as List?) ?? const [];
        _activeOrders = active;
        _loading = false;
      });
    } on SessionExpiredException {
      return; // shell handles the logout broadcast
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Network error. Pull down to retry.';
      });
    }
  }

  String _metric(String key) {
    final v = (_analytics?[key] ?? 0) as num;
    return v is int || v == v.roundToDouble()
        ? v.round().toString()
        : v.toStringAsFixed(1);
  }

  void _push(Widget screen) {
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => screen))
        .then((_) => _load());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.fog,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _load,
          color: widget.primary,
          child: _loading
              ? _buildSkeleton()
              : _error != null
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        const SizedBox(height: 140),
                        SQEmpty(
                          icon: Icons.error_outline_rounded,
                          title: 'Could not load the hub',
                          subtitle: _error,
                        ),
                        const SizedBox(height: SQSpace.lg),
                        Padding(
                          padding:
                              const EdgeInsets.symmetric(horizontal: SQSpace.xl),
                          child: SQButton(
                            label: 'Retry',
                            icon: Icons.refresh_rounded,
                            onTap: _load,
                          ),
                        ),
                      ],
                    )
                  : _buildHub(),
        ),
      ),
    );
  }

  Widget _buildSkeleton() {
    return ListView(
      padding: const EdgeInsets.all(SQSpace.md),
      children: [
        const SizedBox(height: SQSpace.sm),
        SQSkeleton(height: 30, radius: 8),
        const SizedBox(height: SQSpace.lg),
        Row(
          children: [
            for (int i = 0; i < 2; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              const Expanded(
                child: SQSkeleton(height: 86, radius: SQRadius.sm),
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            for (int i = 0; i < 2; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              const Expanded(
                child: SQSkeleton(height: 86, radius: SQRadius.sm),
              ),
            ],
          ],
        ),
        const SizedBox(height: SQSpace.lg),
        for (int i = 0; i < 3; i++) ...[
          const Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: SQSkeleton(height: 64, radius: SQRadius.sm),
          ),
        ],
      ],
    );
  }

  Widget _buildHub() {
    return ListView(
      padding:
          const EdgeInsets.fromLTRB(SQSpace.md, SQSpace.sm, SQSpace.md, SQSpace.xl),
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Owner Hub', style: SQType.display.copyWith(fontSize: 26)),
                  const SizedBox(height: 2),
                  Text('Today at a glance · live', style: SQType.body),
                ],
              ),
            ),
            NeonPressable(
              scaleDown: 0.88,
              skewAmount: -0.03,
              onTap: _load,
              child: Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: SQColor.card,
                  borderRadius: BorderRadius.circular(SQRadius.sm),
                  border: Border.all(color: SQColor.line),
                ),
                child: const Icon(Icons.refresh_rounded, color: SQColor.green),
              ),
            ),
          ],
        ),
        const SizedBox(height: SQSpace.md),

        // ── KPI grid ──
        Row(
          children: [
            _KpiCard(
              label: "Today's GMV",
              value: '₹${_metric('todayGMV')}',
              color: SQColor.green,
            ),
            const SizedBox(width: 8),
            _KpiCard(
              label: 'Delivered',
              value: _metric('completedOrders'),
              color: const Color(0xFF3B82F6),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _KpiCard(
              label: 'Avg packing',
              value: '${_metric('avgPackingTimeMinutes')} min',
              color: SQColor.violet,
            ),
            const SizedBox(width: 8),
            _KpiCard(
              label: 'Low stock',
              value: _metric('lowStockCount'),
              color: SQColor.danger,
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _KpiCard(
              label: 'Active orders',
              value: '$_activeOrders',
              color: SQColor.amber,
            ),
            const SizedBox(width: 8),
            _KpiCard(
              label: 'Total SKUs',
              value: _metric('totalProductsCount'),
              color: SQColor.cyan,
            ),
          ],
        ),
        const SizedBox(height: SQSpace.lg),

        // ── Low stock attention list ──
        if (_lowStock.isNotEmpty) ...[
          const SQSectionHeader(title: 'Needs restocking'),
          for (final p in _lowStock.take(6))
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: SQColor.card,
                borderRadius: BorderRadius.circular(SQRadius.sm),
                border: Border.all(color: SQColor.line),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: SQColor.danger.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(SQRadius.xs),
                    ),
                    child: const Icon(Icons.warning_amber_rounded,
                        color: SQColor.danger, size: 18),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '${((p as Map<String, dynamic>)['title'] ?? '') as String} · ${p['stockCount'] ?? 0} left',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: SQColor.ink),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: SQSpace.md),
        ],

        // ── Consoles (native secondary surfaces) ──
        const SQSectionHeader(title: 'Consoles'),
        _ConsoleEntry(
          icon: Icons.category_rounded,
          title: 'Catalog & Pricing',
          subtitle: 'SKUs, images, dual pricing, aisles',
          onTap: () => _push(CatalogScreen(
            primary: widget.primary,
            accent: widget.accent,
          )),
        ),
        _ConsoleEntry(
          icon: Icons.palette_outlined,
          title: 'Theme Studio',
          subtitle: 'Seasonal storefront palettes & sale tag',
          onTap: () => _push(const ThemeStudioScreen()),
        ),
        _ConsoleEntry(
          icon: Icons.people_alt_rounded,
          title: 'Customers CRM',
          subtitle: 'Spend, order counts, last order',
          onTap: () => _push(const CustomersScreen()),
        ),
        _ConsoleEntry(
          icon: Icons.confirmation_number_outlined,
          title: 'Coupons',
          subtitle: 'Create, pause and monitor offers',
          onTap: () => _push(CouponsScreen(
            primary: widget.primary,
            accent: widget.accent,
          )),
        ),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color.withValues(alpha: 0.10), SQColor.card],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(SQRadius.sm),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value,
                style: TextStyle(
                  fontFamily: 'SpaceGrotesk',
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: color,
                )),
            Text(label, style: SQType.micro.copyWith(letterSpacing: 0.3)),
          ],
        ),
      ),
    );
  }
}

class _ConsoleEntry extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ConsoleEntry({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return NeonPressable(
      skewAmount: -0.02,
      onTap: onTap,
      glowColor: SQColor.lime.withValues(alpha: 0.3),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: SQColor.card,
          borderRadius: BorderRadius.circular(SQRadius.sm),
          border: Border.all(color: SQColor.line),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: SQColor.green.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(SQRadius.xs),
              ),
              child: Icon(icon, color: SQColor.green, size: 19),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: SQColor.ink)),
                  Text(subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 11, color: SQColor.inkSoft)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: SQColor.inkFaint),
          ],
        ),
      ),
    );
  }
}
