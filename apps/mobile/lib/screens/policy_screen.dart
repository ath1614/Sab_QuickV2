import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api_client.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

/// Native policy screens — the website's Privacy / Terms / Refund pages,
/// ported into Flutter so the app never opens the website. Also hosts the
/// in-app delete-account flow (OTP-confirmed, DPDP/GDPR-style).
enum PolicyKind { privacy, terms, refund }

class PolicyScreen extends StatelessWidget {
  final PolicyKind kind;

  const PolicyScreen({super.key, required this.kind});

  String get _title => switch (kind) {
        PolicyKind.privacy => 'Privacy Policy',
        PolicyKind.terms => 'Terms of Service',
        PolicyKind.refund => 'Refund & Cancellation',
      };

  String get _tagline => switch (kind) {
        PolicyKind.privacy =>
          'Consumer data protection & transparency — compliant with the DPDP Act.',
        PolicyKind.terms =>
          'Customer agreement & fulfillment SLA for every SabQuick order.',
        PolicyKind.refund =>
          'Clear, fair and fast resolutions for every order.',
      };

  List<(String, String)> get _sections => switch (kind) {
        PolicyKind.privacy => const [
            (
              'Information we collect & exact use',
              'Mobile number & name — used exclusively to verify identity via secure OTP, coordinate rider drop-off and send dispatch notifications. '
                  'Delivery address & GPS — collected with your permission solely to verify your doorstep lies within our 2.5 km dark store geofence and to navigate riders to your pin. Location data is never shared with third-party advertisers. '
                  'Camera & photo access (optional) — used on mobile devices to capture proof-of-delivery receipts. Your photo library is never scanned without an explicit user-initiated selection. '
                  'Payment & transaction details — processing is handled by RBI-licensed aggregators (Cashfree Payments and Razorpay). SabQuick never stores raw card numbers, CVV or UPI MPIN on its servers.'
            ),
            (
              'Third-party subprocessors',
              'Google Firebase: phone authentication, SMS OTP dispatch and push notification tokens. '
                  'Cashfree Payments & Razorpay: secure digital checkout, UPI intents and payment verification. '
                  'Google Maps & OpenStreetMap: geofence verification, address reverse-geocoding and rider transit mapping.'
            ),
            (
              'Account deletion right',
              'In adherence to the DPDP Act and app-store data policies, every registered customer can permanently delete their account and associated personal data directly in this app — open Account → Delete Account. '
                  'Upon confirmation your profile, phone number, saved addresses and active sessions are purged within 48 hours, retaining only statutory tax invoices mandated by Indian GST regulations.'
            ),
            (
              'Grievance officer & store contact',
              'Store operator: SabQuick Retail / Anurag Soni. Physical fulfillment center: Dark Store #01, Ambikapur, Chhattisgarh 497001, India. '
                  'Grievance email: sabsupermart68@gmail.com · Direct phone: +91 9109066668.'
            ),
          ],
        PolicyKind.terms => const [
            (
              'Hyper-local fulfillment service & geofence SLA',
              'SabQuick operates a network of hyper-local dark stores delivering everyday groceries, dairy, provisions and household essentials. Deliveries are strictly restricted to delivery addresses verified within our active 2.5 kilometer delivery geofence from the dark store hub.'
            ),
            (
              '10–15 minute delivery commitment',
              'Our operational SLA targets 10 to 15 minute delivery from packing completion to your doorstep under standard weather and traffic conditions. In cases of severe weather, unpassable roadblocks or force majeure events, estimated times may adjust dynamically in real time.'
            ),
            (
              'Pricing, inventory & payment methods',
              'All prices listed on SabQuick are inclusive of applicable GST. We offer UPI & digital payments (Google Pay, PhonePe, Paytm and Net Banking) processed via Cashfree Payments / Razorpay, and Pay on Delivery (cash or dynamic UPI at doorstep). '
                  'SabQuick sells physical goods delivered in the physical world, exempt from in-app purchase commissions under app-store billing guidelines for physical goods.'
            ),
            (
              'Order cancellation & returns',
              'Orders can be cancelled from the order tracking screen while they are placed or confirmed, with immediate reversal of online payments. Once a rider is in transit, cancellation is closed to protect perishables — see the Refund & Cancellation policy for damage and quality guarantees.'
            ),
            (
              'Governing law & jurisdiction',
              'These terms are governed by the laws of the Republic of India. Any disputes are subject to the exclusive jurisdiction of the competent courts in Ambikapur, Chhattisgarh, India.'
            ),
          ],
        PolicyKind.refund => const [
            (
              'Cancellation before dispatch — 100% immediate refund',
              'You may cancel any order directly from the order tracking screen while the order status is PLACED or CONFIRMED. If payment was made online via UPI, cards or net banking, the payment is reversed immediately.'
            ),
            (
              'After dispatch / rider in transit',
              'Once a rider has picked up the packed items and is in transit, cancellation cannot be completed in the app to protect perishable groceries (milk, dairy, bread). In an emergency, contact support immediately.'
            ),
            (
              'Damaged, expired or missing items guarantee',
              'All packaging is inspected prior to dispatch. If you receive an item that is physically damaged, leaked or unsealed in transit, past its expiry date, or simply not what you ordered — notify our team within 24 hours of delivery with a photo. We issue an instant replacement dispatched within 15 minutes or a full refund to your original payment method.'
            ),
            (
              'Refund processing timelines',
              'UPI (GPay / PhonePe / Paytm): direct bank transfer, usually within 15–30 minutes. Debit / credit cards: payment gateway reversal in 2–4 business days. Net banking: bank account transfer in 3–5 business days. Cash on delivery: direct UPI payout or store credit immediately upon verification.'
            ),
            (
              'Customer support helpline',
              'Direct WhatsApp & call: +91 9109066668 · Support email: sabsupermart68@gmail.com · Operating hours: 7:00 AM – 11:00 PM IST, 7 days a week.'
            ),
          ],
      };

  void _contactSupport() async {
    try {
      await launchUrl(Uri.parse('tel:+919109066668'));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.fog,
      appBar: AppBar(
        title: Text(_title),
        backgroundColor: SQColor.card,
        surfaceTintColor: Colors.transparent,
      ),
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding:
              const EdgeInsets.fromLTRB(SQSpace.md, SQSpace.sm, SQSpace.md, SQSpace.xl),
          children: [
            Container(
              padding: const EdgeInsets.all(SQSpace.md),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    SQColor.green.withValues(alpha: 0.08),
                    SQColor.card,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(SQRadius.sm),
                border: Border.all(color: SQColor.line),
              ),
              child: Text(_tagline,
                  style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: SQColor.greenDeep)),
            ),
            const SizedBox(height: SQSpace.md),
            for (final (index, (heading, body)) in _sections.indexed) ...[
              _PolicySection(
                index: index + 1,
                heading: heading,
                body: body,
              ),
            ],
            const SizedBox(height: SQSpace.md),
            SQButton(
              label: 'Call support',
              icon: Icons.support_agent_outlined,
              onTap: _contactSupport,
            ),
            if (kind == PolicyKind.privacy) ...[
              const SizedBox(height: SQSpace.sm),
              SQButton(
                label: 'Delete my account',
                icon: Icons.delete_outline_rounded,
                destructive: true,
                onTap: () => showDeleteAccountSheet(context),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PolicySection extends StatelessWidget {
  final int index;
  final String heading;
  final String body;

  const _PolicySection({
    required this.index,
    required this.heading,
    required this.body,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: SQColor.card,
        borderRadius: BorderRadius.circular(SQRadius.sm),
        border: Border.all(color: SQColor.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: SQColor.green.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Text('$index',
                    style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: SQColor.green)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(heading,
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: SQColor.ink)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(body,
              style: const TextStyle(
                  fontSize: 12.5, height: 1.55, color: SQColor.inkSoft)),
        ],
      ),
    );
  }
}

// ═════════════════ In-app delete-account flow ═════════════════

/// OTP-confirmed account deletion (POST /api/user/delete-account,
/// action:"request" then action:"confirm"). Owner/staff accounts are
/// rejected by the server — the error surfaces inline.
Future<void> showDeleteAccountSheet(BuildContext context) async {
  await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const _DeleteAccountSheet(),
  );
}

class _DeleteAccountSheet extends StatefulWidget {
  const _DeleteAccountSheet();

  @override
  State<_DeleteAccountSheet> createState() => _DeleteAccountSheetState();
}

class _DeleteAccountSheetState extends State<_DeleteAccountSheet> {
  final _api = ApiClient.instance;
  final _otp = TextEditingController();
  bool _codeSent = false;
  bool _busy = false;
  String? _error;

  String get _phone => ((_api.user?['phone'] ?? '') as String).trim();

  @override
  void dispose() {
    _otp.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    if (_phone.isEmpty) {
      setState(
          () => _error = 'No verified phone on this account — contact support.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _api.requestAccountDeletion(_phone);
      if (!mounted) return;
      setState(() {
        _codeSent = true;
        _busy = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = 'Network error. Try again.';
      });
    }
  }

  Future<void> _confirmDelete() async {
    final otp = _otp.text.trim();
    if (otp.length != 4) {
      setState(() => _error = 'Enter the 4-digit code.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _api.confirmAccountDeletion(_phone, otp);
      // On success the client wiped the session and broadcast logged-out;
      // the app shell swaps to the auth screen on its own.
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = 'Network error. Try again.';
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
          borderRadius: BorderRadius.vertical(top: Radius.circular(SQRadius.lg)),
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
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: SQColor.danger.withValues(alpha: 0.09),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.delete_forever_outlined,
                      color: SQColor.danger, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(child: Text('Delete your account?', style: SQType.h1)),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _codeSent
                  ? 'Enter the 4-digit code sent to +91 $_phone to confirm permanent deletion.'
                  : 'We will text a confirmation code to your registered number (+91 $_phone). '
                      'Your profile, addresses and sessions are purged within 48 hours.',
              style: SQType.body,
            ),
            const SizedBox(height: SQSpace.lg),
            if (!_codeSent)
              SQButton(
                label: 'Send deletion code',
                icon: Icons.sms_outlined,
                loading: _busy,
                onTap: _requestCode,
              )
            else ...[
              TextField(
                controller: _otp,
                keyboardType: TextInputType.number,
                maxLength: 4,
                textAlign: TextAlign.center,
                autofocus: true,
                style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 12),
                decoration: const InputDecoration(
                    hintText: '••••', counterText: ''),
              ),
              const SizedBox(height: SQSpace.md),
              SQButton(
                label: 'Permanently delete',
                icon: Icons.delete_forever_outlined,
                destructive: true,
                loading: _busy,
                onTap: _confirmDelete,
              ),
              TextButton(
                onPressed: _busy ? null : _requestCode,
                child: const Text('Resend code',
                    style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: SQSpace.sm),
              Text(_error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: SQColor.danger,
                      fontSize: 12,
                      fontWeight: FontWeight.w700)),
            ],
          ],
        ),
      ),
    );
  }
}
