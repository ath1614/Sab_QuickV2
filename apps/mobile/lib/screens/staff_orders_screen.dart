import 'package:flutter/material.dart';

import '../api_client.dart';
import '../widgets/pressable.dart';

/// Staff fulfillment console shared by PACKER, MANAGER and OWNER.
/// Shows the live operations queue grouped by status with one-tap
/// status advancement (PACKING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY).
class StaffOrdersScreen extends StatefulWidget {
  final Color primary;
  final Color accent;

  const StaffOrdersScreen({
    super.key,
    required this.primary,
    required this.accent,
  });

  @override
  State<StaffOrdersScreen> createState() => _StaffOrdersScreenState();
}

class _StaffOrdersScreenState extends State<StaffOrdersScreen> {
  final _api = ApiClient.instance;
  Map<String, dynamic>? _grouped;
  bool _loading = true;
  String? _error;
  String? _busyOrderId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.fetchOpsOrders();
      if (!mounted) return;
      setState(() {
        _grouped = data['grouped'] as Map<String, dynamic>?;
        _loading = false;
        _error = null;
      });
    } on ApiException catch (e) {
      setState(() {
        _loading = false;
        _error = e.message;
      });
    } catch (_) {
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
        content: Text('Order #${order['orderNumber']} → ${next.replaceAll('_', ' ')}'),
      ));
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.message),
        backgroundColor: const Color(0xFFDC2626),
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

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      color: widget.primary,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ListView(
                  children: [
                    const SizedBox(height: 120),
                    Center(
                      child: Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            color: Color(0xFFDC2626),
                            fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                )
              : _buildQueue(),
    );
  }

  Widget _buildQueue() {
    const sections = [
      ('PENDING', 'New — need confirmation', Color(0xFFF59E0B)),
      ('CONFIRMED', 'Confirmed — start packing', Color(0xFF3B82F6)),
      ('PACKING', 'Packing in progress', Color(0xFF8B5CF6)),
      ('READY_FOR_PICKUP', 'Ready for rider pickup', Color(0xFF10B981)),
      ('OUT_FOR_DELIVERY', 'In transit', Color(0xFF6366F1)),
      ('DELIVERED', 'Completed today', Color(0xFF64748B)),
    ];

    final grouped = _grouped ?? {};
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        for (final (status, label, color) in sections)
          ..._buildSection(
              status, label, color, (grouped[status] as List?) ?? const []),
      ],
    );
  }

  List<Widget> _buildSection(
      String status, String label, Color color, List orders) {
    if (orders.isEmpty) return [];
    return [
      Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 8),
        child: Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration:
                  BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Text(
              '$label (${orders.length})',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: Color(0xFF334155),
                letterSpacing: 0.4,
              ),
            ),
          ],
        ),
      ),
      for (final order in orders) _OrderCard(
          order: order as Map<String, dynamic>,
          color: color,
          primary: widget.primary,
          busy: _busyOrderId == order['id'],
          onAdvance: () => _advance(order)),
    ];
  }
}

class _OrderCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final Color color;
  final Color primary;
  final bool busy;
  final VoidCallback onAdvance;

  const _OrderCard({
    required this.order,
    required this.color,
    required this.primary,
    required this.busy,
    required this.onAdvance,
  });

  String? get _nextLabel {
    switch (order['status'] as String) {
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
    final customer = (order['customer'] ?? {}) as Map<String, dynamic>;
    final address = (order['address'] ?? {}) as Map<String, dynamic>;
    final items = (order['items'] ?? []) as List;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8EDF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '#${order['orderNumber'] ?? ''}',
                style: const TextStyle(
                    fontWeight: FontWeight.w900, fontSize: 14),
              ),
              const Spacer(),
              Text(
                '₹${((order['totalAmount'] ?? 0) as num).toStringAsFixed(0)}',
                style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                    color: primary),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${customer['name'] ?? 'Customer'} • +91 ${customer['phone'] ?? ''}',
            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
          ),
          Text(
            '${address['flatBuilding'] ?? ''}, ${address['streetArea'] ?? ''}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              for (final item in items.take(4))
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${((item as Map<String, dynamic>)['product'] ?? {})['title'] ?? ''} ×${item['quantity']}',
                    style: const TextStyle(
                        fontSize: 10, fontWeight: FontWeight.w700),
                  ),
                ),
              if (items.length > 4)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  child: Text('+${items.length - 4} more',
                      style: const TextStyle(
                          fontSize: 10, color: Color(0xFF94A3B8))),
                ),
            ],
          ),
          if (_nextLabel != null) ...[
            const SizedBox(height: 10),
            Pressable(
              onTap: busy ? null : onAdvance,
              child: Container(
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        _nextLabel!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
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
