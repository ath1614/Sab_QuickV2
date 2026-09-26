import 'package:flutter/material.dart';

import '../api_client.dart';
import '../widgets/pressable.dart';

/// Rider dashboard: shift toggle, today's earnings, active delivery with
/// OTP hand-off, and one-tap acceptance of orders ready for pickup.
class RiderDashboardScreen extends StatefulWidget {
  final Color primary;
  final Color accent;

  const RiderDashboardScreen({
    super.key,
    required this.primary,
    required this.accent,
  });

  @override
  State<RiderDashboardScreen> createState() => _RiderDashboardScreenState();
}

class _RiderDashboardScreenState extends State<RiderDashboardScreen> {
  final _api = ApiClient.instance;
  Map<String, dynamic>? _status;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.fetchRiderStatus();
      if (!mounted) return;
      setState(() {
        _status = data;
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
        _error = 'Network error';
      });
    }
  }

  Future<void> _run(Future<void> Function() action, String successMsg) async {
    setState(() => _busy = true);
    try {
      await action();
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(successMsg)));
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.message),
        backgroundColor: const Color(0xFFDC2626),
      ));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _enterOtp(Map<String, dynamic> order) async {
    final controller = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
            'Delivery OTP — #${order['orderNumber'] ?? ''}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Ask the customer for their 4-digit delivery code.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              maxLength: 4,
              textAlign: TextAlign.center,
              autofocus: true,
              style: const TextStyle(
                  fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: 10),
              decoration: const InputDecoration(hintText: '••••', counterText: ''),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Verify'),
          ),
        ],
      ),
    );
    if (result != true) return;
    await _run(
      () => _api.verifyDeliveryOtp(order['id'] as String, controller.text.trim()),
      'Delivery completed! 🎉',
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return ListView(
        children: [
          const SizedBox(height: 120),
          Center(
            child: Text(_error!,
                style: const TextStyle(
                    color: Color(0xFFDC2626), fontWeight: FontWeight.w800)),
          ),
        ],
      );
    }

    final isOnline = _status?['isOnline'] == true;
    final stats = (_status?['stats'] ?? {}) as Map<String, dynamic>;
    final activeOrder = _status?['activeOrder'] as Map<String, dynamic>?;
    final available =
        (_status?['availableOrders'] ?? []) as List<dynamic>;

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        onRefresh: _load,
        color: widget.primary,
        child: ListView(
          padding: const EdgeInsets.all(16),
        children: [
          // Shift toggle banner
          Pressable(
            onTap: _busy ? null : () => _run(_api.toggleRiderShift, isOnline ? 'Shift ended' : 'You are ONLINE'),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isOnline
                      ? [widget.primary, widget.primary.withValues(alpha: 0.75)]
                      : [const Color(0xFF475569), const Color(0xFF334155)],
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  Icon(
                    isOnline ? Icons.wifi_tethering : Icons.wifi_tethering_off,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isOnline ? 'ONLINE — accepting orders' : 'OFFLINE',
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 15),
                        ),
                        Text(
                          'Tap to ${isOnline ? 'end' : 'start'} shift',
                          style: const TextStyle(
                              color: Colors.white70, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Earnings row
          Row(
            children: [
              _StatCard(
                  label: 'Delivered today',
                  value: '${stats['completedOrdersCount'] ?? 0}',
                  primary: widget.primary),
              const SizedBox(width: 10),
              _StatCard(
                  label: 'Est. earnings',
                  value: '₹${((stats['estimatedEarnings'] ?? 0) as num).toStringAsFixed(0)}',
                  primary: widget.primary),
            ],
          ),
          const SizedBox(height: 14),

          // Active order
          if (activeOrder != null) ...[
            const Text('YOUR ACTIVE DELIVERY',
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            _RiderOrderCard(
              order: activeOrder,
              primary: widget.primary,
              accent: widget.accent,
              actionLabel: 'ENTER DELIVERY OTP',
              actionColor: const Color(0xFF059669),
              onAction: _busy
                  ? null
                  : () => _enterOtp(activeOrder),
            ),
          ],

          // Available orders
          if (available.isNotEmpty) ...[
            const Text('READY FOR PICKUP',
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            for (final o in available)
              _RiderOrderCard(
                order: o as Map<String, dynamic>,
                primary: widget.primary,
                accent: widget.accent,
                actionLabel: 'ACCEPT',
                actionColor: widget.primary,
                onAction: _busy
                    ? null
                    : () => _run(
                        () => _api.acceptOrder(o['id'] as String),
                        'Order #${o['orderNumber']} accepted'),
              ),
          ],

          if (activeOrder == null && available.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE8EDF2)),
              ),
              child: const Center(
                child: Text(
                  'No deliveries assigned.\nNew orders appear here automatically.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color primary;

  const _StatCard(
      {required this.label, required this.value, required this.primary});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE8EDF2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF64748B))),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: primary)),
          ],
        ),
      ),
    );
  }
}

class _RiderOrderCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final Color primary;
  final Color accent;
  final String actionLabel;
  final Color actionColor;
  final VoidCallback? onAction;

  const _RiderOrderCard({
    required this.order,
    required this.primary,
    required this.accent,
    required this.actionLabel,
    required this.actionColor,
    this.onAction,
  });

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
              Text('#${order['orderNumber'] ?? ''}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w900, fontSize: 14)),
              const Spacer(),
              Text(
                  '₹${((order['totalAmount'] ?? 0) as num).toStringAsFixed(0)}',
                  style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                      color: primary)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${customer['name'] ?? 'Customer'} • ${items.length} items',
            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
          ),
          Text(
            '${address['flatBuilding'] ?? ''}, ${address['streetArea'] ?? ''}',
            style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 10),
          Pressable(
            onTap: onAction,
            child: Container(
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: onAction == null ? Colors.grey.shade300 : actionColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                actionLabel,
                style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                    letterSpacing: 0.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
