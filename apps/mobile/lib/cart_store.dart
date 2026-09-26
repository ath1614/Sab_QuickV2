import 'package:flutter/foundation.dart';

import 'config.dart';

/// In-memory cart store shared across Flutter screens.
///
/// Fee constants mirror `store/useCartStore.ts` and the server-side
/// `/api/orders` calculation exactly (server remains the source of truth).
class CartStore extends ChangeNotifier {
  final List<CartItem> _items = [];

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
        notifyListeners();
        return;
      }
    }
    _items.add(CartItem(product: product, quantity: 1));
    notifyListeners();
  }

  void increment(String productId) {
    for (final item in _items) {
      if (item.productId == productId) {
        item.quantity += 1;
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
        notifyListeners();
        return;
      }
    }
  }

  void clear() {
    _items.clear();
    notifyListeners();
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
