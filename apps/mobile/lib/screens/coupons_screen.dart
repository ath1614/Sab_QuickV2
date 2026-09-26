import 'package:flutter/material.dart';

import '../api_client.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../widgets/pressable.dart';

/// Owner's coupon manager — mirrors the website's Coupons tab: create,
/// pause and review discount coupons with live usage counts.
class CouponsScreen extends StatefulWidget {
  final Color primary;
  final Color accent;

  const CouponsScreen(
      {super.key, required this.primary, required this.accent});

  @override
  State<CouponsScreen> createState() => _CouponsScreenState();
}

class _CouponsScreenState extends State<CouponsScreen> {
  final _api = ApiClient.instance;
  List<dynamic> _coupons = [];
  bool _loading = true;
  String? _error;
  String? _busyId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final list = await _api.fetchCoupons();
      if (!mounted) return;
      setState(() {
        _coupons = list;
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
        _error = 'Network error loading coupons';
      });
    }
  }

  Future<void> _openCreate() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateCouponSheet(),
    );
    if (created == true) _load(silent: true);
  }

  Future<void> _toggle(Map<String, dynamic> coupon) async {
    final id = coupon['id'] as String;
    setState(() => _busyId = id);
    try {
      await _api.toggleCoupon(id, coupon['isActive'] != true);
      await _load(silent: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.message),
        backgroundColor: SQColor.danger,
      ));
    } finally {
      if (mounted) setState(() => _busyId = null);
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
                  padding: const EdgeInsets.all(SQSpace.md),
                  children: [
                    SQSkeleton(height: 30, radius: 8),
                    const SizedBox(height: SQSpace.lg),
                    for (int i = 0; i < 3; i++)
                      const Padding(
                        padding: EdgeInsets.only(bottom: 12),
                        child: SQSkeleton(height: 108, radius: SQRadius.md),
                      ),
                  ],
                )
              : _error != null
                  ? ListView(
                      children: [
                        const SizedBox(height: 120),
                        SQEmpty(
                            icon: Icons.confirmation_number_outlined,
                            title: 'Could not load coupons',
                            subtitle: _error),
                        const SizedBox(height: SQSpace.lg),
                        Padding(
                          padding:
                              const EdgeInsets.symmetric(horizontal: SQSpace.xl),
                          child: SQButton(
                              label: 'Retry',
                              icon: Icons.refresh_rounded,
                              onTap: () => _load()),
                        ),
                      ],
                    )
                  : _buildList(),
        ),
      ),
    );
  }

  Widget _buildList() {
    final activeCount =
        _coupons.where((c) => c['isActive'] == true).length;
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
                  Text('Coupons',
                      style: SQType.display.copyWith(fontSize: 26)),
                  const SizedBox(height: 2),
                  Text('$activeCount live · ${_coupons.length} total',
                      style: SQType.body),
                ],
              ),
            ),
            NeonPressable(
              onTap: _openCreate,
              glowColor: SQColor.lime,
              child: Container(
                height: 46,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: SQColor.green,
                  borderRadius: BorderRadius.circular(SQRadius.sm),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.add_circle_outline_rounded,
                        color: Colors.white, size: 18),
                    SizedBox(width: 6),
                    Text('New',
                        style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 13)),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: SQSpace.md),
        for (final coupon in _coupons)
          _CouponCard(
            coupon: coupon as Map<String, dynamic>,
            busy: _busyId == coupon['id'],
            onToggle: () => _toggle(coupon),
          ),
        if (_coupons.isEmpty) ...[
          const SizedBox(height: 60),
          const SQEmpty(
            icon: Icons.local_offer_outlined,
            title: 'No coupons yet',
            subtitle: 'Create your first promo to drive orders.',
          ),
        ],
      ],
    );
  }
}

class _CouponCard extends StatelessWidget {
  final Map<String, dynamic> coupon;
  final bool busy;
  final VoidCallback onToggle;

  const _CouponCard({
    required this.coupon,
    required this.busy,
    required this.onToggle,
  });

  String get _discountText {
    final type = (coupon['discountType'] ?? 'FLAT') as String;
    final value = (coupon['discountValue'] ?? 0) as num;
    if (type == 'PERCENTAGE') {
      final max = coupon['maxDiscount'] as num?;
      return '${value.toStringAsFixed(0)}% OFF${max != null ? ' · up to ₹${max.toStringAsFixed(0)}' : ''}';
    }
    return 'Flat ₹${value.toStringAsFixed(0)} OFF';
  }

  @override
  Widget build(BuildContext context) {
    final code = (coupon['code'] ?? '') as String;
    final description = (coupon['description'] ?? '') as String;
    final minOrder = (coupon['minOrderAmount'] ?? 0) as num;
    final isActive = coupon['isActive'] == true;
    final usedCount = (coupon['usedCount'] ?? coupon['_count']?['orders'] ?? 0) as num;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.circular(SQRadius.md),
        border: Border.all(
          color: isActive ? SQColor.green.withValues(alpha: 0.35) : SQColor.line,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: SQColor.lime.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(SQRadius.xs),
                  border: Border.all(color: SQColor.green.withValues(alpha: 0.3)),
                ),
                child: Text(
                  code,
                  style: const TextStyle(
                      fontFamily: 'SpaceGrotesk',
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: SQColor.greenDeep),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(_discountText,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: SQColor.ink)),
              ),
              // Active toggle
              Pressable(
                onTap: busy ? null : onToggle,
                child: Container(
                  width: 46,
                  height: 46,
                  alignment: Alignment.center,
                  child: busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : AnimatedContainer(
                          duration: SQMotion.fast,
                          width: 40,
                          height: 24,
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            color: isActive
                                ? SQColor.green
                                : SQColor.inkFaint.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Align(
                            alignment: isActive
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Container(
                              width: 20,
                              height: 20,
                              decoration: const BoxDecoration(
                                  color: Colors.white, shape: BoxShape.circle),
                            ),
                          ),
                        ),
                ),
              ),
            ],
          ),
          if (description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 11.5, color: SQColor.inkSoft)),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              _Meta(label: 'Min order', value: minOrder > 0 ? '₹${minOrder.toStringAsFixed(0)}' : 'None'),
              const SizedBox(width: 18),
              _Meta(label: 'Used', value: '$usedCount'),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isActive
                      ? SQColor.success.withValues(alpha: 0.12)
                      : SQColor.fog,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isActive ? 'LIVE' : 'PAUSED',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                    color: isActive ? SQColor.success : SQColor.inkFaint,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  final String label;
  final String value;

  const _Meta({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: SQType.micro),
        const SizedBox(height: 1),
        Text(value,
            style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                color: SQColor.ink)),
      ],
    );
  }
}

/// Bottom sheet form for creating a coupon.
class _CreateCouponSheet extends StatefulWidget {
  @override
  State<_CreateCouponSheet> createState() => _CreateCouponSheetState();
}

class _CreateCouponSheetState extends State<_CreateCouponSheet> {
  final _code = TextEditingController();
  final _description = TextEditingController();
  final _value = TextEditingController(text: '50');
  final _minOrder = TextEditingController(text: '199');
  String _type = 'FLAT';
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    _description.dispose();
    _value.dispose();
    _minOrder.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final code = _code.text.trim().toUpperCase();
    final value = double.tryParse(_value.text.trim()) ?? 0;
    final minOrder = double.tryParse(_minOrder.text.trim()) ?? 0;

    if (code.length < 2) {
      setState(() => _error = 'Code must be at least 2 characters.');
      return;
    }
    if (!RegExp(r'^[A-Z0-9_-]+$').hasMatch(code)) {
      setState(() => _error = 'Use letters, numbers, - and _ only.');
      return;
    }
    if (value <= 0) {
      setState(() => _error = 'Discount must be greater than zero.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ApiClient.instance.createCoupon(
        code: code,
        description: _description.text.trim(),
        discountType: _type,
        discountValue: value,
        minOrderAmount: minOrder,
        maxDiscount: _type == 'PERCENTAGE' ? 100 : null,
        validTill: DateTime.now().add(const Duration(days: 30)),
        usageLimit: 500,
      );
      if (!mounted) return;
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      setState(() {
        _saving = false;
        _error = e.message;
      });
    } catch (_) {
      setState(() {
        _saving = false;
        _error = 'Could not create coupon. Try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: SQColor.card,
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(SQRadius.lg)),
        ),
        padding: const EdgeInsets.fromLTRB(
            SQSpace.lg, 14, SQSpace.lg, SQSpace.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
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
            const SizedBox(height: SQSpace.md),
            Text('New coupon', style: SQType.h1),
            const SizedBox(height: 2),
            Text('Customers apply it in the cart.', style: SQType.body),
            const SizedBox(height: SQSpace.lg),
            TextField(
              controller: _code,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(
                  hintText: 'CODE (e.g. FESTIVE50)',
                  prefixIcon: Icon(Icons.confirmation_number_outlined)),
            ),
            const SizedBox(height: SQSpace.sm),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _value,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                        hintText: _type == 'FLAT'
                            ? 'Discount ₹'
                            : 'Discount %',
                        prefixIcon: const Icon(Icons.sell_outlined)),
                  ),
                ),
                const SizedBox(width: 10),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'FLAT', label: Text('₹')),
                    ButtonSegment(value: 'PERCENTAGE', label: Text('%')),
                  ],
                  selected: {_type},
                  onSelectionChanged: (s) => setState(() => _type = s.first),
                ),
              ],
            ),
            const SizedBox(height: SQSpace.sm),
            TextField(
              controller: _minOrder,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                  hintText: 'Minimum order ₹ (0 = none)',
                  prefixIcon: Icon(Icons.shopping_bag_outlined)),
            ),
            const SizedBox(height: SQSpace.sm),
            TextField(
              controller: _description,
              decoration: const InputDecoration(
                  hintText: 'Description (optional)',
                  prefixIcon: Icon(Icons.notes_rounded)),
            ),
            if (_error != null) ...[
              const SizedBox(height: SQSpace.sm),
              Text(_error!,
                  style: const TextStyle(
                      color: SQColor.danger,
                      fontSize: 12,
                      fontWeight: FontWeight.w700)),
            ],
            const SizedBox(height: SQSpace.lg),
            SQButton(
              label: 'Create coupon',
              icon: Icons.check_rounded,
              loading: _saving,
              onTap: _save,
            ),
          ],
        ),
      ),
    );
  }
}
