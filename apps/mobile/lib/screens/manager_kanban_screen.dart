import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api_client.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../widgets/pressable.dart';

/// MANAGER tab: dispatch kanban. Upstream counters (confirm / packing) keep
/// the head of the funnel one tap away; the three-column board (Ready →
/// In transit → Delivered) drives dispatch with rider assignment, live SLA
/// urgency against the <3 min packing target and tap-to-call riders.
/// Mirrors the web Manager Dispatch page on `/api/ops/orders` — native.
class ManagerKanbanScreen extends StatefulWidget {
  final Color primary;
  final Color accent;

  const ManagerKanbanScreen({
    super.key,
    required this.primary,
    required this.accent,
  });

  @override
  State<ManagerKanbanScreen> createState() => _ManagerKanbanScreenState();
}

class _ManagerKanbanScreenState extends State<ManagerKanbanScreen> {
  final _api = ApiClient.instance;
  Map<String, dynamic> _grouped = {};
  List<dynamic> _riders = [];
  bool _loading = true;
  String? _error;
  String? _busyOrderId;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _load();
    // Live floor: silent refresh while visible (same cadence as the web).
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
        _grouped = (data['grouped'] as Map<String, dynamic>?) ?? {};
        _riders = (data['riders'] as List?) ?? const [];
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
        if (!silent) _error = 'Network error loading the board';
      });
    }
  }

  List get _pending => (_grouped['PENDING'] as List?) ?? const [];
  List get _packing => (_grouped['PACKING'] as List?) ?? const [];
  List get _ready => (_grouped['READY_FOR_PICKUP'] as List?) ?? const [];
  List get _transit => (_grouped['OUT_FOR_DELIVERY'] as List?) ?? const [];

  List get _deliveredToday {
    final all = (_grouped['DELIVERED'] as List?) ?? const [];
    final now = DateTime.now();
    return all.where((o) {
      final raw = (o as Map)['createdAt'];
      if (raw is! String) return true;
      final created = DateTime.tryParse(raw);
      return created != null &&
          created.year == now.year &&
          created.month == now.month &&
          created.day == now.day;
    }).toList();
  }

  int get _activeCount =>
      _pending.length + _packing.length + _ready.length + _transit.length;

  Future<void> _advance(Map<String, dynamic> order) async {
    final status = order['status'] as String;
    final next = switch (status) {
      'PENDING' => 'CONFIRMED',
      'CONFIRMED' => 'PACKING',
      'PACKING' => 'READY_FOR_PICKUP',
      _ => null,
    };
    if (next == null) return;
    setState(() => _busyOrderId = order['id'] as String);
    try {
      await _api.updateOrderStatus(order['id'] as String, next);
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

  Future<void> _assignRider(Map<String, dynamic> order) async {
    final riderId = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _RiderPickerSheet(
        riders: _riders,
        primary: widget.primary,
      ),
    );
    if (riderId == null) return;
    setState(() => _busyOrderId = order['id'] as String);
    try {
      await _api.updateOrderStatus(
        order['id'] as String,
        'OUT_FOR_DELIVERY',
        riderId: riderId,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Rider assigned — out for delivery'),
          backgroundColor: SQColor.success,
        ),
      );
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

  void _call(String? phone) async {
    if (phone == null || phone.isEmpty) return;
    try {
      await launchUrl(Uri.parse('tel:+91$phone'));
    } catch (_) {}
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
              ? _buildSkeleton()
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

  Widget _buildSkeleton() {
    return ListView(
      padding: const EdgeInsets.all(SQSpace.md),
      children: [
        const SizedBox(height: SQSpace.sm),
        SQSkeleton(height: 30, radius: 8),
        const SizedBox(height: SQSpace.lg),
        SizedBox(
          height: 420,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: 3,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (_, _) => const SQSkeleton(
                width: 260, height: 420, radius: SQRadius.md),
          ),
        ),
      ],
    );
  }

  Widget _buildBoard() {
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
                  Text('Dispatch', style: SQType.display.copyWith(fontSize: 26)),
                  const SizedBox(height: 2),
                  Text(
                    '$_activeCount active · target <3 min packing',
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

        // ── Upstream queue (head of funnel) ──
        if (_pending.isNotEmpty || _packing.isNotEmpty) ...[
          const SQSectionHeader(title: 'Upstream queue'),
          for (final o in _pending.take(3))
            _UpstreamCard(
              order: o as Map<String, dynamic>,
              busy: _busyOrderId == o['id'],
              nextLabel: 'CONFIRM',
              color: const Color(0xFFF59E0B),
              onAdvance: () => _advance(o),
            ),
          for (final o in _packing.take(3))
            _UpstreamCard(
              order: o as Map<String, dynamic>,
              busy: _busyOrderId == o['id'],
              nextLabel: 'MARK READY',
              color: const Color(0xFF8B5CF6),
              onAdvance: () => _advance(o),
            ),
          if (_pending.length + _packing.length > 6)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                '+${_pending.length + _packing.length - 6} more upstream — web board or floor for the rest',
                style: SQType.micro.copyWith(color: SQColor.inkFaint),
              ),
            ),
          const SizedBox(height: SQSpace.md),
        ],

        // ── Kanban columns ──
        _KanbanColumn(
          title: 'Ready for pickup',
          count: _ready.length,
          color: const Color(0xFF10B981),
          orders: _ready,
          busyOrderId: _busyOrderId,
          onAssign: _assignRider,
          onCall: _call,
        ),
        _KanbanColumn(
          title: 'In transit',
          count: _transit.length,
          color: const Color(0xFF6366F1),
          orders: _transit,
          busyOrderId: _busyOrderId,
          onAssign: _assignRider,
          onCall: _call,
        ),
        _KanbanColumn(
          title: 'Delivered today',
          count: _deliveredToday.length,
          color: const Color(0xFF64748B),
          orders: _deliveredToday,
          busyOrderId: _busyOrderId,
          onAssign: _assignRider,
          onCall: _call,
        ),

        if (_activeCount == 0 && _deliveredToday.isEmpty) ...[
          const SizedBox(height: 60),
          const SQEmpty(
            icon: Icons.inventory_2_outlined,
            title: 'All clear!',
            subtitle: 'No orders on the board right now.',
          ),
        ],
      ],
    );
  }
}

// ═════════════════ Upstream queue card ═════════════════

class _UpstreamCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final bool busy;
  final String nextLabel;
  final Color color;
  final VoidCallback onAdvance;

  const _UpstreamCard({
    required this.order,
    required this.busy,
    required this.nextLabel,
    required this.color,
    required this.onAdvance,
  });

  @override
  Widget build(BuildContext context) {
    final items = (order['items'] as List?) ?? const [];
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.circular(SQRadius.sm),
        border: Border.all(color: SQColor.line),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('#${order['orderNumber'] ?? ''}',
                        style: const TextStyle(
                            fontFamily: 'SpaceGrotesk',
                            fontWeight: FontWeight.w700,
                            fontSize: 13.5)),
                    const SizedBox(width: 8),
                    Text('${items.length} item${items.length == 1 ? '' : 's'}',
                        style: const TextStyle(
                            fontSize: 11, color: SQColor.inkSoft)),
                    const Spacer(),
                    Text(
                        '₹${((order['totalAmount'] ?? 0) as num).toStringAsFixed(0)}',
                        style: const TextStyle(
                            fontFamily: 'SpaceGrotesk',
                            fontWeight: FontWeight.w700,
                            fontSize: 13)),
                  ],
                ),
                Text(
                  '${((order['customer'] ?? {}) as Map)['name'] ?? 'Customer'} · ${order['elapsedMinutes'] ?? 0} min elapsed',
                  style: const TextStyle(fontSize: 11, color: SQColor.inkSoft),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Pressable(
            onTap: busy ? null : onAdvance,
            child: Container(
              height: 36,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(SQRadius.xs),
              ),
              child: busy
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : Text(nextLabel,
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 11,
                          letterSpacing: 0.4)),
            ),
          ),
        ],
      ),
    );
  }
}

// ═════════════════ Kanban column ═════════════════

class _KanbanColumn extends StatelessWidget {
  final String title;
  final int count;
  final Color color;
  final List orders;
  final String? busyOrderId;
  final void Function(Map<String, dynamic>) onAssign;
  final void Function(String?) onCall;

  const _KanbanColumn({
    required this.title,
    required this.count,
    required this.color,
    required this.orders,
    required this.busyOrderId,
    required this.onAssign,
    required this.onCall,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 10, bottom: 8),
          child: Row(
            children: [
              Container(
                  width: 10,
                  height: 10,
                  decoration:
                      BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Expanded(
                child: Text('$title  ($count)',
                    style: SQType.micro.copyWith(color: SQColor.ink)),
              ),
            ],
          ),
        ),
        if (orders.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: SQColor.card.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(SQRadius.sm),
              border: Border.all(color: SQColor.line.withValues(alpha: 0.6)),
            ),
            child: Text('Nothing here',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11.5, color: SQColor.inkFaint)),
          ),
        for (final order in orders)
          _DispatchCard(
            order: order as Map<String, dynamic>,
            color: color,
            showAssign: title == 'Ready for pickup',
            showRider: title == 'In transit' || title == 'Delivered today',
            busy: busyOrderId == order['id'],
            onAssign: () => onAssign(order),
            onCall: onCall,
          ),
      ],
    );
  }
}

class _DispatchCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final Color color;
  final bool showAssign;
  final bool showRider;
  final bool busy;
  final VoidCallback onAssign;
  final void Function(String?) onCall;

  const _DispatchCard({
    required this.order,
    required this.color,
    required this.showAssign,
    required this.showRider,
    required this.busy,
    required this.onAssign,
    required this.onCall,
  });

  /// SLA urgency from elapsed minutes: <5 normal, 5–10 warning, >10 critical.
  (String, Color) get _urgency {
    final elapsed = ((order['elapsedMinutes'] ?? 0) as num).toInt();
    if (elapsed > 10) return ('CRITICAL', SQColor.danger);
    if (elapsed > 5) return ('SLOW', SQColor.amber);
    return ('ON TIME', SQColor.success);
  }

  @override
  Widget build(BuildContext context) {
    final customer = (order['customer'] ?? {}) as Map<String, dynamic>;
    final address = (order['address'] ?? {}) as Map<String, dynamic>;
    final rider = order['rider'] as Map<String, dynamic>?;
    final items = (order['items'] as List?) ?? const [];
    final (urgencyLabel, urgencyColor) = _urgency;
    final payment = (order['paymentMethod'] ?? '') as String;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
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
              Text('#${order['orderNumber'] ?? ''}',
                  style: const TextStyle(
                      fontFamily: 'SpaceGrotesk',
                      fontWeight: FontWeight.w700,
                      fontSize: 14.5)),
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
              Text('${order['elapsedMinutes'] ?? 0}m',
                  style: TextStyle(
                      fontFamily: 'SpaceGrotesk',
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: urgencyColor)),
              const SizedBox(width: 6),
              Container(
                width: 7,
                height: 7,
                decoration:
                    BoxDecoration(color: urgencyColor, shape: BoxShape.circle),
              ),
              const SizedBox(width: 6),
              Text('₹${((order['totalAmount'] ?? 0) as num).toStringAsFixed(0)}',
                  style: const TextStyle(
                      fontFamily: 'SpaceGrotesk',
                      fontWeight: FontWeight.w700,
                      fontSize: 13.5)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${customer['name'] ?? 'Customer'} · ${address['flatBuilding'] ?? ''}, ${address['streetArea'] ?? ''}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11.5, color: SQColor.inkSoft),
          ),
          const SizedBox(height: 6),
          Text(
            '${items.length} item${items.length == 1 ? '' : 's'} · ${urgencyLabel.toLowerCase()}',
            style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
                color: urgencyColor.withValues(alpha: 0.9)),
          ),

          // ── Rider row / assign action ──
          if (showRider && rider != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: rider['isOnline'] == true
                        ? SQColor.success
                        : SQColor.inkFaint,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${rider['name'] ?? 'Rider'} · ${rider['vehicleDetails'] ?? 'Courier'}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 11.5, fontWeight: FontWeight.w700),
                  ),
                ),
                _IconAction(
                  icon: Icons.call_rounded,
                  onTap: () => onCall(rider['phone'] as String?),
                ),
              ],
            ),
          ],
          if (showAssign) ...[
            const SizedBox(height: 10),
            Pressable(
              onTap: busy ? null : onAssign,
              child: Container(
                height: 44,
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
                            strokeWidth: 2, color: Colors.white))
                    : const Text(
                        'ASSIGN RIDER',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 12.5,
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

class _IconAction extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _IconAction({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(icon, size: 17, color: SQColor.green),
      ),
    );
  }
}

// ═════════════════ Rider picker sheet ═════════════════

class _RiderPickerSheet extends StatelessWidget {
  final List<dynamic> riders;
  final Color primary;

  const _RiderPickerSheet({required this.riders, required this.primary});

  @override
  Widget build(BuildContext context) {
    // Online riders first, then by name — mirrors the web dropdown order.
    final sorted = [...riders]..sort((a, b) {
        final aOnline = (a as Map)['isOnline'] == true ? 0 : 1;
        final bOnline = (b as Map)['isOnline'] == true ? 0 : 1;
        if (aOnline != bOnline) return aOnline - bOnline;
        return ((a['name'] ?? '') as String)
            .compareTo((b['name'] ?? '') as String);
      });

    return Container(
      decoration: const BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.vertical(top: Radius.circular(SQRadius.lg)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 14),
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: SQColor.line,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(SQSpace.lg),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Assign a rider', style: SQType.h1),
              ),
            ),
            Flexible(
              child: ListView(
                shrinkWrap: true,
                padding:
                    const EdgeInsets.fromLTRB(SQSpace.lg, 0, SQSpace.lg, SQSpace.xl),
                children: [
                  if (sorted.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 20, bottom: 30),
                      child: SQEmpty(
                        icon: Icons.two_wheeler_outlined,
                        title: 'No riders yet',
                        subtitle: 'Add riders in Staff first.',
                      ),
                    ),
                  for (final r in sorted)
                    _RiderRow(rider: r as Map<String, dynamic>, primary: primary),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RiderRow extends StatelessWidget {
  final Map<String, dynamic> rider;
  final Color primary;

  const _RiderRow({required this.rider, required this.primary});

  @override
  Widget build(BuildContext context) {
    final online = rider['isOnline'] == true;
    return NeonPressable(
      skewAmount: -0.02,
      onTap: () => Navigator.pop(context, rider['id'] as String),
      glowColor: SQColor.lime.withValues(alpha: 0.3),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: SQColor.card,
          borderRadius: BorderRadius.circular(SQRadius.sm),
          border: Border.all(
              color: online ? primary.withValues(alpha: 0.4) : SQColor.line),
        ),
        child: Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: online ? SQColor.success : SQColor.inkFaint,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(rider['name'] ?? 'Rider',
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: SQColor.ink)),
                  Text(
                    '${rider['vehicleDetails'] ?? 'Courier'} · ${online ? 'online' : 'offline'}',
                    style:
                        const TextStyle(fontSize: 11, color: SQColor.inkSoft),
                  ),
                ],
              ),
            ),
            const Text('DISPATCH',
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                    color: SQColor.green)),
          ],
        ),
      ),
    );
  }
}
