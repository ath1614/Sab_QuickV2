import 'package:flutter/material.dart';

import '../api_client.dart';
import '../cart_store.dart';
import '../design/widgets.dart';
import '../widgets/pressable.dart';

/// Cart + checkout: steppers, fee breakdown, address picker, order placement.
class CartScreen extends StatefulWidget {
  final CartStore cart;
  final Color primary;
  final Color accent;

  const CartScreen({
    super.key,
    required this.cart,
    required this.primary,
    required this.accent,
  });

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _api = ApiClient.instance;
  List<dynamic> _addresses = [];
  String? _selectedAddressId;
  bool _placing = false;
  String? _error;
  String? _successOrderNumber;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    final addresses = await _api.fetchAddresses();
    if (!mounted) return;
    setState(() {
      _addresses = addresses;
      if (addresses.isNotEmpty) {
        _selectedAddressId = (addresses.first['id']) as String;
      }
    });
  }

  Future<void> _placeOrder() async {
    if (_selectedAddressId == null) {
      setState(() => _error = 'Add a delivery address first (Account tab).');
      return;
    }
    setState(() {
      _placing = true;
      _error = null;
    });
    try {
      final items = widget.cart.items
          .map((item) => {
                'productId': item.productId,
                'quantity': item.quantity,
              })
          .toList();
      final resp = await _api.placeOrder(
        addressId: _selectedAddressId!,
        items: items,
        // MVP: cash on doorstep. CASHFREE native SDK slots in here later.
        paymentMethod: 'CASH_ON_DELIVERY',
      );
      if (!mounted) return;
      setState(() {
        _successOrderNumber = resp['orderNumber'] as String?;
      });
      widget.cart.clear();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not place order. Try again.');
    } finally {
      setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_successOrderNumber != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order Placed')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle, color: widget.primary, size: 72),
                const SizedBox(height: 16),
                const Text(
                  'Order confirmed!',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 6),
                Text(
                  '#${_successOrderNumber!}',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF475569),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Track it live from the Orders tab.',
                  style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('My Cart')),
      body: AnimatedBuilder(
        animation: widget.cart,
        builder: (context, _) {
          if (widget.cart.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.shopping_bag_outlined,
                      size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 12),
                  Text(
                    'Your cart is empty',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Add items from Home or Aisles',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                  ),
                ],
              ),
            );
          }

          return Column(
            children: [
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: widget.cart.items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final item = widget.cart.items[i];
                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE8EDF2)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.title,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${item.unitQuantity} • ₹${item.salePrice.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '₹${item.lineTotal.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Row(
                            children: [
                              Pressable(
                                scaleDown: 0.8,
                                onTap: () =>
                                    widget.cart.decrement(item.productId),
                                child: Container(
                                  width: 28,
                                  height: 28,
                                  decoration: BoxDecoration(
                                    border: Border.all(color: widget.primary),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.remove, size: 15),
                                ),
                              ),
                              SizedBox(
                                width: 28,
                                child: Text(
                                  '${item.quantity}',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              Pressable(
                                scaleDown: 0.8,
                                onTap: () =>
                                    widget.cart.increment(item.productId),
                                child: Container(
                                  width: 28,
                                  height: 28,
                                  decoration: BoxDecoration(
                                    color: widget.primary,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.add,
                                      size: 15, color: Colors.white),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),

              // Bill + address + CTA
              Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                  boxShadow: [
                    BoxShadow(
                      color: Color(0x14000000),
                      blurRadius: 12,
                      offset: Offset(0, -4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (widget.cart.amountNeededForFreeDelivery > 0)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          'Add ₹${widget.cart.amountNeededForFreeDelivery.toStringAsFixed(0)} more for FREE delivery',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFB45309),
                          ),
                        ),
                      ),
                    _billRow('Item total',
                        '₹${widget.cart.itemTotal.toStringAsFixed(0)}'),
                    _billRow(
                        'Delivery fee',
                        widget.cart.deliveryFee == 0
                            ? 'FREE'
                            : '₹${widget.cart.deliveryFee.toStringAsFixed(0)}'),
                    _billRow(
                        'Handling charge',
                        '₹${widget.cart.handlingFee.toStringAsFixed(0)}'),
                    const Divider(height: 16),
                    _billRow('To pay',
                        '₹${widget.cart.grandTotal.toStringAsFixed(0)}',
                        bold: true),

                    // Address picker
                    if (_addresses.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 42,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _addresses.length,
                          separatorBuilder: (_, _) =>
                              const SizedBox(width: 8),
                          itemBuilder: (context, i) {
                            final addr = _addresses[i] as Map<String, dynamic>;
                            final id = addr['id'] as String;
                            final selected = id == _selectedAddressId;
                            return Pressable(
                              onTap: () =>
                                  setState(() => _selectedAddressId = id),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: selected
                                      ? widget.primary.withValues(alpha: 0.1)
                                      : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: selected
                                        ? widget.primary
                                        : Colors.transparent,
                                  ),
                                ),
                                child: Text(
                                  '${addr['label'] ?? 'Address'} • ${addr['flatBuilding'] ?? ''}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: selected
                                        ? widget.primary
                                        : const Color(0xFF475569),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],

                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          _error!,
                          style: const TextStyle(
                            color: Color(0xFFDC2626),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),

                    const SizedBox(height: 12),
                    SQButton(
                      label: _placing
                          ? 'Placing order...'
                          : 'Place Order • ₹${widget.cart.grandTotal.toStringAsFixed(0)}',
                      icon: Icons.bolt_rounded,
                      loading: _placing,
                      onTap: _placing ? null : _placeOrder,
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _billRow(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: bold ? 14 : 12,
              fontWeight: bold ? FontWeight.w900 : FontWeight.w600,
              color: bold ? const Color(0xFF0F172A) : const Color(0xFF475569),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: bold ? 15 : 12,
              fontWeight: FontWeight.w900,
              color: bold ? const Color(0xFF0F172A) : const Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }
}
