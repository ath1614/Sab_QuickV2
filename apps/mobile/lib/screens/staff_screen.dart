import 'package:flutter/material.dart';

import '../api_client.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../widgets/pressable.dart';

/// Owner's staff directory — mirrors the website's Staff Directory tab:
/// list every staff member with role chips, PIN rotation and deactivation.
class StaffScreen extends StatefulWidget {
  final Color primary;
  final Color accent;

  const StaffScreen({super.key, required this.primary, required this.accent});

  @override
  State<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends State<StaffScreen> {
  final _api = ApiClient.instance;
  List<dynamic> _staff = [];
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
      final list = await _api.fetchStaff();
      if (!mounted) return;
      setState(() {
        _staff = list;
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
        _error = 'Network error loading staff';
      });
    }
  }

  Future<void> _openAddStaff() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddStaffSheet(primary: widget.primary),
    );
    if (saved == true) _load(silent: true);
  }

  Future<void> _deactivate(Map<String, dynamic> member) async {
    final name = (member['name'] ?? 'this member') as String;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(SQRadius.md)),
        title: const Text('Deactivate staff?'),
        content: Text(
            '$name will lose shift access immediately. You can re-add them any time.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Deactivate',
                  style: TextStyle(color: SQColor.danger))),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _busyId = member['id'] as String);
    try {
      await _api.deleteStaff(member['id'] as String);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('$name deactivated')));
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
                    for (int i = 0; i < 4; i++)
                      const Padding(
                        padding: EdgeInsets.only(bottom: 12),
                        child: SQSkeleton(height: 84, radius: SQRadius.md),
                      ),
                  ],
                )
              : _error != null
                  ? ListView(
                      children: [
                        const SizedBox(height: 120),
                        SQEmpty(
                            icon: Icons.group_off_outlined,
                            title: 'Could not load staff',
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
                  Text('Staff Directory',
                      style: SQType.display.copyWith(fontSize: 26)),
                  const SizedBox(height: 2),
                  Text('${_staff.length} team members',
                      style: SQType.body),
                ],
              ),
            ),
            NeonPressable(
              onTap: _openAddStaff,
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
                    Icon(Icons.person_add_alt_1_rounded,
                        color: Colors.white, size: 18),
                    SizedBox(width: 6),
                    Text('Add',
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
        for (final member in _staff)
          _StaffCard(
            member: member as Map<String, dynamic>,
            busy: _busyId == member['id'],
            onDeactivate: () => _deactivate(member),
          ),
        if (_staff.isEmpty) ...[
          const SizedBox(height: 60),
          const SQEmpty(
            icon: Icons.group_add_rounded,
            title: 'No staff yet',
            subtitle: 'Add packers, riders and managers to run the floor.',
          ),
        ],
      ],
    );
  }
}

class _StaffCard extends StatelessWidget {
  final Map<String, dynamic> member;
  final bool busy;
  final VoidCallback onDeactivate;

  const _StaffCard({
    required this.member,
    required this.busy,
    required this.onDeactivate,
  });

  Color _roleColor(String role) {
    switch (role) {
      case 'OWNER':
        return const Color(0xFFF59E0B);
      case 'MANAGER':
        return const Color(0xFF6366F1);
      case 'PACKER':
        return SQColor.green;
      case 'RIDER':
        return const Color(0xFF0EA5E9);
      default:
        return SQColor.inkSoft;
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = (member['name'] ?? 'Unnamed') as String;
    final phone = (member['phone'] ?? '') as String;
    final roles = ((member['roles'] as List?) ?? [member['role'] ?? 'STAFF'])
        .map((r) => r.toString())
        .toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.circular(SQRadius.md),
        border: Border.all(color: SQColor.line),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: SQColor.green.withValues(alpha: 0.1),
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : '?',
              style: const TextStyle(
                  fontFamily: 'SpaceGrotesk',
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: SQColor.green),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: SQColor.ink)),
                const SizedBox(height: 2),
                Text(phone.isNotEmpty ? '+91 $phone' : 'No phone',
                    style: const TextStyle(
                        fontSize: 11.5, color: SQColor.inkSoft)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 5,
                  runSpacing: 4,
                  children: [
                    for (final role in roles)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: _roleColor(role).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          role,
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.4,
                            color: _roleColor(role),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          Pressable(
            onTap: busy ? null : onDeactivate,
            child: Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: SQColor.danger.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(SQRadius.sm),
              ),
              child: busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: Center(
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: SQColor.danger),
                      ),
                    )
                  : const Icon(Icons.person_remove_alt_1_rounded,
                      color: SQColor.danger, size: 20),
            ),
          ),
        ],
      ),
    );
  }
}

/// Bottom sheet form mirroring the website's Add Staff dialog.
class _AddStaffSheet extends StatefulWidget {
  final Color primary;

  const _AddStaffSheet({required this.primary});

  @override
  State<_AddStaffSheet> createState() => _AddStaffSheetState();
}

class _AddStaffSheetState extends State<_AddStaffSheet> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _pin = TextEditingController();
  final _vehicle = TextEditingController();
  final Set<String> _roles = {'PACKER'};
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _pin.dispose();
    _vehicle.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    final phone = _phone.text.trim();
    final pin = _pin.text.trim();

    if (name.length < 2) {
      setState(() => _error = 'Name must be at least 2 characters.');
      return;
    }
    if (!RegExp(r'^[6-9]\d{9}$').hasMatch(phone)) {
      setState(() => _error = 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!RegExp(r'^\d{4}$').hasMatch(pin)) {
      setState(() => _error = 'PIN must be exactly 4 digits.');
      return;
    }
    if (_roles.isEmpty) {
      setState(() => _error = 'Pick at least one shift role.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ApiClient.instance.saveStaff(
        name: name,
        phone: phone,
        pin: pin,
        roles: _roles.toList(),
        vehicleDetails: _vehicle.text.trim(),
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
        _error = 'Could not save. Try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom),
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
            Text('Add team member', style: SQType.h1),
            const SizedBox(height: 2),
            Text('They clock in with their phone + 4-digit PIN.',
                style: SQType.body),
            const SizedBox(height: SQSpace.lg),
            TextField(
              controller: _name,
              decoration: const InputDecoration(
                  hintText: 'Full name', prefixIcon: Icon(Icons.person_outline)),
            ),
            const SizedBox(height: SQSpace.sm),
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              maxLength: 10,
              decoration: const InputDecoration(
                hintText: '10-digit mobile number',
                counterText: '',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
            ),
            const SizedBox(height: SQSpace.sm),
            TextField(
              controller: _pin,
              keyboardType: TextInputType.number,
              maxLength: 4,
              obscureText: true,
              decoration: const InputDecoration(
                hintText: '4-digit shift PIN',
                counterText: '',
                prefixIcon: Icon(Icons.pin_outlined),
              ),
            ),
            const SizedBox(height: SQSpace.md),
            Text('Shift roles', style: SQType.caption),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final role in const ['PACKER', 'RIDER', 'MANAGER'])
                  FilterChip(
                    label: Text(role),
                    selected: _roles.contains(role),
                    onSelected: (v) => setState(() {
                      v ? _roles.add(role) : _roles.remove(role);
                    }),
                    selectedColor: SQColor.lime,
                    checkmarkColor: SQColor.ink,
                    labelStyle: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                        color: SQColor.ink),
                    side: BorderSide(
                        color: _roles.contains(role)
                            ? SQColor.green
                            : SQColor.line),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(SQRadius.xs)),
                  ),
              ],
            ),
            const SizedBox(height: SQSpace.sm),
            if (_roles.contains('RIDER'))
              TextField(
                controller: _vehicle,
                decoration: const InputDecoration(
                    hintText: 'Vehicle details (optional)',
                    prefixIcon: Icon(Icons.two_wheeler_outlined)),
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
              label: 'Save team member',
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
