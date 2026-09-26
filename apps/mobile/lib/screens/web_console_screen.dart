import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../api_client.dart';
import '../config.dart';
import '../design/tokens.dart';

/// Opens the website's staff consoles (Owner Hub, Manager Kanban, Packer
/// station, Catalog & Pricing) inside the app — the SAME pages the website
/// links between, so the app stays in perfect sync with the web experience.
///
/// The NextAuth session cookie captured at login is injected into the
/// WebView, so the console pages authenticate exactly like the browser.
class WebConsoleScreen extends StatefulWidget {
  final String title;
  final String path;

  const WebConsoleScreen({
    super.key,
    required this.title,
    required this.path,
  });

  @override
  State<WebConsoleScreen> createState() => _WebConsoleScreenState();
}

class _WebConsoleScreenState extends State<WebConsoleScreen> {
  late final WebViewController _controller;
  bool _loading = true;
  double _progress = 0;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onProgress: (p) {
          if (!mounted) return;
          setState(() => _progress = p / 100);
        },
        onPageFinished: (_) {
          if (!mounted) return;
          setState(() => _loading = false);
        },
      ));

    // Android: enable mixed content + third-party cookies so the console
    // pages behave exactly like Chrome.
    if (_controller.platform is AndroidWebViewController) {
      final android = _controller.platform as AndroidWebViewController;
      android.setMediaPlaybackRequiresUserGesture(false);
    }

    _loadWithSession();
  }

  Future<void> _loadWithSession() async {
    // Seed the WebView cookie jar with the app's NextAuth session cookie.
    final cookieManager = WebViewCookieManager();
    final cookies = ApiClient.instance.sessionCookieHeader;
    if (cookies != null) {
      for (final pair in cookies.split('; ')) {
        final idx = pair.indexOf('=');
        if (idx <= 0) continue;
        final host = Uri.parse(AppConfig.baseUrl).host;
        await cookieManager.setCookie(
          WebViewCookie(
            name: pair.substring(0, idx),
            value: pair.substring(idx + 1),
            domain: host,
            path: '/',
          ),
        );
      }
    }
    await _controller.loadRequest(Uri.parse('${AppConfig.baseUrl}${widget.path}'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SQColor.card,
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_new_rounded, size: 20),
            tooltip: 'Open in browser',
            onPressed: () {
              Clipboard.setData(ClipboardData(
                  text: '${AppConfig.baseUrl}${widget.path}'));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Link copied')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            tooltip: 'Reload',
            onPressed: () => _controller.reload(),
          ),
        ],
        bottom: _loading
            ? PreferredSize(
                preferredSize: const Size.fromHeight(2),
                child: LinearProgressIndicator(
                  value: _progress == 0 ? null : _progress,
                  minHeight: 2,
                  backgroundColor: SQColor.line,
                  valueColor:
                      const AlwaysStoppedAnimation<Color>(SQColor.green),
                ),
              )
            : null,
      ),
      body: WebViewWidget(controller: _controller),
    );
  }
}
