import 'dart:async';

import 'package:flutter/material.dart';

import '../api_client.dart';

/// Live order tracker: animated status stepper + ETA + delivery OTP display.
/// Polls the orders list (SSE stream can replace this in a later iteration).
class TrackingScreen extends StatefulWidget {
  final String orderNumber;
  final Color primary;
  final Color accent;

  const TrackingScreen({
    super.key,
    required this.orderNumber,
    required this.primary,
    required this.accent,
  });

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen>
    with SingleTickerProviderStateMixin {
  final _api = ApiClient.instance;
  Map<String, dynamic>? _order;
  Timer? _pollTimer;
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..repeat(reverse: true);

  static const _flow = [
    'PENDING',
    'CONFIRMED',
    'PACKING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ];

  @override
  void initState() {
    super.initState();
    _load();
    _pollTimer = Timer.periodic(
        const Duration(seconds: 6), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _pulse.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final orders = await _api.fetchOrders();
      if (!mounted) return;
      final match = orders.firstWhere(
        (o) => o['orderNumber'] == widget.orderNumber,
        orElse: () => null,
      );
      setState(() => _order = match as Map<String, dynamic>?);
    } catch (_) {
      if (!silent && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not refresh order status')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = (_order?['status'] ?? 'PENDING') as String;
    final currentIndex = _flow.indexOf(status);

    return Scaffold(
      appBar: AppBar(title: Text('Order #${widget.orderNumber}')),
      body: RefreshIndicator(
        onRefresh: () => _load(),
        color: widget.primary,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ETA banner
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [widget.primary, widget.primary.withValues(alpha: 0.8)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  FadeTransition(
                    opacity: Tween(begin: 0.6, end: 1.0)
                        .animate(CurvedAnimation(
                            parent: _pulse, curve: Curves.easeInOut)),
                    child: Row(
                      children: [
                        const Icon(Icons.bolt, color: Colors.white, size: 20),
                        const SizedBox(width: 6),
                        Text(
                          status == 'DELIVERED'
                              ? 'Delivered'
                              : 'Arriving in 10-15 minutes',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    status == 'DELIVERED'
                        ? 'Thanks for shopping with SabQuick!'
                        : 'We will notify you at every step.',
                    style: const TextStyle(
                        color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Animated status stepper
            ...List.generate(_flow.length, (i) {
              final done = i <= currentIndex;
              final isCurrent = i == currentIndex;
              final label = _flow[i].replaceAll('_', ' ').toLowerCase();
              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Column(
                      children: [
                        if (i > 0)
                          Container(
                            width: 2,
                            height: 14,
                            color: i <= currentIndex
                                ? widget.primary
                                : const Color(0xFFE2E8F0),
                          ),
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          width: isCurrent ? 18 : 14,
                          height: isCurrent ? 18 : 14,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: done
                                ? widget.primary
                                : const Color(0xFFE2E8F0),
                            boxShadow: isCurrent
                                ? [
                                    BoxShadow(
                                      color: widget.primary.withValues(alpha: 0.4),
                                      blurRadius: 8,
                                    ),
                                  ]
                                : null,
                          ),
                          child: done
                              ? const Icon(Icons.check,
                                  size: 10,
                                  color: Colors.white)
                              : null,
                        ),
                        if (i < _flow.length - 1)
                          Container(
                            width: 2,
                            height: 22,
                            color: i < currentIndex
                                ? widget.primary
                                : const Color(0xFFE2E8F0),
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 4, bottom: 12),
                        child: Text(
                          label,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isCurrent
                                ? FontWeight.w900
                                : FontWeight.w600,
                            color: done
                                ? const Color(0xFF0F172A)
                                : const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),

            // Delivery OTP
            if (_order?['deliveryOtp'] != null &&
                status != 'DELIVERED') ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'DELIVERY OTP',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF065F46),
                            ),
                          ),
                          Text(
                            'Share this with your rider',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.green.shade700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${_order!['deliveryOtp']}',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 6,
                        color: Color(0xFF065F46),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
