import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api_client.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import 'home_screen.dart';

/// Stage 2 of the launch flow: authentication.
/// Phone → OTP (customers) / PIN (staff & owner). Mirrors the website's
/// AuthModal exactly, including the display-mode "Quick Code" surfacing.
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen>
    with SingleTickerProviderStateMixin {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  final _nameController = TextEditingController();

  bool _codeStep = false;
  bool _requireName = false;
  bool _isStaffPin = false;
  bool _isOwner = false;
  bool _loading = false;
  String? _error;
  String? _displayCode; // shown only in OTP display mode

  late final AnimationController _stagger = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 650),
  );

  @override
  void initState() {
    super.initState();
    _stagger.forward();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    _nameController.dispose();
    _stagger.dispose();
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
      _displayCode = null;
    });
    try {
      final resp = await ApiClient.instance.sendOtp(phone);
      if (!mounted) return;
      if (resp['requirePin'] == true) {
        setState(() {
          _codeStep = true;
          _isStaffPin = true;
          _isOwner = resp['isOwner'] == true;
        });
      } else {
        setState(() {
          _codeStep = true;
          _isStaffPin = false;
          _isOwner = false;
          _requireName = resp['isNewUser'] == true;
          // OTP display mode (production has no SMS gateway yet): the backend
          // returns the code so the login can complete. When real SMS is
          // enabled via FAST2SMS/TWOFACTOR keys, freeOtp disappears and this
          // UI simply doesn't render the banner.
          if (resp['freeOtp'] is String) {
            _displayCode = resp['freeOtp'] as String;
            _codeController.text = _displayCode!;
          }
        });
      }
      _stagger.forward(from: 0.2);
    } on ApiException catch (e) {          setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Network error. Please try again.');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    final phone = _phoneController.text.trim();
    final code = _codeController.text.trim();
    if (code.length != (_isOwner ? 6 : 4)) {
      setState(() => _error = 'Enter the ${_isOwner ? 6 : 4}-digit code');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (_isStaffPin) {
        // NextAuth authorize() expects staff/owner PINs in the `pin` field.
        await ApiClient.instance.loginWithPin(phone: phone, pin: code);
      } else {
        await ApiClient.instance.loginWithOtp(
          phone: phone,
          otp: code,
          name: _requireName ? _nameController.text.trim() : null,
        );
      }
      if (!mounted) return;
      Navigator.of(context).pushReplacement(_fadeRoute(const HomeScreen()));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Login failed. Please try again.');
    } finally {
      setState(() => _loading = false);
    }
  }

  Route _fadeRoute(Widget page) => PageRouteBuilder(
        pageBuilder: (_, _, _) => page,
        transitionsBuilder: (_, animation, _, child) => FadeTransition(
          opacity: CurvedAnimation(parent: animation, curve: SQMotion.curveOut),
          child: child,
        ),
        transitionDuration: SQMotion.slow,
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.fog,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: SQSpace.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: !_codeStep
                  ? _buildPhoneStep()
                  : _buildCodeStep(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _brandHeader() {
    return FadeTransition(
      opacity: _stagger,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 64,
            height: 64,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(SQRadius.md),
              border: Border.all(color: SQColor.line),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Image.asset('assets/brand/app-icon.png', fit: BoxFit.contain),
          ),
        ],
      ),
    );
  }

  Widget _buildPhoneStep() {
    return Column(
      key: const ValueKey('phone-step'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 24),
        _brandHeader(),
        const SizedBox(height: SQSpace.lg),
        HighlightText(
          text: 'Fresh =groceries=\ndelivered =fast=.',
          style: SQType.display,
        ),
        const SizedBox(height: 8),
        Text(
          'Log in with your mobile number to shop the SabQuick dark store.',
          style: SQType.body,
        ),
        const SizedBox(height: SQSpace.xl),
        // Phone field
        Row(
          children: [
            Container(
              height: 54,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(SQRadius.md),
                border: Border.all(color: SQColor.line),
              ),
              alignment: Alignment.center,
              child: const Text('🇮🇳 +91',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 17,
                    letterSpacing: 1.5),
                decoration: const InputDecoration(
                  hintText: '98765 43210',
                  counterText: '',
                ),
                onSubmitted: (_) => _sendCode(),
              ),
            ),
          ],
        ),
        const SizedBox(height: SQSpace.md),
        SQButton(
          label: 'Continue',
          icon: Icons.arrow_forward_rounded,
          loading: _loading,
          onTap: _sendCode,
        ),
        if (_error != null) ...[
          const SizedBox(height: SQSpace.sm),
          Text(_error!,
              style: const TextStyle(
                  color: SQColor.danger,
                  fontSize: 12,
                  fontWeight: FontWeight.w700)),
        ],
        const SizedBox(height: SQSpace.xl),
        Text(
          'By proceeding you agree to our Terms & Privacy Policy.',
          style: SQType.micro,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildCodeStep() {
    final codeLength = _isOwner ? 6 : 4;
    return Column(
      key: const ValueKey('code-step'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 24),
        _brandHeader(),
        const SizedBox(height: SQSpace.lg),
        Text(
          _isStaffPin
              ? (_isOwner ? 'Owner passcode' : 'Staff shift login')
              : 'Verify your number',
          style: SQType.h1,
        ),
        const SizedBox(height: 6),
        Text(
          _isStaffPin
              ? 'For +91 ${_phoneController.text}'
              : 'We sent a 4-digit code to +91 ${_phoneController.text}',
          style: SQType.body,
        ),
        const SizedBox(height: SQSpace.lg),

        // Display-mode Quick Code banner (matches website behavior)
        if (_displayCode != null)
          Container(
            margin: const EdgeInsets.only(bottom: SQSpace.md),
            padding: const EdgeInsets.all(SQSpace.md),
            decoration: BoxDecoration(
              color: SQColor.lime.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(SQRadius.md),
              border: Border.all(color: SQColor.lime.withValues(alpha: 0.6)),
            ),
            child: Row(
              children: [
                const Icon(Icons.bolt_rounded, color: SQColor.greenDeep),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Your quick code is $_displayCode',
                    style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 13.5,
                        color: SQColor.greenDeep),
                  ),
                ),
              ],
            ),
          ),

        if (_requireName) ...[
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(hintText: 'Your name'),
          ),
          const SizedBox(height: SQSpace.sm),
        ],
        TextField(
          controller: _codeController,
          keyboardType: TextInputType.number,
          maxLength: codeLength,
          obscureText: _isStaffPin,
          textAlign: TextAlign.center,
          autofocus: true,
          style: TextStyle(
            fontSize: _isOwner ? 24 : 28,
            fontWeight: FontWeight.w900,
            letterSpacing: _isOwner ? 8 : 12,
          ),
          decoration: InputDecoration(
            hintText: '•' * codeLength,
            counterText: '',
          ),
          onSubmitted: (_) => _verify(),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => setState(() {
            _codeStep = false;
            _displayCode = null;
            _error = null;
          }),
          child: const Text('Wrong number? Go back',
              style: TextStyle(fontWeight: FontWeight.w800)),
        ),
        const SizedBox(height: SQSpace.sm),
        SQButton(
          label: _isStaffPin ? 'Clock in' : 'Verify & continue',
          icon: Icons.verified_rounded,
          loading: _loading,
          onTap: _verify,
        ),
        if (_error != null) ...[
          const SizedBox(height: SQSpace.sm),
          Text(_error!,
              style: const TextStyle(
                  color: SQColor.danger,
                  fontSize: 12,
                  fontWeight: FontWeight.w700)),
        ],
      ],
    );
  }
}
