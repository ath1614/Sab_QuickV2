import 'dart:async';

/// Broadcast whenever the app switches between logged-out (Auth) and
/// logged-in (Home). Lives in its own module so both the app shell and the
/// API client can broadcast/listen without circular imports: the client
/// flips to `false` on an expired session (HTTP 401), the UI reacts.
final StreamController<bool> authStateController =
    StreamController<bool>.broadcast();
