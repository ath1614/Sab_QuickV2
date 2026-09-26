import 'package:flutter/material.dart';

import '../api_client.dart';
import '../widgets/pressable.dart';
import 'home_screen.dart';

/// Phone-first auth: number -> OTP (customers) or PIN (owner/staff).
/// Mirrors the web login exactly via NextAuth credentials + session cookie.
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  final _nameController = TextEditingController();

  bool _codeStep = false;
  bool _requireName = false;
  bool _isStaffPin = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    final phone = _phoneController.text.trim();
    if (phone.length != 10) {
      setState(() => _error = 'Enter a valid 10-digit mobile number');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final resp = await ApiClient.instance.sendOtp(phone);
      setState(() {
        _codeStep = true;
        _isStaffPin = resp['requirePin'] == true;
        _requireName = resp['isNewUser'] == true && resp['requirePin'] != true;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Network error. Please try again.');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    final phone = _phoneController.text.trim();
    final code = _codeController.text.trim();
    if (code.length != 4) {
      setState(() => _error = 'Enter the 4-digit code');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (_isStaffPin) {
        await ApiClient.instance.loginWithPin(phone: phone, pin: code);
      } else {
        await ApiClient.instance.loginWithOtp(
          phone: phone,
          otp: code,
          name: _requireName ? _nameController.text.trim() : null,
        );
      }
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (_, _, _) => const HomeScreen(),
          transitionsBuilder: (_, animation, _, child) => FadeTransition(
            opacity: animation,
            child: child,
          ),
        ),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Login failed. Please try again.');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: !_codeStep ? _buildPhoneStep(primary) : _buildCodeStep(primary),
          ),
        ),
      ),
    );
  }

  Widget _buildPhoneStep(Color primary) {
    return Column(
      key: const ValueKey('phone-step'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 64),
        Container(
          width: 76,
          height: 76,
          decoration: BoxDecoration(
            color: primary,
            borderRadius: BorderRadius.circular(22),
          ),
          alignment: Alignment.center,
          child: const Text(
            'SQ',
            style: TextStyle(
              color: Colors.white,
              fontSize: 30,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Groceries in 10-15 minutes',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            height: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Login with your mobile number to start shopping from the SabQuick dark store.',
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey.shade600,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 32),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Text(
                '🇮🇳 +91',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  letterSpacing: 1,
                ),
                decoration: const InputDecoration(
                  hintText: '98765 43210',
                  counterText: '',
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Pressable(
          onTap: _loading ? null : _sendCode,
          child: FilledButton(
            onPressed: null,
            child: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Continue'),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(
            _error!,
            style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12, fontWeight: FontWeight.w700),
          ),
        ],
      ],
    );
  }

  Widget _buildCodeStep(Color primary) {
    return Column(
      key: const ValueKey('code-step'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 64),
        Text(
          'Enter code',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: Colors.grey.shade900,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Sent to +91 ${_phoneController.text}',
          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 28),
        if (_requireName) ...[
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(hintText: 'Your name'),
          ),
          const SizedBox(height: 14),
        ],
        TextField(
          controller: _codeController,
          keyboardType: TextInputType.number,
          maxLength: 4,
          obscureText: _isStaffPin,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            letterSpacing: 12,
          ),
          decoration: const InputDecoration(hintText: '••••', counterText: ''),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: _codeStep ? () => setState(() => _codeStep = false) : null,
          child: const Text('Wrong number? Go back'),
        ),
        const SizedBox(height: 12),
        Pressable(
          onTap: _loading ? null : _verify,
          child: FilledButton(
            onPressed: null,
            child: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Verify & Continue'),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(
            _error!,
            style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12, fontWeight: FontWeight.w700),
          ),
        ],
      ],
    );
  }
}
