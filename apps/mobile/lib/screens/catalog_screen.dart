import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_picker/image_picker.dart';

import '../api_client.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../widgets/pressable.dart';

/// OWNER/MANAGER secondary console: Catalog & Pricing — full native parity
/// with the web catalog page. Searchable SKU list with live availability
/// toggles; create/edit sheets with dual pricing (sale ≤ MRP enforced),
/// stock counts, category picker, image capture/gallery + on-device
/// compression and multipart upload; delete with confirmation; and the
/// aisle/sub-aisle manager.
class CatalogScreen extends StatefulWidget {
  final Color primary;
  final Color accent;

  const CatalogScreen({
    super.key,
    required this.primary,
    required this.accent,
  });

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final _api = ApiClient.instance;
  final _search = TextEditingController();
  List<dynamic> _products = [];
  List<dynamic> _categories = [];
  bool _loading = true;
  String? _error;
  String _query = '';

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
      final results = await Future.wait([
        _api.fetchProducts(),
        _api.fetchOpsCategories(),
      ]);
      if (!mounted) return;
      setState(() {
        _products = results[0];
        _categories = results[1];
        _loading = false;
      });
    } on SessionExpiredException {
      return;
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Network error. Pull down to retry.';
      });
    }
  }

  List<dynamic> get _filtered {
    if (_query.trim().isEmpty) return _products;
    final q = _query.trim().toLowerCase();
    return _products.where((p) {
      final t = (((p as Map<String, dynamic>)['title']) ?? '') as String;
      return t.toLowerCase().contains(q);
    }).toList();
  }

  String _categoryName(dynamic categoryId) {
    for (final cat in _categories) {
      final c = cat as Map<String, dynamic>;
      if (c['id'] == categoryId) return (c['name'] ?? '') as String;
      for (final sub in (c['subCategories'] as List?) ?? const []) {
        if ((sub as Map<String, dynamic>)['id'] == categoryId) {
          return '${c['name']} · ${sub['name']}';
        }
      }
    }
    return '';
  }

  Future<void> _openProductSheet([Map<String, dynamic>? existing]) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProductSheet(
        api: _api,
        categories: _categories,
        categoryName: existing != null
            ? _categoryName(existing['categoryId'] ?? existing['category']?['id'])
            : null,
        existing: existing,
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _deleteProduct(Map<String, dynamic> product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete SKU?'),
        content: Text(
            '"${product['title']}" will be removed from the catalog permanently.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: SQColor.danger),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await _api.deleteProduct(product['id'] as String);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('SKU deleted')),
      );
      _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: SQColor.danger),
      );
    }
  }

  Future<void> _toggleAvailability(Map<String, dynamic> product) async {
    final next = product['isAvailable'] != true;
    // Optimistic flip; revert on failure.
    setState(() => product['isAvailable'] = next);
    try {
      await _api.toggleProductStock(product['id'] as String, next);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => product['isAvailable'] = !next);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: SQColor.danger),
      );
    }
  }

  Future<void> _openAisleManager() async {
    await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AisleManagerSheet(api: _api),
    );
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.fog,
      appBar: AppBar(
        title: const Text('Catalog & Pricing'),
        backgroundColor: SQColor.card,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
            tooltip: 'Manage aisles',
            icon: const Icon(Icons.account_tree_rounded),
            onPressed: _openAisleManager,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: SQColor.green,
        foregroundColor: Colors.white,
        onPressed: () => _openProductSheet(),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add SKU',
            style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: SafeArea(
        bottom: false,
        child: _loading
            ? ListView(
                padding: const EdgeInsets.all(SQSpace.md),
                children: [
                  const SizedBox(height: SQSpace.sm),
                  const SQSkeleton(height: 48, radius: SQRadius.md),
                  const SizedBox(height: SQSpace.lg),
                  for (int i = 0; i < 6; i++) ...[
                    const Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: SQSkeleton(height: 76, radius: SQRadius.sm),
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
                        title: 'Could not load the catalog',
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
                    color: widget.primary,
                    child: _buildList(),
                  ),
      ),
    );
  }

  Widget _buildList() {
    final products = _filtered;
    return ListView(
      padding: const EdgeInsets.fromLTRB(
          SQSpace.md, SQSpace.sm, SQSpace.md, 96),
      children: [
        TextField(
          controller: _search,
          onChanged: (v) => setState(() => _query = v),
          decoration: const InputDecoration(
            hintText: 'Search SKUs',
            prefixIcon: Icon(Icons.search_rounded),
          ),
        ),
        const SizedBox(height: 6),
        Text('${products.length} SKU${products.length == 1 ? '' : 's'}',
            style: SQType.micro.copyWith(color: SQColor.inkFaint)),
        const SizedBox(height: SQSpace.sm),
        if (products.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 80),
            child: SQEmpty(
              icon: Icons.inventory_2_outlined,
              title: 'No SKUs found',
              subtitle: 'Adjust the search or add a new SKU.',
            ),
          ),
        for (final p in products)
          _SkuCard(
            product: p as Map<String, dynamic>,
            categoryName: _categoryName(p['categoryId'] ?? p['category']?['id']),
            onEdit: () => _openProductSheet(p),
            onDelete: () => _deleteProduct(p),
            onToggle: () => _toggleAvailability(p),
          ),
      ],
    );
  }
}

// ═════════════════ SKU card ═════════════════

class _SkuCard extends StatelessWidget {
  final Map<String, dynamic> product;
  final String categoryName;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onToggle;

  const _SkuCard({
    required this.product,
    required this.categoryName,
    required this.onEdit,
    required this.onDelete,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final title = (product['title'] ?? '') as String;
    final unitQuantity = (product['unitQuantity'] ?? '') as String;
    final mrp = (product['mrp'] ?? 0) as num;
    final salePrice = (product['salePrice'] ?? 0) as num;
    final stock = (product['stockCount'] ?? 0) as num;
    final available = product['isAvailable'] == true;
    final imageUrl = (product['imageUrl'] ?? '') as String;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.circular(SQRadius.sm),
        border: Border.all(color: SQColor.line),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(SQRadius.xs),
            child: Container(
              width: 52,
              height: 52,
              color: SQColor.fog,
              child: imageUrl.startsWith('http')
                  ? Image.network(imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) =>
                          const Icon(Icons.image_outlined,
                              color: SQColor.inkFaint, size: 20))
                  : const Icon(Icons.image_outlined,
                      color: SQColor.inkFaint, size: 20),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: SQColor.ink)),
                const SizedBox(height: 2),
                Text(
                  [
                    if (unitQuantity.isNotEmpty) unitQuantity,
                    if (categoryName.isNotEmpty) categoryName,
                    'Stock: ${stock.round()}',
                  ].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 11, color: SQColor.inkSoft),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text('₹${salePrice.toStringAsFixed(0)}',
                        style: TextStyle(
                            fontFamily: 'SpaceGrotesk',
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: SQColor.green)),
                    if (mrp > salePrice) ...[
                      const SizedBox(width: 6),
                      Text('₹${mrp.toStringAsFixed(0)}',
                          style: const TextStyle(
                              fontSize: 11,
                              color: SQColor.inkFaint,
                              decoration: TextDecoration.lineThrough)),
                    ],
                  ],
                ),
              ],
            ),
          ),
          Column(
            children: [
              // Availability toggle
              SizedBox(
                height: 28,
                child: Switch(
                  value: available,
                  onChanged: (_) => onToggle(),
                  activeThumbColor: SQColor.green,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
              const SizedBox(height: 2),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _IconAction(icon: Icons.edit_outlined, onTap: onEdit),
                  _IconAction(icon: Icons.delete_outline_rounded,
                      color: SQColor.danger, onTap: onDelete),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _IconAction extends StatelessWidget {
  final IconData icon;
  final Color? color;
  final VoidCallback onTap;

  const _IconAction({required this.icon, required this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(icon, size: 17, color: color ?? SQColor.inkSoft),
      ),
    );
  }
}

// ═════════════════ Create / edit sheet ═════════════════

class _ProductSheet extends StatefulWidget {
  final ApiClient api;
  final List<dynamic> categories;
  final String? categoryName;
  final Map<String, dynamic>? existing;

  const _ProductSheet({
    required this.api,
    required this.categories,
    required this.categoryName,
    this.existing,
  });

  @override
  State<_ProductSheet> createState() => _ProductSheetState();
}

class _ProductSheetState extends State<_ProductSheet> {
  late final TextEditingController _title;
  late final TextEditingController _mrp;
  late final TextEditingController _sale;
  late final TextEditingController _unit;
  late final TextEditingController _stock;
  late final TextEditingController _description;

  String? _categoryId;
  String? _imageUrl;
  File? _pendingImage;
  bool _compressing = false;
  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _title = TextEditingController(text: (e?['title'] ?? '') as String);
    _mrp = TextEditingController(
        text: e == null ? '' : '${(e['mrp'] ?? 0) as num}');
    _sale = TextEditingController(
        text: e == null ? '' : '${(e['salePrice'] ?? 0) as num}');
    _unit = TextEditingController(text: (e?['unitQuantity'] ?? '') as String);
    _stock = TextEditingController(
        text: e == null ? '' : '${((e['stockCount'] ?? 0) as num).round()}');
    _description = TextEditingController(text: (e?['description'] ?? '') as String);
    _categoryId =
        (e?['categoryId'] ?? e?['category']?['id']) as String?;
    _imageUrl = (e?['imageUrl'] ?? '') as String?;
  }

  @override
  void dispose() {
    _title.dispose();
    _mrp.dispose();
    _sale.dispose();
    _unit.dispose();
    _stock.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
        source: source, maxWidth: 1024, imageQuality: 80);
    if (picked == null) return;
    setState(() => _compressing = true);
    try {
      final compressed = await FlutterImageCompress.compressWithFile(
        picked.path,
        quality: 72,
        minWidth: 640,
        minHeight: 640,
      );
      if (!mounted) return;
      if (compressed == null) throw Exception();
      final tmp = File(
          '${Directory.systemTemp.path}/sq_${DateTime.now().millisecondsSinceEpoch}.jpg');
      await tmp.writeAsBytes(compressed);
      setState(() {
        _pendingImage = tmp;
        _compressing = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _compressing = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Could not process the image'),
        backgroundColor: SQColor.danger,
      ));
    }
  }

  Future<void> _save() async {
    final title = _title.text.trim();
    final mrp = double.tryParse(_mrp.text.trim());
    final sale = double.tryParse(_sale.text.trim());
    final unit = _unit.text.trim();
    final stock = int.tryParse(_stock.text.trim());

    if (title.isEmpty || mrp == null || sale == null || unit.isEmpty) {
      setState(() => _error = 'Fill in title, MRP, sale price and unit.');
      return;
    }
    if (sale > mrp) {
      setState(() => _error = 'Sale price cannot exceed MRP.');
      return;
    }
    if (!_isEdit && _categoryId == null) {
      setState(() => _error = 'Pick an aisle or sub-aisle.');
      return;
    }
    if (!_isEdit && _pendingImage == null && (_imageUrl == null || _imageUrl!.isEmpty)) {
      setState(() => _error = 'Add a product image.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      String? url = _imageUrl;
      if (_pendingImage != null) {
        url = await widget.api.uploadProductImage(_pendingImage!.path);
      }
      if (_isEdit) {
        await widget.api.updateProduct(
          widget.existing!['id'] as String,
          title: title,
          categoryId: _categoryId,
          mrp: mrp,
          salePrice: sale,
          unitQuantity: unit,
          stockCount: stock,
          imageUrl: url,
          description: _description.text.trim(),
        );
      } else {
        await widget.api.createProduct(
          title: title,
          categoryId: _categoryId!,
          mrp: mrp,
          salePrice: sale,
          unitQuantity: unit,
          stockCount: stock ?? 0,
          imageUrl: url!,
          description: _description.text.trim(),
        );
      }
      if (!mounted) return;
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = 'Could not save. Check your connection.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.92),
        decoration: const BoxDecoration(
          color: SQColor.card,
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(SQRadius.lg)),
        ),
        child: SingleChildScrollView(
          padding:
              const EdgeInsets.fromLTRB(SQSpace.lg, 14, SQSpace.lg, SQSpace.xl),
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
              Text(_isEdit ? 'Edit SKU' : 'New SKU', style: SQType.h1),

              // ── Image picker ──
              const SizedBox(height: SQSpace.md),
              Row(
                children: [
                  GestureDetector(
                    onTap: (_compressing || _saving) ? null : () => _pickImage(ImageSource.gallery),
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: SQColor.fog,
                        borderRadius: BorderRadius.circular(SQRadius.xs),
                        border: Border.all(color: SQColor.line),
                      ),
                      child: _pendingImage != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(SQRadius.xs),
                              child: Image.file(_pendingImage!, fit: BoxFit.cover))
                          : (_imageUrl != null && _imageUrl!.startsWith('http'))
                              ? ClipRRect(
                                  borderRadius:
                                      BorderRadius.circular(SQRadius.xs),
                                  child: Image.network(_imageUrl!,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, _, _) => const Icon(
                                          Icons.add_photo_alternate_outlined,
                                          color: SQColor.inkFaint)))
                              : const Icon(Icons.add_photo_alternate_outlined,
                                  color: SQColor.inkFaint),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Product image',
                            style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: SQColor.ink)),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 8,
                          children: [
                            _PickChip(
                              icon: Icons.camera_alt_outlined,
                              label: 'Camera',
                              onTap: (_compressing || _saving)
                                  ? null
                                  : () => _pickImage(ImageSource.camera),
                            ),
                            _PickChip(
                              icon: Icons.photo_library_outlined,
                              label: 'Gallery',
                              onTap: (_compressing || _saving)
                                  ? null
                                  : () => _pickImage(ImageSource.gallery),
                            ),
                          ],
                        ),
                        if (_compressing)
                          const Padding(
                            padding: EdgeInsets.only(top: 6),
                            child: Text('Compressing…',
                                style: TextStyle(
                                    fontSize: 11, color: SQColor.inkSoft)),
                          ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: SQSpace.md),
              TextField(
                controller: _title,
                decoration: const InputDecoration(
                    hintText: 'Product title (e.g. Amul Milk)'),
              ),
              const SizedBox(height: SQSpace.sm),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _mrp,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                          hintText: 'MRP ₹', prefixText: '₹ '),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _sale,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                          hintText: 'Sale ₹', prefixText: '₹ '),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: SQSpace.sm),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _unit,
                      decoration: const InputDecoration(
                          hintText: 'Unit (e.g. 500 ml, 1 kg)'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _stock,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(hintText: 'Stock count'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: SQSpace.sm),

              // ── Category picker ──
              DropdownButtonFormField<String>(
                initialValue: _categoryId,
                hint: const Text('Aisle / sub-aisle'),
                items: [
                  for (final cat in widget.categories) ...[
                    DropdownMenuItem(
                      value: (cat as Map<String, dynamic>)['id'] as String,
                      child: Text(cat['name'] as String? ?? ''),
                    ),
                    for (final sub in (cat['subCategories'] as List?) ?? const [])
                      DropdownMenuItem(
                        value: (sub as Map<String, dynamic>)['id'] as String,
                        child: Padding(
                          padding: const EdgeInsets.only(left: 18),
                          child: Text('↳ ${sub['name']}',
                              style: const TextStyle(fontSize: 12.5)),
                        ),
                      ),
                  ],
                ],
                onChanged: (v) => setState(() => _categoryId = v),
              ),
              const SizedBox(height: SQSpace.sm),
              TextField(
                controller: _description,
                maxLines: 2,
                decoration:
                    const InputDecoration(hintText: 'Description (optional)'),
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
                label: _isEdit ? 'Save changes' : 'Add to catalog',
                icon: Icons.check_rounded,
                loading: _saving,
                onTap: _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PickChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _PickChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: SQColor.limeSoft,
          borderRadius: BorderRadius.circular(SQRadius.pill),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: SQColor.greenDeep),
            const SizedBox(width: 5),
            Text(label,
                style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: SQColor.greenDeep)),
          ],
        ),
      ),
    );
  }
}

// ═════════════════ Aisle manager sheet ═════════════════

class _AisleManagerSheet extends StatefulWidget {
  final ApiClient api;

  const _AisleManagerSheet({required this.api});

  @override
  State<_AisleManagerSheet> createState() => _AisleManagerSheetState();
}

class _AisleManagerSheetState extends State<_AisleManagerSheet> {
  List<dynamic> _categories = [];
  bool _loading = true;
  String? _error;
  String? _busyId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final cats = await widget.api.fetchOpsCategories();
      if (!mounted) return;
      setState(() {
        _categories = cats;
        _loading = false;
        _error = null;
      });
    } on SessionExpiredException {
      return;
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Could not load aisles';
      });
    }
  }

  Future<void> _addAisle({String? parentId, String? parentName}) async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(parentName == null
            ? 'New aisle'
            : 'New sub-aisle under $parentName'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Name'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, controller.text.trim()),
              child: const Text('Create')),
        ],
      ),
    );
    if (name == null || name.isEmpty) return;
    try {
      await widget.api.createCategory(name: name, parentId: parentId);
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: SQColor.danger),
      );
    }
  }

  Future<void> _rename(Map<String, dynamic> cat) async {
    final controller = TextEditingController(text: cat['name'] as String);
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rename'),
        content: TextField(
          controller: controller,
          autofocus: true,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, controller.text.trim()),
              child: const Text('Save')),
        ],
      ),
    );
    if (name == null || name.isEmpty || name == cat['name']) return;
    try {
      await widget.api.renameCategory(id: cat['id'] as String, name: name);
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: SQColor.danger),
      );
    }
  }

  Future<void> _delete(Map<String, dynamic> cat) async {
    setState(() => _busyId = cat['id'] as String);
    try {
      // First attempt without force: the server asks for confirmation
      // when SKUs exist (requiresConfirmation in ApiException).
      await widget.api.deleteCategory(cat['id'] as String);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Aisle deleted')));
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      if (!e.requiresConfirmation) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: SQColor.danger),
        );
        setState(() => _busyId = null);
        return;
      }
      // Ask and force-delete.
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Delete aisle with SKUs?'),
          content: Text(
              '${e.message}\n\nAll SKUs and their order items inside it will be removed permanently.'),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel')),
            TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: TextButton.styleFrom(foregroundColor: SQColor.danger),
              child: const Text('Delete everything'),
            ),
          ],
        ),
      );
      if (confirmed == true) {
        try {
          await widget.api.deleteCategory(cat['id'] as String, force: true);
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Aisle deleted')));
          await _load();
        } on ApiException catch (e2) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e2.message), backgroundColor: SQColor.danger),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints:
          BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: const BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.vertical(top: Radius.circular(SQRadius.lg)),
      ),
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
            padding: const EdgeInsets.fromLTRB(SQSpace.lg, 12, SQSpace.lg, 0),
            child: Row(
              children: [
                Expanded(
                  child: Text('Aisles & sub-aisles', style: SQType.h1),
                ),
                Pressable(
                  onTap: () => _addAisle(),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: SQColor.green,
                      borderRadius: BorderRadius.circular(SQRadius.pill),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.add_rounded, size: 15, color: Colors.white),
                        SizedBox(width: 4),
                        Text('New aisle',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: Colors.white)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Flexible(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: SQColor.green))
                : _error != null
                    ? SQEmpty(
                        icon: Icons.error_outline_rounded,
                        title: _error!,
                        subtitle: 'Close and try again.')
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(
                            SQSpace.lg, 0, SQSpace.lg, SQSpace.xl),
                        children: [
                          for (final cat in _categories)
                            _AisleRow(
                              name: (cat as Map<String, dynamic>)['name']
                                  as String? ?? '',
                              count:
                                  'cat ${(cat['_count'] ?? {})['products'] ?? 0} SKUs',
                              busy: _busyId == cat['id'],
                              onRename: () => _rename(cat),
                              onDelete: () => _delete(cat),
                              onAddSub: () => _addAisle(
                                  parentId: cat['id'] as String,
                                  parentName: cat['name'] as String?),
                              subAisles: [
                                for (final sub in (cat['subCategories'] as List?) ?? const [])
                                  _AisleRow(
                                    name: (sub as Map<String, dynamic>)['name'] as String? ?? '',
                                    count: 'sub ${(sub['_count'] ?? {})['products'] ?? 0} SKUs',
                                    busy: _busyId == sub['id'],
                                    onRename: () => _rename(sub),
                                    onDelete: () => _delete(sub),
                                    onAddSub: null,
                                    subAisles: const [],
                                  ),
                              ],
                            ),
                        ],
                      ),
          ),
        ],
      ),
    );
  }
}

class _AisleRow extends StatelessWidget {
  final String name;
  final String count;
  final bool busy;
  final VoidCallback onRename;
  final VoidCallback onDelete;
  final VoidCallback? onAddSub;
  final List<Widget> subAisles;

  const _AisleRow({
    required this.name,
    required this.count,
    required this.busy,
    required this.onRename,
    required this.onDelete,
    required this.onAddSub,
    required this.subAisles,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: SQColor.ink)),
                    Text(count,
                        style: const TextStyle(
                            fontSize: 10.5, color: SQColor.inkFaint)),
                  ],
                ),
              ),
              if (busy)
                const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2))
              else ...[
                if (onAddSub != null)
                  _IconAction(
                      icon: Icons.subdirectory_arrow_right_rounded,
                      onTap: onAddSub!),
                _IconAction(icon: Icons.edit_outlined, onTap: onRename),
                _IconAction(
                    icon: Icons.delete_outline_rounded,
                    color: SQColor.danger,
                    onTap: onDelete),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(left: 18),
          child: Column(children: subAisles),
        ),
      ],
    );
  }
}
