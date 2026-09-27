import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api_client.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../widgets/pressable.dart';

/// OWNER secondary console: customers CRM. Stats strip (total / verified /
/// repeat buyers / lifetime revenue), searchable list with spend and order
/// counts, expandable recent orders and tap-to-call — all native.
class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  final _api = ApiClient.instance;
  final _search = TextEditingController();
  List<dynamic> _customers = [];
  Map<String, dynamic>? _stats;
  bool _loading = true;
  String? _error;
  String _query = '';
  String? _expandedId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.fetchCustomers();
      if (!mounted) return;
      setState(() {
        _customers = (data['customers'] as List?) ?? const [];
        _stats = (data['stats'] ?? data['kpis']) as Map<String, dynamic>?;
        _loading = false;
      });
    } on SessionExpiredException {
      return;
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

  List<dynamic> get _filtered {
    if (_query.trim().isEmpty) return _customers;
    final q = _query.trim().toLowerCase();
    return _customers.where((c) {
      final name = ((c as Map<String, dynamic>)['name'] ?? '') as String;
      final phone = (c['phone'] ?? '') as String;
      final email = (c['email'] ?? '') as String;
      return name.toLowerCase().contains(q) ||
          phone.contains(q) ||
          email.toLowerCase().contains(q);
    }).toList();
  }

  void _call(String? phone) async {
    if (phone == null || phone.isEmpty) return;
    final uri = Uri.parse('tel:+91$phone');
    try {
      await launchUrl(uri);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.fog,
      appBar: AppBar(
        title: const Text('Customers CRM'),
        backgroundColor: SQColor.card,
        surfaceTintColor: Colors.transparent,
      ),
      body: SafeArea(
        bottom: false,
        child: _loading
            ? ListView(
                padding: const EdgeInsets.all(SQSpace.md),
                children: [
                  const SizedBox(height: SQSpace.sm),
                  Row(
                    children: [
                      for (int i = 0; i < 2; i++) ...[
                        if (i > 0) const SizedBox(width: 8),
                        const Expanded(
                            child: SQSkeleton(height: 72, radius: SQRadius.sm)),
                      ],
                    ],
                  ),
                  const SizedBox(height: SQSpace.lg),
                  for (int i = 0; i < 5; i++) ...[
                    const Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: SQSkeleton(height: 64, radius: SQRadius.sm),
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
                        title: 'Could not load customers',
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
                : RefreshIndicator(
                    onRefresh: _load,
                    color: SQColor.green,
                    child: _buildList(),
                  ),
      ),
    );
  }

  Widget _buildList() {
    final stats = _stats ?? const {};
    final customers = _filtered;
    final total = (stats['totalCustomers'] ?? 0) as num;
    final verified = (stats['verifiedCustomers'] ?? 0) as num;
    final repeat = (stats['repeatCustomers'] ?? 0) as num;
    final revenue = (stats['totalRevenue'] ?? stats['totalLifetimeRevenue'] ?? 0) as num;

    return ListView(
      padding: const EdgeInsets.fromLTRB(
          SQSpace.md, SQSpace.sm, SQSpace.md, SQSpace.xl),
      children: [
        Row(
          children: [
            _StatCard(
                label: 'Customers',
                value: '$total',
                color: SQColor.green),
            const SizedBox(width: 8),
            _StatCard(
                label: 'Verified',
                value: '$verified',
                color: const Color(0xFF3B82F6)),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _StatCard(label: 'Repeat', value: '$repeat', color: SQColor.violet),
            const SizedBox(width: 8),
            _StatCard(
                label: 'Lifetime GMV',
                value: '₹${revenue.round()}',
                color: SQColor.amber),
          ],
        ),
        const SizedBox(height: SQSpace.md),
        TextField(
          controller: _search,
          onChanged: (v) => setState(() => _query = v),
          decoration: const InputDecoration(
            hintText: 'Search name, phone or email',
            prefixIcon: Icon(Icons.search_rounded),
          ),
        ),
        const SizedBox(height: SQSpace.md),
        if (customers.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 80),
            child: SQEmpty(
              icon: Icons.people_outline_rounded,
              title: 'No customers found',
              subtitle: 'Try a different search.',
            ),
          ),
        for (final c in customers)
          _CustomerCard(
            customer: c as Map<String, dynamic>,
            expanded: _expandedId == c['id'],
            onToggle: () => setState(() {
              _expandedId = _expandedId == c['id'] ? null : c['id'] as String;
            }),
            onCall: () => _call(c['phone'] as String?),
          ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: SQColor.card,
          borderRadius: BorderRadius.circular(SQRadius.sm),
          border: Border.all(color: SQColor.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value,
                style: TextStyle(
                  fontFamily: 'SpaceGrotesk',
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: color,
                )),
            Text(label, style: SQType.micro.copyWith(letterSpacing: 0.4)),
          ],
        ),
      ),
    );
  }
}

class _CustomerCard extends StatelessWidget {
  final Map<String, dynamic> customer;
  final bool expanded;
  final VoidCallback onToggle;
  final VoidCallback onCall;

  const _CustomerCard({
    required this.customer,
    required this.expanded,
    required this.onToggle,
    required this.onCall,
  });

  @override
  Widget build(BuildContext context) {
    final name = (customer['name'] ?? 'Customer') as String;
    final phone = (customer['phone'] ?? '') as String;
    final orders = (customer['orderCount'] ?? 0) as num;
    final spent = (customer['totalSpent'] ?? 0) as num;
    final verified = customer['phoneVerified'] == true;
    final recentOrders = (customer['recentOrders'] as List?) ?? const [];

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.circular(SQRadius.sm),
        border: Border.all(color: SQColor.line),
      ),
      child: Column(
        children: [
          NeonPressable(
            skewAmount: -0.01,
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: SQColor.green.withValues(alpha: 0.1),
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : 'C',
                      style: const TextStyle(
                          fontFamily: 'SpaceGrotesk',
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: SQColor.green),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(name,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: SQColor.ink)),
                            ),
                            if (verified) ...[
                              const SizedBox(width: 5),
                              const Icon(Icons.verified_rounded,
                                  size: 13, color: SQColor.green),
                            ],
                          ],
                        ),
                        Text(
                          phone.isNotEmpty ? '+91 $phone' : 'No phone linked',
                          style: const TextStyle(
                              fontSize: 11, color: SQColor.inkSoft),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('₹${spent.round()}',
                          style: const TextStyle(
                              fontFamily: 'SpaceGrotesk',
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: SQColor.green)),
                      Text('$orders order${orders == 1 ? '' : 's'}',
                          style: const TextStyle(
                              fontSize: 10, color: SQColor.inkFaint)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (expanded) ...[
            const Divider(height: 1, color: SQColor.line),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (recentOrders.isEmpty)
                    const Text('No orders yet.',
                        style: TextStyle(fontSize: 11, color: SQColor.inkSoft))
                  else
                    for (final o in recentOrders)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            const Icon(Icons.receipt_long_outlined,
                                size: 13, color: SQColor.inkFaint),
                            const SizedBox(width: 6),
                            Text('#${o['orderNumber']}',
                                style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: SQColor.ink)),
                            const SizedBox(width: 8),
                            Text('${o['status'] ?? ''}',
                                style: const TextStyle(
                                    fontSize: 10.5, color: SQColor.inkSoft)),
                            const Spacer(),
                            Text('₹${((o['totalAmount'] ?? 0) as num).round()}',
                                style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: SQColor.ink)),
                          ],
                        ),
                      ),
                  if (phone.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Pressable(
                        onTap: onCall,
                        child: Container(
                          height: 36,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: SQColor.green.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(SQRadius.xs),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.call_rounded,
                                  size: 15, color: SQColor.green),
                              SizedBox(width: 6),
                              Text('Call customer',
                                  style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      color: SQColor.green)),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
