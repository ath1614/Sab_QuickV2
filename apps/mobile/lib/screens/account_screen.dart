import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api_client.dart';
import '../config.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../widgets/pressable.dart';
import 'auth_screen.dart';
import 'web_console_screen.dart';

/// Account: profile, saved addresses (add + list), policies, app info.
/// Parity with the website's account sheet: everything a customer or staff
/// member can do on the web is reachable here.
class AccountScreen extends StatefulWidget {
  final Color primary;

  /// Switches the shell to the Orders tab (customer shell wires this up).
  final VoidCallback? onNavigateToOrders;

  const AccountScreen(
      {super.key, required this.primary, this.onNavigateToOrders});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  List<dynamic> _addresses = [];

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    final addresses = await ApiClient.instance.fetchAddresses();
    if (!mounted) return;
    setState(() => _addresses = addresses);
  }

  Future<void> _openAddAddress() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddAddressSheet(),
    );
    if (saved == true) _loadAddresses();
  }

  Future<void> _logout(BuildContext context) async {
    await ApiClient.instance.logout();
    if (!context.mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, _, _) => const AuthScreen(),
        transitionsBuilder: (_, animation, _, child) => FadeTransition(
          opacity: animation,
          child: child,
        ),
      ),
    );
  }

  Future<void> _openPolicy(String path, String fallbackUrl) async {
    final uri = Uri.parse('${AppConfig.baseUrl}$path');
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Open $fallbackUrl in your browser'),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ApiClient.instance.user ?? {};
    final name = (user['name'] ?? 'Customer') as String;
    final phone = (user['phone'] ?? '') as String;
    final email = (user['email'] ?? '') as String;
    final role = (user['role'] ?? 'CUSTOMER') as String;
    final isStaff = role != 'CUSTOMER';

    return Scaffold(
      backgroundColor: SQColor.fog,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
              SQSpace.md, SQSpace.sm, SQSpace.md, SQSpace.xl),
          children: [
            // ── Header ──
            Text('Account', style: SQType.display.copyWith(fontSize: 26)),
            const SizedBox(height: SQSpace.md),

            // ── Profile card ──
            Container(
              padding: const EdgeInsets.all(SQSpace.md),
              decoration: BoxDecoration(
                color: SQColor.card,
                borderRadius: BorderRadius.circular(SQRadius.md),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: SQColor.green.withValues(alpha: 0.1),
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : 'U',
                      style: const TextStyle(
                        fontFamily: 'SpaceGrotesk',
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: SQColor.green,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name,
                            style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: SQColor.ink)),
                        const SizedBox(height: 2),
                        Text(
                          phone.isNotEmpty ? '+91 $phone' : (email.isNotEmpty ? email : 'No contact linked'),
                          style: const TextStyle(
                              fontSize: 12, color: SQColor.inkSoft),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isStaff
                          ? SQColor.lime.withValues(alpha: 0.5)
                          : SQColor.fog,
                      borderRadius: BorderRadius.circular(SQRadius.xs),
                    ),
                    child: Text(
                      isStaff ? role : 'CUSTOMER',
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                        color: SQColor.greenDeep,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: SQSpace.md),

            // ── Saved addresses ──
            _SectionLabel('Saved addresses'),
            for (final addr in _addresses)
              _AddressTile(address: addr as Map<String, dynamic>),
            _ActionTile(
              icon: Icons.add_location_alt_outlined,
              title: _addresses.isEmpty
                  ? 'Add a delivery address'
                  : 'Add another address',
              subtitle: 'Flat / building, street & landmark',
              onTap: _openAddAddress,
            ),
            const SizedBox(height: SQSpace.md),

            // ── Web consoles (same pages the website links between) ──
            if (role == 'OWNER' || role == 'MANAGER') ...[
              _SectionLabel('Web consoles — full site tools'),
              _ConsoleTile(
                icon: Icons.trending_up_rounded,
                title: 'Owner Hub',
                subtitle: 'GMV, inventory toggles, theme engine',
                path: '/owner',
                allowed: role == 'OWNER',
              ),
              _ConsoleTile(
                icon: Icons.category_rounded,
                title: 'Catalog & Pricing',
                subtitle: 'SKUs, categories, dual pricing',
                path: '/owner/catalog',
                allowed: true,
              ),
              _ConsoleTile(
                icon: Icons.view_kanban_rounded,
                title: 'Manager Dispatch Kanban',
                subtitle: 'Live floor orchestration & SLA',
                path: '/manager',
                allowed: true,
              ),
              _ConsoleTile(
                icon: Icons.inventory_rounded,
                title: 'Packer Floor Station',
                subtitle: 'Aisle-by-aisle bagging queue',
                path: '/packer',
                allowed: true,
              ),
              const SizedBox(height: SQSpace.md),
            ],

            // ── Orders shortcut for customers ──
            if (!isStaff) ...[
              _SectionLabel('Shopping'),
              _ActionTile(
                icon: Icons.receipt_long_outlined,
                title: 'My Orders',
                subtitle: 'Live tracking, delivery OTP & history',
                onTap: widget.onNavigateToOrders ?? () {},
                trailing: const Icon(Icons.arrow_forward_rounded,
                    size: 16, color: SQColor.inkFaint),
              ),
              const SizedBox(height: SQSpace.md),
            ],

            // ── Policies & legal (store-launch compliance) ──
            _SectionLabel('Policies & legal'),
            Container(
              decoration: BoxDecoration(
                color: SQColor.card,
                borderRadius: BorderRadius.circular(SQRadius.md),
                border: Border.all(color: SQColor.line),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  _PolicyRow(
                    icon: Icons.shield_outlined,
                    title: 'Privacy Policy',
                    subtitle: 'How SabQuick protects your data',
                    onTap: () => _openPolicy('/privacy', 'the Privacy Policy'),
                  ),
                  const Divider(height: 1, color: SQColor.line),
                  _PolicyRow(
                    icon: Icons.description_outlined,
                    title: 'Terms of Service',
                    subtitle: 'Ordering & delivery terms',
                    onTap: () => _openPolicy('/terms', 'the Terms of Service'),
                  ),
                  const Divider(height: 1, color: SQColor.line),
                  _PolicyRow(
                    icon: Icons.currency_exchange_rounded,
                    title: 'Refund & Cancellation',
                    subtitle: '10-minute return window',
                    onTap: () => _openPolicy('/refund', 'the Refund Policy'),
                  ),
                  const Divider(height: 1, color: SQColor.line),
                  _PolicyRow(
                    icon: Icons.delete_outline_rounded,
                    title: 'Delete Account',
                    subtitle: 'Permanently erase your data',
                    destructive: true,
                    onTap: () => _openPolicy(
                        '/delete-account', 'the Delete Account page'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: SQSpace.md),

            // ── Help & app info ──
            _SectionLabel('Help & app'),
            _ActionTile(
              icon: Icons.support_agent_outlined,
              title: 'Help & Support',
              subtitle: 'sabsupermart68@gmail.com · +91 9109066668',
              onTap: () async {
                final uri = Uri.parse('mailto:sabsupermart68@gmail.com');
                try {
                  await launchUrl(uri);
                } catch (_) {}
              },
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(SQSpace.md),
              decoration: BoxDecoration(
                color: SQColor.card,
                borderRadius: BorderRadius.circular(SQRadius.md),
                border: Border.all(color: SQColor.line),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: SQColor.fog,
                      borderRadius: BorderRadius.circular(SQRadius.xs),
                    ),
                    child: Image.asset('assets/brand/app-icon.png',
                        fit: BoxFit.contain),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('SabQuick',
                            style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: SQColor.ink)),
                        const SizedBox(height: 1),
                        Text('Version 1.1.0 · Be Quick.',
                            style: SQType.caption),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: SQSpace.lg),

            // ── Logout ──
            SQButton(
              label: 'Log Out',
              icon: Icons.logout_rounded,
              destructive: true,
              onTap: () => _logout(context),
            ),
          ],
        ),
      ),
    );
  }
}

/// Opens one of the website's staff consoles in an in-app browser with the
/// session cookie injected — exactly the pages the website navigates
/// between, so app and web stay in sync.
class _ConsoleTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String path;
  final bool allowed;

  const _ConsoleTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.path,
    required this.allowed,
  });

  @override
  Widget build(BuildContext context) {
    return NeonPressable(
      skewAmount: -0.02,
      onTap: allowed
          ? () {
              Navigator.of(context).push(MaterialPageRoute(
                builder: (_) =>
                    WebConsoleScreen(title: title, path: path),
              ));
            }
          : null,
      glowColor: SQColor.lime.withValues(alpha: 0.3),
      child: Opacity(
        opacity: allowed ? 1 : 0.55,
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            color: SQColor.card,
            borderRadius: BorderRadius.circular(SQRadius.sm),
            border: Border.all(color: SQColor.line),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: SQColor.green.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(SQRadius.xs),
                ),
                child: Icon(icon, color: SQColor.green, size: 19),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: SQColor.ink)),
                    Text(subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 11, color: SQColor.inkSoft)),
                  ],
                ),
              ),
              allowed
                  ? const Icon(Icons.open_in_new_rounded,
                      size: 15, color: SQColor.inkFaint)
                  : const Text('OWNER',
                      style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: SQColor.inkFaint)),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;

  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 2, bottom: 8, top: 4),
      child: Text(text, style: SQType.micro.copyWith(color: SQColor.inkFaint)),
    );
  }
}

class _AddressTile extends StatelessWidget {
  final Map<String, dynamic> address;

  const _AddressTile({required this.address});

  @override
  Widget build(BuildContext context) {
    final label = (address['label'] ?? 'Address') as String;
    final flat = (address['flatBuilding'] ?? '') as String;
    final street = (address['streetArea'] ?? '') as String;
    final landmark = (address['landmark'] ?? '') as String;

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
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: SQColor.green.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(SQRadius.xs),
            ),
            child: const Icon(Icons.home_outlined,
                color: SQColor.green, size: 19),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: SQColor.ink)),
                Text(
                  landmark.isNotEmpty
                      ? '$flat, $street · $landmark'
                      : '$flat, $street',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 11, color: SQColor.inkSoft),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Widget? trailing;

  const _ActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return NeonPressable(
      skewAmount: -0.02,
      onTap: onTap,
      glowColor: SQColor.lime.withValues(alpha: 0.3),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: SQColor.card,
          borderRadius: BorderRadius.circular(SQRadius.sm),
          border: Border.all(color: SQColor.line),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: SQColor.limeSoft,
                borderRadius: BorderRadius.circular(SQRadius.xs),
              ),
              child: Icon(icon, color: SQColor.greenDeep, size: 19),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: SQColor.ink)),
                  Text(subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 11, color: SQColor.inkSoft)),
                ],
              ),
            ),
            trailing ??
                const Icon(Icons.chevron_right_rounded,
                    color: SQColor.inkFaint),
          ],
        ),
      ),
    );
  }
}

class _PolicyRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool destructive;

  const _PolicyRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.destructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final color =
        destructive ? SQColor.danger : SQColor.ink;
    return Pressable(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
        child: Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: color)),
                  Text(subtitle,
                      style: const TextStyle(
                          fontSize: 10.5, color: SQColor.inkSoft)),
                ],
              ),
            ),
            const Icon(Icons.open_in_new_rounded,
                size: 14, color: SQColor.inkFaint),
          ],
        ),
      ),
    );
  }
}

/// Add-address sheet. Geolocation is a follow-up; this captures the fields
/// the API needs, using the store geofence center as the default pin.
class _AddAddressSheet extends StatefulWidget {
  @override
  State<_AddAddressSheet> createState() => _AddAddressSheetState();
}

class _AddAddressSheetState extends State<_AddAddressSheet> {
  final _label = TextEditingController();
  final _flat = TextEditingController();
  final _street = TextEditingController();
  final _landmark = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _label.dispose();
    _flat.dispose();
    _street.dispose();
    _landmark.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_flat.text.trim().isEmpty || _street.text.trim().isEmpty) {
      setState(() => _error = 'Fill in the flat/building and street/area.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ApiClient.instance.createAddress(
        label: _label.text.trim().isEmpty ? 'Home' : _label.text.trim(),
        flatBuilding: _flat.text.trim(),
        streetArea: _street.text.trim(),
        landmark: _landmark.text.trim(),
        // Store geofence center (Ambikapur) — refined by map pin later.
        latitude: 23.129243,
        longitude: 83.190082,
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
        _error = 'Could not save address. Try again.';
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
            Text('Add delivery address', style: SQType.h1),
            const SizedBox(height: 2),
            Text('Our riders deliver within your 2.5 km geofence.',
                style: SQType.body),
            const SizedBox(height: SQSpace.lg),
            Row(
              children: [
                for (final option in const ['Home', 'Work', 'Other'])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(option),
                      selected: _label.text == option,
                      onSelected: (_) => setState(() => _label.text = option),
                      selectedColor: SQColor.lime,
                      checkmarkColor: SQColor.ink,
                      labelStyle: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          color: SQColor.ink),
                      side: BorderSide(
                          color: _label.text == option
                              ? SQColor.green
                              : SQColor.line),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(SQRadius.xs)),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: SQSpace.sm),
            TextField(
              controller: _flat,
              decoration: const InputDecoration(
                  hintText: 'Flat / House / Building',
                  prefixIcon: Icon(Icons.home_outlined)),
            ),
            const SizedBox(height: SQSpace.sm),
            TextField(
              controller: _street,
              decoration: const InputDecoration(
                  hintText: 'Street / Area / Colony',
                  prefixIcon: Icon(Icons.location_on_outlined)),
            ),
            const SizedBox(height: SQSpace.sm),
            TextField(
              controller: _landmark,
              decoration: const InputDecoration(
                  hintText: 'Landmark (optional)',
                  prefixIcon: Icon(Icons.pin_drop_outlined)),
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
              label: 'Save address',
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
