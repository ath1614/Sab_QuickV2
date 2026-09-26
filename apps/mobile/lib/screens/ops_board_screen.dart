import 'dart:async';

import 'package:flutter/material.dart';

import '../api_client.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../widgets/pressable.dart';

/// Which lens the operations board shows. Same data source
/// (`/api/ops/orders`), three role-tuned presentations mirroring the
/// website's Everything / Manager / Packer consoles.
enum OpsMode { everything, manager, packer }

class OpsBoardScreen extends StatefulWidget {
  final Color primary;
  final Color accent;
  final OpsMode mode;

  const OpsBoardScreen({
    super.key,
    required this.primary,
    required this.accent,
    required this.mode,
  });

  @override
  State<OpsBoardScreen> createState() => _OpsBoardScreenState();
}

class _OpsBoardScreenState extends State<OpsBoardScreen> {
  final _api = ApiClient.instance;
  Map<String, dynamic>? _grouped;
  bool _loading = true;
  String? _error;
  String? _busyOrderId;
  Timer? _refreshTimer;

  String get _title {
    switch (widget.mode) {
      case OpsMode.everything:
        return 'Everything';
      case OpsMode.manager:
        return 'Manager Board';
      case OpsMode.packer:
        return 'Packer Station';
    }
  }

  String get _subtitle {
    switch (widget.mode) {
      case OpsMode.everything:
        return 'Live floor queue — confirm, pack, dispatch';
      case OpsMode.manager:
        return 'Dispatch, rider handoff & live deliveries';
      case OpsMode.packer:
        return 'Aisle picking & bagging queue';
    }
  }

  /// (status, label, color) sections per lens, in workflow order.
  List<(String, String, Color)> get _sections {
    const pending = ('PENDING', 'New — need confirmation', Color(0xFFF59E0B));
    const confirmed = ('CONFIRMED', 'Confirmed — start packing', Color(0xFF3B82F6));
    const packing = ('PACKING', 'Packing in progress', Color(0xFF8B5CF6));
    const ready = ('READY_FOR_PICKUP', 'Ready for rider pickup', Color(0xFF10B981));
    const transit = ('OUT_FOR_DELIVERY', 'In transit', Color(0xFF6366F1));
    const delivered = ('DELIVERED', 'Completed', Color(0xFF64748B));

    switch (widget.mode) {
      case OpsMode.everything:
        return [pending, confirmed, packing, ready, transit, delivered];
      case OpsMode.manager:
        return [ready, transit, delivered, pending, confirmed, packing];
      case OpsMode.packer:
        return [confirmed, packing, ready];
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
    // Live floor: silently refresh while the board is visible.
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
      setState(() {
        _grouped = data['grouped'] as Map<String, dynamic>?;
        _loading = false;
        _error = null;
      });
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
        _error = 'Network error loading queue';
      });
    }
  }

  Future<void> _advance(Map<String, dynamic> order) async {
    final status = order['status'] as String;
    final next = _nextStatus(status);
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
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.message),
        backgroundColor: SQColor.danger,
      ));
    } finally {
      if (mounted) setState(() => _busyOrderId = null);
    }
  }

  String? _nextStatus(String status) {
    switch (status) {
      case 'PENDING':
        return 'CONFIRMED';
      case 'CONFIRMED':
        return 'PACKING';
      case 'PACKING':
        return 'READY_FOR_PICKUP';
      default:
        return null; // rider handles the rest
    }
  }

  String? _nextLabel(String status) {
    switch (status) {
      case 'PENDING':
        return 'CONFIRM';
      case 'CONFIRMED':
        return 'START PACKING';
      case 'PACKING':
        return 'MARK READY';
      default:
        return null;
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
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    const SizedBox(height: 24),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: SQSpace.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SQSkeleton(height: 30, radius: 8),
                          const SizedBox(height: 6),
                          SQSkeleton(height: 14, radius: 6),
                        ],
                      ),
                    ),
                    const SizedBox(height: SQSpace.lg),
                    for (int i = 0; i < 3; i++)
                      const Padding(
                        padding: EdgeInsets.fromLTRB(SQSpace.md, 0, SQSpace.md, 12),
                        child: SQSkeleton(height: 120, radius: SQRadius.md),
                      ),
                  ],
                )
              : _error != null
                  ? ListView(
                      children: [
                        const SizedBox(height: 140),
                        SQEmpty(
                          icon: Icons.error_outline_rounded,
                          title: 'Could not load the board',
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
                  : _buildBoard(),
        ),
      ),
    );
  }

  Widget _buildBoard() {
    final grouped = _grouped ?? {};
    final totalActive = _sections
        .take(5)
        .fold<int>(0, (sum, s) => sum + (((grouped[s.$1] as List?) ?? const []).length));

    return ListView(
      padding: const EdgeInsets.fromLTRB(SQSpace.md, SQSpace.sm, SQSpace.md, SQSpace.xl),
      children: [
        // Header
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_title, style: SQType.display.copyWith(fontSize: 26)),
                  const SizedBox(height: 2),
                  Text(_subtitle, style: SQType.body),
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

        // Live counters strip
        Row(
          children: [
            _CounterChip(
              label: 'Active',
              value: totalActive,
              color: SQColor.green,
            ),
            const SizedBox(width: 8),
            _CounterChip(
              label: 'To confirm',
              value: ((grouped['PENDING'] as List?) ?? const []).length,
              color: const Color(0xFFF59E0B),
            ),
            const SizedBox(width: 8),
            _CounterChip(
              label: 'In transit',
              value: ((grouped['OUT_FOR_DELIVERY'] as List?) ?? const []).length,
              color: const Color(0xFF6366F1),
            ),
          ],
        ),
        const SizedBox(height: SQSpace.sm),

        for (final (status, label, color) in _sections)
          ..._buildSection(
              status, label, color, (grouped[status] as List?) ?? const []),

        if (_sections.every((s) =>
            ((grouped[s.$1] as List?) ?? const []).isEmpty)) ...[
          const SizedBox(height: 60),
          const SQEmpty(
            icon: Icons.inventory_2_outlined,
            title: 'All clear!',
            subtitle: 'No orders in this queue right now.',
          ),
        ],
      ],
    );
  }

  List<Widget> _buildSection(
      String status, String label, Color color, List orders) {
    if (orders.isEmpty) return [];
    return [
      Padding(
        padding: const EdgeInsets.only(top: 10, bottom: 8),
        child: Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '$label  (${orders.length})',
                style: SQType.micro.copyWith(color: SQColor.ink),
              ),
            ),
          ],
        ),
      ),
      for (final order in orders)
        _OpsOrderCard(
          order: order as Map<String, dynamic>,
          color: color,
          primary: widget.primary,
          busy: _busyOrderId == order['id'],
          nextLabel: _nextLabel(status),
          onAdvance: () => _advance(order),
        ),
    ];
  }
}

class _CounterChip extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _CounterChip({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
        decoration: BoxDecoration(
          color: SQColor.card,
          borderRadius: BorderRadius.circular(SQRadius.sm),
          border: Border.all(color: SQColor.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$value',
                style: TextStyle(
                  fontFamily: 'SpaceGrotesk',
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: color,
                )),
            Text(label,
                style: SQType.micro.copyWith(letterSpacing: 0.4)),
          ],
        ),
      ),
    );
  }
}

class _OpsOrderCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final Color color;
  final Color primary;
  final bool busy;
  final String? nextLabel;
  final VoidCallback onAdvance;

  const _OpsOrderCard({
    required this.order,
    required this.color,
    required this.primary,
    required this.busy,
    required this.nextLabel,
    required this.onAdvance,
  });

  @override
  Widget build(BuildContext context) {
    final customer = (order['customer'] ?? {}) as Map<String, dynamic>;
    final address = (order['address'] ?? {}) as Map<String, dynamic>;
    final items = (order['items'] ?? []) as List;
    final payment = (order['paymentMethod'] ?? '') as String;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
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
          Row(
            children: [
              Text(
                '#${order['orderNumber'] ?? ''}',
                style: const TextStyle(
                    fontFamily: 'SpaceGrotesk',
                    fontWeight: FontWeight.w700,
                    fontSize: 15),
              ),
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
                        fontSize: 9, fontWeight: FontWeight.w900,
                        color: SQColor.inkSoft),
                  ),
                ),
              const Spacer(),
              Text(
                '₹${((order['totalAmount'] ?? 0) as num).toStringAsFixed(0)}',
                style: TextStyle(
                    fontFamily: 'SpaceGrotesk',
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: primary),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${customer['name'] ?? 'Customer'} • +91 ${customer['phone'] ?? ''}',
            style: const TextStyle(
                fontSize: 11.5, color: SQColor.inkSoft),
          ),
          Text(
            '${address['flatBuilding'] ?? ''}, ${address['streetArea'] ?? ''}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
                fontSize: 11.5, color: SQColor.inkFaint),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              for (final item in items.take(4))
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: SQColor.fog,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${((item as Map<String, dynamic>)['product'] ?? {})['title'] ?? ''} ×${item['quantity']}',
                    style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: SQColor.ink),
                  ),
                ),
              if (items.length > 4)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 4),
                  child: Text('+${items.length - 4} more',
                      style: const TextStyle(
                          fontSize: 10.5, color: SQColor.inkFaint)),
                ),
            ],
          ),
          if (nextLabel != null) ...[
            const SizedBox(height: 10),
            Pressable(
              onTap: busy ? null : onAdvance,
              child: Container(
                height: 46,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(SQRadius.sm),
                ),
                child: busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        nextLabel!,
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
        ],
      ),
    );
  }
}
