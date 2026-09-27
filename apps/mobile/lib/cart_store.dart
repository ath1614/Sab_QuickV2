import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';

/// Cart store shared across Flutter screens.
///
/// Persisted to SharedPreferences (JSON) so the cart survives app restarts —
/// parity with the web experience. Fee constants mirror
/// `store/useCartStore.ts` and the server-side `/api/orders` calculation
/// exactly (server remains the source of truth).
class CartStore extends ChangeNotifier {
  CartStore() {
    _restore();
  }

  static const _prefsKey = 'sq_cart_v1';

  final List<CartItem> _items = [];
  Timer? _saveDebounce;

  List<CartItem> get items => List.unmodifiable(_items);

  bool get isEmpty => _items.isEmpty;

  bool get isNotEmpty => _items.isNotEmpty;

  int get totalQuantity => _items.fold(0, (sum, item) => sum + item.quantity);

  double get itemTotal =>
      _items.fold(0, (sum, item) => sum + item.salePrice * item.quantity);

  double get deliveryFee =>
      itemTotal >= AppConfig.freeDeliveryThreshold
          ? 0
          : AppConfig.standardDeliveryFee.toDouble();

  double get handlingFee => AppConfig.handlingFee.toDouble();

  double get grandTotal => _round2(itemTotal + deliveryFee + handlingFee);

  double get amountNeededForFreeDelivery {
    if (itemTotal >= AppConfig.freeDeliveryThreshold) return 0;
    return _round2(AppConfig.freeDeliveryThreshold - itemTotal);
  }

  int quantityOf(String productId) {
    for (final item in _items) {
      if (item.productId == productId) return item.quantity;
    }
    return 0;
  }

  void add(Map<String, dynamic> product) {
    final id = product['id'] as String;
    for (final item in _items) {
      if (item.productId == id) {
        item.quantity += 1;
        _scheduleSave();
        notifyListeners();
        return;
      }
    }
    _items.add(CartItem(product: product, quantity: 1));
    _scheduleSave();
    notifyListeners();
  }

  void increment(String productId) {
    for (final item in _items) {
      if (item.productId == productId) {
        item.quantity += 1;
        _scheduleSave();
        notifyListeners();
        return;
      }
    }
  }

  void decrement(String productId) {
    for (final item in _items) {
      if (item.productId == productId) {
        item.quantity -= 1;
        if (item.quantity <= 0) _items.remove(item);
        _scheduleSave();
        notifyListeners();
        return;
      }
    }
  }

  void clear() {
    _items.clear();
    _scheduleSave();
    notifyListeners();
  }

  Future<void> _restore() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefsKey);
      final decoded = <CartItem>[];
      for (final rawItem in (jsonDecode(raw ?? '[]') as List)) {
        final m = (rawItem as Map).cast<String, dynamic>();
        final product = (m['product'] as Map<String, dynamic>?) ?? const {};
        final qty = (m['quantity'] as num?)?.toInt() ?? 1;
        if (product['id'] is String && qty > 0) {
          decoded.add(CartItem(product: product, quantity: qty));
        }
      }
      _items
        ..clear()
        ..addAll(decoded);
      notifyListeners();
    } catch (_) {
      // First run / corrupt blob — start clean, never crash the app.
    }
  }

  void _scheduleSave() {
    _saveDebounce?.cancel();
    _saveDebounce = Timer(const Duration(milliseconds: 400), () async {
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(
          _prefsKey,
          jsonEncode([
            for (final item in _items)
              {'product': item.product, 'quantity': item.quantity},
          ]),
        );
      } catch (_) {
        // Persistence is best-effort; the in-memory cart stays usable.
      }
    });
  }

  double _round2(num v) => (v * 100).roundToDouble() / 100;
}

class CartItem {
  final Map<String, dynamic> product;
  int quantity;

  CartItem({required this.product, required this.quantity});

  String get productId => product['id'] as String;
  String get title => (product['title'] ?? '') as String;
  String get imageUrl => (product['imageUrl'] ?? '') as String;
  String get unitQuantity => (product['unitQuantity'] ?? '') as String;

  double get salePrice =>
      ((product['salePrice'] ?? product['mrp'] ?? 0) as num).toDouble();

  double get lineTotal => _round(salePrice * quantity);

  double _round(num v) => (v * 100).roundToDouble() / 100;
}
