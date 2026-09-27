import 'dart:async';

import 'package:flutter/material.dart';

import '../api_client.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../widgets/pressable.dart';

/// PACKER tab: the floor station. Each active order becomes a bagging card
/// whose items are grouped by aisle (the `aisle` field already comes on
/// every item from /api/ops/orders) with a local pick checklist and a
/// progress bar. Buttons advance the order CONFIRMED → PACKING →
/// READY_FOR_PICKUP. Fully native — no website.
class PackerStationScreen extends StatefulWidget {
  final Color primary;
  final Color accent;

  const PackerStationScreen({
    super.key,
    required this.primary,
    required this.accent,
  });

  @override
  State<PackerStationScreen> createState() => _PackerStationScreenState();
}

class _PackerStationScreenState extends State<PackerStationScreen> {
  final _api = ApiClient.instance;
  List<dynamic> _orders = [];
  bool _loading = true;
  String? _error;
  String? _busyOrderId;
  Timer? _refreshTimer;

  /// Checked item ids per order (local pick progress — intentionally not
  /// persisted; it's a physical picking aid, reset on reload).
  final Set<String> _checkedItems = {};

  @override
  void initState() {
    super.initState();
    _load();
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final data = await _api.fetchOpsOrders();
      if (!mounted) return;
      final grouped = (data['grouped'] as Map<String, dynamic>?) ?? {};
      setState(() {
        _orders = [
          ...((grouped['CONFIRMED'] as List?) ?? const []),
          ...((grouped['PACKING'] as List?) ?? const []),
        ];
        _loading = false;
        _error = null;
      });
    } on SessionExpiredException {
      _refreshTimer?.cancel();
      return;
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (!silent) _error = 'Network error loading the queue';
      });
    }
  }

  Future<void> _advance(Map<String, dynamic> order) async {
    final status = order['status'] as String;
    final next = switch (status) {
      'CONFIRMED' => 'PACKING',
      'PACKING' => 'READY_FOR_PICKUP',
      _ => null,
    };
    if (next == null) return;
    setState(() => _busyOrderId = order['id'] as String);
    try {
      await _api.updateOrderStatus(order['id'] as String, next);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(
            'Order #${order['orderNumber']} → ${next.replaceAll('_', ' ')}'),
      ));
      await _load(silent: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: SQColor.danger),
      );
    } finally {
      if (mounted) setState(() => _busyOrderId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.fog,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () => _load(),
          color: widget.primary,
          child: _loading
              ? ListView(
                  padding: const EdgeInsets.all(SQSpace.md),
                  children: [
                    const SizedBox(height: SQSpace.sm),
                    SQSkeleton(height: 30, radius: 8),
                    const SizedBox(height: SQSpace.lg),
                    for (int i = 0; i < 3; i++) ...[
                      const Padding(
                        padding: EdgeInsets.only(bottom: 10),
                        child: SQSkeleton(height: 170, radius: SQRadius.md),
                      ),
                    ],
                  ],
                )
              : _error != null
                  ? ListView(
                      children: [
                        const SizedBox(height: 140),
                        SQEmpty(
                          icon: Icons.error_outline_rounded,
                          title: 'Could not load the queue',
                          subtitle: _error,
                        ),
                        const SizedBox(height: SQSpace.lg),
                        Padding(
                          padding:
                              const EdgeInsets.symmetric(horizontal: SQSpace.xl),
                          child: SQButton(
                            label: 'Retry',
                            icon: Icons.refresh_rounded,
                            onTap: () => _load(),
                          ),
                        ),
                      ],
                    )
                  : _buildQueue(),
        ),
      ),
    );
  }

  Widget _buildQueue() {
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
                  Text('Packer Station',
                      style: SQType.display.copyWith(fontSize: 26)),
                  const SizedBox(height: 2),
                  Text(
                    '${_orders.length} order${_orders.length == 1 ? '' : 's'} to bag · aisle by aisle',
                    style: SQType.body,
                  ),
                ],
              ),
            ),
            NeonPressable(
              scaleDown: 0.88,
              skewAmount: -0.03,
              onTap: () => _load(),
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
        if (_orders.isEmpty) ...[
          const SizedBox(height: 60),
          const SQEmpty(
            icon: Icons.inventory_2_outlined,
            title: 'Queue is clear',
            subtitle: 'New confirmed orders appear here automatically.',
          ),
        ],
        for (final order in _orders)
          _PackingCard(
            order: order as Map<String, dynamic>,
            primary: widget.primary,
            busy: _busyOrderId == order['id'],
            checked: _checkedItems,
            onToggleItem: (itemId) => setState(() {
              _checkedItems.contains(itemId)
                  ? _checkedItems.remove(itemId)
                  : _checkedItems.add(itemId);
            }),
            onAdvance: () => _advance(order),
          ),
      ],
    );
  }
}

class _PackingCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final Color primary;
  final bool busy;
  final Set<String> checked;
  final ValueChanged<String> onToggleItem;
  final VoidCallback onAdvance;

  const _PackingCard({
    required this.order,
    required this.primary,
    required this.busy,
    required this.checked,
    required this.onToggleItem,
    required this.onAdvance,
  });

  /// Items grouped by aisle, preserving first-appearance order.
  Map<String, List<Map<String, dynamic>>> get _itemsByAisle {
    final map = <String, List<Map<String, dynamic>>>{};
    for (final item in (order['items'] as List?) ?? const []) {
      final m = item as Map<String, dynamic>;
      final aisle = (m['aisle'] ?? 'General Groceries') as String;
      map.putIfAbsent(aisle, () => []).add(m);
    }
    return map;
  }

  (int, int) get _progress {
    final items = (order['items'] as List?) ?? const [];
    final done = items
        .where((i) => checked.contains((i as Map<String, dynamic>)['id'] as String))
        .length;
    return (done, items.length);
  }

  String get _nextLabel => order['status'] == 'CONFIRMED'
      ? 'START PACKING'
      : 'MARK READY FOR PICKUP';

  Color get _nextColor =>
      order['status'] == 'CONFIRMED' ? const Color(0xFF3B82F6) : SQColor.success;

  @override
  Widget build(BuildContext context) {
    final itemsByAisle = _itemsByAisle;
    final (done, total) = _progress;
    final allPicked = total > 0 && done == total;
    final customer = (order['customer'] ?? {}) as Map<String, dynamic>;
    final payment = (order['paymentMethod'] ?? '') as String;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.circular(SQRadius.md),
        border: Border.all(color: SQColor.line),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header row ──
          Row(
            children: [
              Text('#${order['orderNumber'] ?? ''}',
                  style: const TextStyle(
                      fontFamily: 'SpaceGrotesk',
                      fontWeight: FontWeight.w700,
                      fontSize: 15)),
              const SizedBox(width: 8),
              if (payment.isNotEmpty)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: SQColor.fog,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    payment == 'CASH_ON_DELIVERY'
                        ? 'CASH'
                        : payment == 'CASHFREE'
                            ? 'PAID ONLINE'
                            : 'UPI',
                    style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        color: SQColor.inkSoft),
                  ),
                ),
              const Spacer(),
              Text(
                '$done/$total picked',
                style: TextStyle(
                  fontFamily: 'SpaceGrotesk',
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: allPicked ? SQColor.success : SQColor.inkSoft,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            '${customer['name'] ?? 'Customer'} · ${order['elapsedMinutes'] ?? 0} min in queue',
            style: const TextStyle(fontSize: 11.5, color: SQColor.inkSoft),
          ),
          const SizedBox(height: 8),

          // ── Progress bar ──
          ClipRRect(
            borderRadius: BorderRadius.circular(SQRadius.pill),
            child: LinearProgressIndicator(
              value: total == 0 ? 0 : done / total,
              minHeight: 5,
              backgroundColor: SQColor.fog,
              valueColor: AlwaysStoppedAnimation<Color>(
                  allPicked ? SQColor.success : primary),
            ),
          ),
          const SizedBox(height: 10),

          // ── Aisle groups ──
          for (final entry in itemsByAisle.entries) ...[
            Padding(
              padding: const EdgeInsets.only(top: 2, bottom: 5),
              child: Row(
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                        color: primary.withValues(alpha: 0.55),
                        shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 7),
                  Text(entry.key.toUpperCase(),
                      style: SQType.micro.copyWith(
                          color: SQColor.inkSoft, letterSpacing: 0.6)),
                ],
              ),
            ),
            for (final item in entry.value)
              _ItemRow(
                item: item,
                checked: checked.contains(item['id'] as String),
                onToggle: () => onToggleItem(item['id'] as String),
              ),
            const SizedBox(height: 4),
          ],

          // ── Advance button ──
          const SizedBox(height: 8),
          Pressable(
            onTap: busy ? null : onAdvance,
            child: Container(
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: _nextColor,
                borderRadius: BorderRadius.circular(SQRadius.sm),
              ),
              child: busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : Text(
                      _nextLabel,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                        letterSpacing: 0.5,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemRow extends StatelessWidget {
  final Map<String, dynamic> item;
  final bool checked;
  final VoidCallback onToggle;

  const _ItemRow({
    required this.item,
    required this.checked,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final product = (item['product'] ?? {}) as Map<String, dynamic>;
    final title = (product['title'] ?? 'Item') as String;
    final packSize = (product['packSize'] ?? '') as String;
    final qty = (item['quantity'] ?? 1) as num;

    return Pressable(
      onTap: onToggle,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: checked ? SQColor.success : SQColor.card,
                shape: BoxShape.circle,
                border: Border.all(
                  color: checked ? SQColor.success : SQColor.line,
                  width: 1.6,
                ),
              ),
              child: checked
                  ? const Icon(Icons.check_rounded,
                      size: 14, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '$title${packSize.isNotEmpty ? ' · $packSize' : ''}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: checked ? SQColor.inkFaint : SQColor.ink,
                  decoration:
                      checked ? TextDecoration.lineThrough : null,
                ),
              ),
            ),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: SQColor.fog,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('×$qty',
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: SQColor.ink)),
            ),
          ],
        ),
      ),
    );
  }
}
