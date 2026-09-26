import 'package:flutter/material.dart';

import '../api_client.dart';
import 'tracking_screen.dart';

/// Orders history + active deliveries.
class OrdersScreen extends StatefulWidget {
  final Color primary;
  final Color accent;

  const OrdersScreen({super.key, required this.primary, required this.accent});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final _api = ApiClient.instance;
  List<dynamic> _orders = [];
  bool _loading = true;

  static const _activeStatuses = [
    'PENDING',
    'CONFIRMED',
    'PACKING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY'
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final orders = await _api.fetchOrders();
    if (!mounted) return;
    setState(() {
      _orders = orders;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final active = _orders
        .where((o) => _activeStatuses.contains(o['status']))
        .toList();
    final past =
        _orders.where((o) => !_activeStatuses.contains(o['status'])).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('My Orders')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              color: widget.primary,
              child: _orders.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 140),
                        Center(
                          child: Text(
                            'No orders yet',
                            style: TextStyle(
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF64748B)),
                          ),
                        ),
                      ],
                    )
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (active.isNotEmpty) ...[
                          const Text(
                            'LIVE DELIVERY IN PROGRESS',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF64748B),
                              letterSpacing: 0.6,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...active.map(_buildActiveCard),
                          const SizedBox(height: 20),
                        ],
                        if (past.isNotEmpty) ...[
                          const Text(
                            'ORDER HISTORY',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF64748B),
                              letterSpacing: 0.6,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...past.map(_buildPastCard),
                        ],
                      ],
                    ),
            ),
    );
  }

  Widget _buildActiveCard(dynamic order) {
    final o = order as Map<String, dynamic>;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: widget.primary.withValues(alpha: 0.3), width: 1.6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '#${o['orderNumber'] ?? ''}',
                style: const TextStyle(
                    fontWeight: FontWeight.w900, fontSize: 14),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: widget.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  (o['status'] ?? '').toString().replaceAll('_', ' '),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: widget.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Text(
                '₹${((o['totalAmount'] ?? 0) as num).toStringAsFixed(0)} • ${(o['items'] as List?)?.length ?? 0} items',
                style: const TextStyle(
                    fontSize: 12, color: Color(0xFF64748B)),
              ),
              const Spacer(),
              TextButton(
                onPressed: () {
                  Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => TrackingScreen(
                        orderNumber: o['orderNumber'] as String,
                        primary: widget.primary,
                        accent: widget.accent),
                  ));
                },
                child: const Text('Track live'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPastCard(dynamic order) {
    final o = order as Map<String, dynamic>;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8EDF2)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '#${o['orderNumber'] ?? ''}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w900, fontSize: 13),
                ),
                Text(
                  '${(o['items'] as List?)?.length ?? 0} items • ₹${((o['totalAmount'] ?? 0) as num).toStringAsFixed(0)}',
                  style: const TextStyle(
                      fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
          Text(
            '${o['status'] ?? ''}',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: o['status'] == 'DELIVERED'
                  ? const Color(0xFF059669)
                  : const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}
