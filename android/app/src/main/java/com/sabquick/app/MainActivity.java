package com.sabquick.app;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

import com.cashfree.pg.api.CFPaymentGatewayService;
import com.cashfree.pg.core.api.CFSession;
import com.cashfree.pg.core.api.base.CFPayment;
import com.cashfree.pg.core.api.callback.CFCheckoutResponseCallback;
import com.cashfree.pg.core.api.exception.CFException;
import com.cashfree.pg.core.api.upi.CFUPI;
import com.cashfree.pg.core.api.upi.CFUPIPayment;
import com.cashfree.pg.core.api.utils.CFErrorResponse;
import com.cashfree.pg.core.api.utils.CFUPIApp;
import com.cashfree.pg.core.api.utils.CFUPIUtil;
import com.cashfree.pg.ui.api.upi.intent.CFUPIIntentCheckoutPayment;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Capacitor shell for SabQuick.
 *
 * Payments: the native Cashfree Android SDK is the ONLY reliable way to get a
 * true UPI Intent (PhonePe / Google Pay / Paytm opening directly) inside a
 * WebView app. The Cashfree *hosted* web checkout cannot launch UPI apps from a
 * WebView unless the account has a support-enabled feature flag, so on native we
 * bypass it entirely:
 *
 *   Web UI  --(NativeUpi plugin)-->  CFPaymentGatewayService  -->  UPI app
 *
 * Two failure modes are fixed here and both were fatal before:
 *   1. CFPaymentGatewayService.getInstance() THROWS unless
 *      CFPaymentGatewayService.initialize(context) has been called first.
 *      It never was, so every native attempt died instantly.
 *   2. The JS layer never invoked the plugin at all - the chosen UPI app was
 *      dropped and the user was dumped into Cashfree's hosted web page.
 */
public class MainActivity extends BridgeActivity implements CFCheckoutResponseCallback {
  private static final String TAG = "SabQuick";

  /** Request code used when we hand off to a UPI app, so we can tell the checkout page we are back. */
  private static final int UPI_LAUNCH_REQUEST = 10007;

  @CapacitorPlugin(name = "NativeUpi")
  public static class NativeUpiPlugin extends Plugin {

    /** The in-flight plugin call so the SDK callback can resolve it. */
    private static PluginCall pendingUpiCall;

    /** Kept so the SDK callback (which fires outside the plugin) can emit events. */
    private static NativeUpiPlugin pluginRef;

    /**
     * Set when the customer picked a UPI app that is not installed: the Cashfree
     * app list is shown instead, and the final result carries this note so the
     * UI can explain the substitution.
     */
    private static String pendingMissingPackage;

    // ---------------------------------------------------------------------
    // Result plumbing: the Cashfree SDK calls back into the Activity, not into
    // this plugin, so results are handed back through a static channel.
    // ---------------------------------------------------------------------
    static void deliverResult(String status, String orderId, String message, String code) {
      new Handler(Looper.getMainLooper()).post(() -> {
        JSObject ret = new JSObject();
        ret.put("status", status);
        if (orderId != null) ret.put("orderId", orderId);
        if (message != null) ret.put("error", message);
        if (code != null) ret.put("code", code);
        if (pendingMissingPackage != null) {
          ret.put("fallback", true);
          ret.put("missingPackage", pendingMissingPackage);
        }
        pendingMissingPackage = null;

        Log.i(TAG, "Cashfree UPI result: " + status + " / " + orderId + " / " + message);

        NativeUpiPlugin ref = pluginRef;
        if (ref != null) {
          // Also emit an event: if Android restarted the WebView while the UPI
          // app was in the foreground, the JS promise is gone but the page can
          // still react to this event and re-verify the order.
          try {
            ref.notifyListeners("cashfreeUpiResult", ret, true);
          } catch (Throwable t) {
            Log.w(TAG, "notifyListeners failed: " + t.getMessage());
          }
        }

        PluginCall call = pendingUpiCall;
        pendingUpiCall = null;
        if (call != null) {
          try {
            call.resolve(ret);
          } catch (Throwable t) {
            Log.w(TAG, "Could not resolve pending UPI call: " + t.getMessage());
          }
        }
      });
    }

    /** Clears the pending call so a stale callback cannot resolve a later payment. */
    private static void clearPending() {
      pendingUpiCall = null;
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private static CFSession buildSession(String paymentSessionId, String orderId, String envStr)
        throws CFException {
      CFSession.Environment environment = "SANDBOX".equalsIgnoreCase(envStr)
          ? CFSession.Environment.SANDBOX
          : CFSession.Environment.PRODUCTION;

      return new CFSession.CFSessionBuilder()
          .setEnvironment(environment)
          .setPaymentSessionID(paymentSessionId)
          .setOrderId(orderId != null ? orderId : "")
          .build();
    }

    /** True when the given UPI app package is actually installed and launchable. */
    private boolean isPackageInstalled(String packageName) {
      if (packageName == null || packageName.trim().isEmpty()) return false;
      try {
        PackageManager pm = getContext().getPackageManager();
        ApplicationInfo info = pm.getApplicationInfo(packageName.trim(), 0);
        return info != null && info.enabled;
      } catch (Exception e) {
        // Try a second strategy: some apps only expose an activity, no ApplicationInfo.
        try {
          return getContext().getPackageManager().getLaunchIntentForPackage(packageName.trim()) != null;
        } catch (Exception ignored) {
          return false;
        }
      }
    }

    /**
     * Cashfree's own UPI app list (native screen). Used for "Any other UPI app"
     * and as the automatic fallback when a specifically chosen app is missing.
     */
    private void launchChooser(PluginCall call, String paymentSessionId, String orderId, String envStr) {
      getActivity().runOnUiThread(() -> {
        try {
          CFUPIIntentCheckoutPayment chooser =
              new CFUPIIntentCheckoutPayment.CFUPIIntentPaymentBuilder()
                  .setSession(buildSession(paymentSessionId, orderId, envStr))
                  .build();

          pendingUpiCall = call;
          CFPaymentGatewayService.getInstance().doPayment(getActivity(), chooser);
        } catch (CFException e) {
          Log.e(TAG, "Cashfree chooser CFException: " + e.getMessage(), e);
          clearPending();
          call.reject("Cashfree Native Error: " + e.getMessage());
        } catch (Exception e) {
          Log.e(TAG, "Unexpected error launching Cashfree chooser: " + e.getMessage(), e);
          clearPending();
          call.reject(e.getMessage());
        }
      });
    }

    // ---------------------------------------------------------------------
    // Plugin methods
    // ---------------------------------------------------------------------

    /**
     * The important one: opens ONE specific UPI app (by package name) using
     * Cashfree's Element UPI Intent flow. This is what makes "Pay with Google
     * Pay / PhonePe / Paytm" jump straight into that app with the amount
     * pre-filled, with Cashfree still verifying the payment server-side.
     *
     * Params: paymentSessionId, orderId, packageName (optional), environment
     */
    @PluginMethod
    public void launchCashfreeUpiIntent(PluginCall call) {
      String paymentSessionId = call.getString("paymentSessionId");
      String orderId = call.getString("orderId", "");
      String packageName = call.getString("packageName");
      String envStr = call.getString("environment", "PRODUCTION");

      if (paymentSessionId == null || paymentSessionId.isEmpty()) {
        call.reject("paymentSessionId cannot be empty");
        return;
      }

      pluginRef = this;

      // No specific app requested -> Cashfree's own native UPI app list.
      if (packageName == null || packageName.trim().isEmpty()) {
        launchChooser(call, paymentSessionId, orderId, envStr);
        return;
      }

      // The chosen app is not installed: do not fail the payment, fall back to
      // the Cashfree UPI app list and tell JS so the UI can explain it.
      if (!isPackageInstalled(packageName)) {
        Log.w(TAG, "Requested UPI app not installed (" + packageName + "), using Cashfree chooser");
        pendingMissingPackage = packageName.trim();
        launchChooser(call, paymentSessionId, orderId, envStr);
        return;
      }

      final String appPackage = packageName.trim();

      getActivity().runOnUiThread(() -> {
        try {
          // CFUPI.Mode.INTENT + setUPIID(<package name>) = launch that exact app.
          CFUPI cfUpi = new CFUPI.CFUPIBuilder()
              .setMode(CFUPI.Mode.INTENT)
              .setUPIID(appPackage)
              .build();

          CFPayment payment = new CFUPIPayment.CFUPIPaymentBuilder()
              .setSession(buildSession(paymentSessionId, orderId, envStr))
              .setCfUPI(cfUpi)
              .build();

          Log.i(TAG, "Launching Cashfree UPI Intent for " + appPackage);
          pendingUpiCall = call;
          CFPaymentGatewayService.getInstance().doPayment(getActivity(), payment);
        } catch (CFException e) {
          Log.e(TAG, "Cashfree UPI Intent CFException: " + e.getMessage(), e);
          clearPending();
          call.reject("Cashfree Native Error: " + e.getMessage());
        } catch (Exception e) {
          Log.e(TAG, "Unexpected error launching Cashfree UPI intent: " + e.getMessage(), e);
          clearPending();
          call.reject(e.getMessage());
        }
      });
    }

    /** Cashfree's built-in UPI app list (kept for "Any other UPI app"). */
    @PluginMethod
    public void launchCashfreeNativeUpi(PluginCall call) {
      String paymentSessionId = call.getString("paymentSessionId");
      String orderId = call.getString("orderId", "");
      String envStr = call.getString("environment", "PRODUCTION");

      if (paymentSessionId == null || paymentSessionId.isEmpty()) {
        call.reject("paymentSessionId cannot be empty");
        return;
      }

      pluginRef = this;
      launchChooser(call, paymentSessionId, orderId, envStr);
    }

    /** Cashfree's full native checkout (cards, netbanking, wallets, UPI). */
    @PluginMethod
    public void launchCashfreeNativeDrop(PluginCall call) {
      String paymentSessionId = call.getString("paymentSessionId");
      String orderId = call.getString("orderId", "");
      String envStr = call.getString("environment", "PRODUCTION");

      if (paymentSessionId == null || paymentSessionId.isEmpty()) {
        call.reject("paymentSessionId cannot be empty");
        return;
      }

      pluginRef = this;

      getActivity().runOnUiThread(() -> {
        try {
          com.cashfree.pg.ui.api.CFDropCheckoutPayment dropPayment =
              new com.cashfree.pg.ui.api.CFDropCheckoutPayment.CFDropCheckoutPaymentBuilder()
                  .setSession(buildSession(paymentSessionId, orderId, envStr))
                  .build();

          pendingUpiCall = call;
          CFPaymentGatewayService.getInstance().doPayment(getActivity(), dropPayment);
        } catch (CFException e) {
          Log.e(TAG, "Cashfree Native Drop CFException: " + e.getMessage(), e);
          clearPending();
          call.reject("Cashfree Native Error: " + e.getMessage());
        } catch (Exception e) {
          Log.e(TAG, "Unexpected error launching Cashfree Drop: " + e.getMessage(), e);
          clearPending();
          call.reject(e.getMessage());
        }
      });
    }

    private boolean launchIntentInternal(String uriString, String packageName) {
      if (uriString == null || uriString.isEmpty()) return false;
      try {
        Intent intent;
        if (uriString.startsWith("intent://")) {
          intent = Intent.parseUri(uriString, Intent.URI_INTENT_SCHEME);
        } else {
          intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uriString));
        }

        if (packageName != null && !packageName.isEmpty()) {
          intent.setPackage(packageName);
        }

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PackageManager pm = getContext().getPackageManager();
        if (intent.resolveActivity(pm) != null) {
          getContext().startActivity(intent);
          return true;
        }

        // Try browser fallback if intent includes one
        if (uriString.startsWith("intent://")) {
          String fallbackUrl = intent.getStringExtra("browser_fallback_url");
          if (fallbackUrl != null && !fallbackUrl.isEmpty() && getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(fallbackUrl));
            return true;
          }
        }

        // Generic system chooser fallback
        Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(uriString.startsWith("intent://") ? "upi://pay" : uriString));
        Intent chooser = Intent.createChooser(fallback, "Pay with UPI");
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(chooser);
        return true;
      } catch (Exception e) {
        Log.e(TAG, "Could not launch UPI intent: " + e.getMessage(), e);
        return false;
      }
    }

    /** Raw upi:// deeplink launcher (used by the store-VPA / QR flow). */
    @PluginMethod
    public void launchUpi(PluginCall call) {
      String uriString = call.getString("uri");
      String packageName = call.getString("packageName");

      if (uriString == null || uriString.isEmpty()) {
        call.reject("URI cannot be empty");
        return;
      }

      boolean launched = launchIntentInternal(uriString, packageName);
      if (launched) {
        call.resolve();
      } else {
        call.reject("Could not launch UPI payment app");
      }
    }

    /**
     * Lists installed UPI apps. Prefers Cashfree's CFUPIUtil (same list the SDK
     * uses, so a "shown" app is actually launchable), falling back to a plain
     * package query.
     */
    @PluginMethod
    public void getAvailableUpiApps(PluginCall call) {
      try {
        CFUPIUtil.getInstalledUPIApps(getContext(), upiAppList -> {
          // Invoked on a background thread -> hop back to the UI thread.
          try {
            JSArray apps = new JSArray();
            if (upiAppList != null) {
              for (CFUPIApp app : upiAppList) {
                if (app == null) continue;
                JSObject entry = new JSObject();
                entry.put("packageName", app.getAppId());
                entry.put("name", app.getDisplayName());
                apps.put(entry);
              }
            }

            if (apps.length() == 0) {
              JSArray legacy = legacyUpiAppQuery();
              JSObject ret = new JSObject();
              ret.put("apps", legacy);
              ret.put("count", legacy.length());
              ret.put("source", "package-manager");
              call.resolve(ret);
              return;
            }

            JSObject ret = new JSObject();
            ret.put("apps", apps);
            ret.put("count", apps.length());
            ret.put("source", "cashfree");
            call.resolve(ret);
          } catch (Throwable t) {
            call.reject("Could not read installed UPI apps: " + t.getMessage());
          }
        });
      } catch (Throwable t) {
        Log.w(TAG, "CFUPIUtil failed, using package manager query: " + t.getMessage());
        try {
          JSArray apps = legacyUpiAppQuery();
          JSObject ret = new JSObject();
          ret.put("apps", apps);
          ret.put("count", apps.length());
          ret.put("source", "package-manager");
          call.resolve(ret);
        } catch (Exception e) {
          call.reject("Could not query installed UPI apps: " + e.getMessage());
        }
      }
    }

    private JSArray legacyUpiAppQuery() {
      JSArray apps = new JSArray();
      try {
        Uri uri = Uri.parse("upi://pay");
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        PackageManager pm = getContext().getPackageManager();
        List<ResolveInfo> activities = pm.queryIntentActivities(intent, 0);

        for (ResolveInfo info : activities) {
          JSObject app = new JSObject();
          app.put("packageName", info.activityInfo.packageName);
          app.put("name", info.loadLabel(pm).toString());
          apps.put(app);
        }
      } catch (Exception e) {
        Log.w(TAG, "legacyUpiAppQuery failed: " + e.getMessage());
      }
      return apps;
    }

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
      if (url == null) return null;
      String urlStr = url.toString();
      if (isUpiScheme(urlStr)) {
        Log.i(TAG, "Intercepted native UPI scheme via shouldOverrideLoad: " + urlStr);
        launchIntentInternal(urlStr, null);
        return Boolean.TRUE; // Consumes event to prevent WebView ERR_UNKNOWN_URL_SCHEME
      }
      return null;
    }
  }

  /**
   * Cashfree's checkout detects an Android WebView by looking for window.Android exposing both
   * getAppList() and openApp(). Registering this interface makes the hosted checkout render the
   * customer's installed UPI apps and hand the picked one back to us to launch natively.
   *
   * This is Cashfree's documented "code based solution", and it is the path that works for the APKs
   * we ship directly: it needs no support ticket, no feature flag, and - unlike the native Cashfree
   * SDK - no Play Store install (that SDK refuses sideloaded APKs in production with
   * installer_package_not_approved, which is why the native flow above can fail).
   */
  public static class CashfreeUpiBridge {
    private final MainActivity activity;

    CashfreeUpiBridge(MainActivity activity) {
      this.activity = activity;
    }

    /**
     * Called synchronously by the checkout page. Must return a JSON string of
     * [{ "appName": ..., "appPackage": ... }] - an empty array means "no UPI apps found", which
     * makes the page fall back to its own UPI list.
     */
    @JavascriptInterface
    public String getAppList(String uriString) {
      JSONArray apps = new JSONArray();
      try {
        PackageManager pm = activity.getPackageManager();
        String target = (uriString == null || uriString.trim().isEmpty()) ? "upi://pay" : uriString.trim();

        Intent probe;
        if (target.toLowerCase().startsWith("intent://")) {
          probe = Intent.parseUri(target, Intent.URI_INTENT_SCHEME);
        } else {
          probe = new Intent(Intent.ACTION_VIEW, Uri.parse(target));
        }

        // Flag 0 rather than MATCH_DEFAULT_ONLY: some UPI apps do not declare CATEGORY_DEFAULT, and
        // an app missing from this list never shows up as a payment option.
        List<ResolveInfo> handlers = pm.queryIntentActivities(probe, 0);

        // One row per app, even when an app registers several UPI activities.
        Map<String, String> appsByPackage = new LinkedHashMap<>();
        for (ResolveInfo info : handlers) {
          if (info == null || info.activityInfo == null) continue;
          String packageName = info.activityInfo.packageName;
          if (packageName == null || packageName.isEmpty()) continue;
          if (packageName.equals(activity.getPackageName())) continue;
          if (appsByPackage.containsKey(packageName)) continue;
          appsByPackage.put(packageName, info.loadLabel(pm).toString());
        }

        for (Map.Entry<String, String> entry : appsByPackage.entrySet()) {
          JSONObject app = new JSONObject();
          app.put("appName", entry.getValue());
          app.put("appPackage", entry.getKey());
          apps.put(app);
        }

        Log.i(TAG, "Cashfree getAppList(" + target + ") -> " + apps.length() + " apps");
      } catch (Throwable t) {
        Log.w(TAG, "Cashfree getAppList failed: " + t.getMessage());
      }
      return apps.toString();
    }

    /** Launches the UPI app the customer tapped, pinned to that exact package. */
    @JavascriptInterface
    public boolean openApp(String packageName, String upiUrl) {
      Log.i(TAG, "Cashfree openApp(pkg=" + packageName + ")");
      return activity.launchUpiForResult(upiUrl, packageName);
    }

    @JavascriptInterface
    public void enableCancelButton() {
      // There is no native loader chrome to update.
    }

    @JavascriptInterface
    public void disableCancelButton() {
      // There is no native loader chrome to update.
    }
  }

  /**
   * Launches a UPI deep link and remembers the result, so onActivityResult can tell Cashfree's
   * checkout page the customer is back and it should verify the payment.
   */
  private boolean launchUpiForResult(final String uriString, final String packageName) {
    if (!isAllowedBridgeUrl(uriString)) {
      Log.w(TAG, "Refusing non-UPI link handed over by the checkout page");
      return false;
    }

    runOnUiThread(() -> {
      try {
        Intent intent;
        if (uriString.toLowerCase().startsWith("intent://")) {
          intent = Intent.parseUri(uriString, Intent.URI_INTENT_SCHEME);
        } else {
          intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uriString));
        }

        if (packageName != null && !packageName.trim().isEmpty()) {
          intent.setPackage(packageName.trim());
        }

        // No FLAG_ACTIVITY_NEW_TASK: we are an Activity and want the result routed back to us.
        startActivityForResult(intent, UPI_LAUNCH_REQUEST);
      } catch (Throwable t) {
        Log.e(TAG, "Could not launch chosen UPI app: " + t.getMessage(), t);
      }
    });

    return true;
  }

  /**
   * A page loaded in the WebView must not be able to use this bridge to launch arbitrary apps or
   * intents, so only UPI deep links are accepted - directly, or inside an intent:// link.
   */
  private static boolean isAllowedBridgeUrl(String uriString) {
    if (uriString == null || uriString.trim().isEmpty()) return false;
    try {
      if (uriString.toLowerCase().startsWith("intent://")) {
        Intent parsed = Intent.parseUri(uriString, Intent.URI_INTENT_SCHEME);
        Uri data = parsed.getData();
        return data != null && isUpiScheme(data.toString());
      }
      return isUpiScheme(uriString);
    } catch (Throwable t) {
      Log.w(TAG, "Rejected unparseable payment link: " + t.getMessage());
      return false;
    }
  }

  @Override
  protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);

    if (requestCode != UPI_LAUNCH_REQUEST) return;

    try {
      WebView webView = getBridge() != null ? getBridge().getWebView() : null;
      if (webView == null) return;

      // Cashfree's checkout assigns window.showVerifyUI right after openApp(); calling it makes the
      // page confirm the payment and carry on, instead of hanging on "waiting for payment status".
      webView.post(() -> webView.evaluateJavascript(
          "(function(){try{if(typeof window.showVerifyUI==='function'){window.showVerifyUI();return 'verified';}"
              + "return 'showVerifyUI-missing';}catch(e){return 'error:'+e.message;}})()",
          value -> Log.i(TAG, "Returned from UPI app, checkout notified: " + value)));
    } catch (Throwable t) {
      Log.w(TAG, "Could not notify checkout page about UPI return: " + t.getMessage());
    }
  }

  /** Single source of truth for the UPI app schemes Cashfree documents. */
  private static boolean isUpiScheme(String urlStr) {
    if (urlStr == null) return false;
    String lower = urlStr.toLowerCase();
    String[] schemes = {
        "upi://", "intent://", "tez://", "gpay://", "phonepe://", "paytmmp://", "paytm://",
        "bhim://", "credpay://", "amazonpay://", "navipay://", "mobikwik://",
        "myairtel://", "popclubapp://", "super://", "kiwi://", "simplypayupi://",
        "whatsapp-consumer://", "tnupi://", "postpe://", "imobile://", "payzapp://",
        "fpupi://", "snapmint://", "whatsapp://"
    };
    for (String scheme : schemes) {
      if (lower.startsWith(scheme)) return true;
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Cashfree checkout callbacks (registered in onCreate, as Cashfree requires,
  // so activity restarts are handled correctly).
  // -----------------------------------------------------------------------
  @Override
  public void onPaymentVerify(String orderID) {
    Log.i(TAG, "Cashfree onPaymentVerify: " + orderID);
    NativeUpiPlugin.deliverResult("SUCCESS", orderID, null, null);
  }

  @Override
  public void onPaymentFailure(CFErrorResponse cfErrorResponse, String orderID) {
    String message = (cfErrorResponse != null && cfErrorResponse.getMessage() != null)
        ? cfErrorResponse.getMessage()
        : "Payment was cancelled or failed in the UPI app";
    String code = cfErrorResponse != null ? cfErrorResponse.getCode() : null;
    Log.w(TAG, "Cashfree onPaymentFailure: " + message + " (code=" + code + ")");
    NativeUpiPlugin.deliverResult("FAILED", orderID, message, code);
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    // 1. Install UncaughtExceptionHandler crash guard before plugins or activity setup
    final Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
    Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
      String msg = throwable != null ? throwable.getMessage() : "";
      if (msg == null) msg = "";
      Log.e(TAG, "Uncaught exception on thread " + thread.getName() + ": " + msg, throwable);

      // If push notification or Firebase init throws an unchecked exception, suppress it
      // so the app NEVER abruptly crashes on the customer's phone
      if (msg.contains("Firebase") || msg.contains("FirebaseApp") || msg.contains("PushNotifications") ||
          (throwable instanceof IllegalStateException && msg.contains("initialized"))) {
        Log.w(TAG, "Suppressed non-fatal push notification crash cleanly");
        return;
      }

      if (defaultHandler != null) {
        defaultHandler.uncaughtException(thread, throwable);
      }
    });

    // 2. Defensively ensure FirebaseApp is initialized before Capacitor push plugin runs
    try {
      if (FirebaseApp.getApps(this).isEmpty()) {
        FirebaseOptions options = new FirebaseOptions.Builder()
            .setApplicationId("1:197455053731:android:3e00e8b15d65c3bb061016")
            .setGcmSenderId("197455053731")
            .setApiKey("AIzaSyBbGGhlWnPJm2BkwuGWXzpgqA0p233WrHE")
            .setProjectId("sabquick-17da6")
            .setStorageBucket("sabquick-17da6.firebasestorage.app")
            .build();
        FirebaseApp.initializeApp(this, options);
        Log.i(TAG, "FirebaseApp initialized programmatically");
      }
    } catch (Throwable t) {
      Log.w(TAG, "FirebaseApp programmatic init skipped/error: " + t.getMessage());
    }

    registerPlugin(NativeUpiPlugin.class);
    super.onCreate(savedInstanceState);

    // 2b. Cashfree SDK bootstrap. CFPaymentGatewayService.getInstance() throws
    //     until initialize(context) runs, and Cashfree documents registering the
    //     checkout callback in onCreate so activity restarts are handled.
    try {
      CFPaymentGatewayService.initialize(getApplicationContext());
      CFPaymentGatewayService.getInstance().setCheckoutCallback(this);
      Log.i(TAG, "Cashfree native SDK initialized and checkout callback registered");
    } catch (Throwable t) {
      Log.e(TAG, "Cashfree SDK initialization failed: " + t.getMessage(), t);
    }

    // 3. Fail-safe WebViewClient interceptor for any embedded frame or redirect
    try {
      if (getBridge() != null && getBridge().getWebView() != null) {
        WebView webView = getBridge().getWebView();

        // Expose the UPI bridge Cashfree's checkout looks for. "Android" is free to use here:
        // Capacitor registers its own interfaces as androidBridge / CapacitorHttpAndroidInterface.
        webView.addJavascriptInterface(new CashfreeUpiBridge(this), "Android");
        Log.i(TAG, "Registered Cashfree UPI bridge as window.Android");

        webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
          private boolean handlePaymentScheme(WebView view, Uri uri, String urlStr) {
            if (!isUpiScheme(urlStr)) return false;
            String lower = urlStr.toLowerCase();
            try {
              Intent intent;
              if (lower.startsWith("intent://")) {
                intent = Intent.parseUri(urlStr, Intent.URI_INTENT_SCHEME);
              } else {
                intent = new Intent(Intent.ACTION_VIEW, uri != null ? uri : Uri.parse(urlStr));
              }
              intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
              view.getContext().startActivity(intent);
              Log.i(TAG, "Successfully launched native payment app for: " + lower.substring(0, Math.min(25, lower.length())));
              return true;
            } catch (Exception ex) {
              Log.w(TAG, "WebViewClient payment intercept error: " + ex.getMessage());
              try {
                if (lower.startsWith("intent://")) {
                  Intent parsed = Intent.parseUri(urlStr, Intent.URI_INTENT_SCHEME);
                  String fallbackUrl = parsed.getStringExtra("browser_fallback_url");
                  if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                    view.loadUrl(fallbackUrl);
                    return true;
                  }
                }
              } catch (Exception ignored) {}
              return true;
            }
          }

          @Override
          public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (request != null && request.getUrl() != null) {
              if (handlePaymentScheme(view, request.getUrl(), request.getUrl().toString())) {
                return true;
              }
            }
            return super.shouldOverrideUrlLoading(view, request);
          }

          @Override
          public boolean shouldOverrideUrlLoading(WebView view, String url) {
            if (url != null) {
              if (handlePaymentScheme(view, Uri.parse(url), url)) {
                return true;
              }
            }
            return super.shouldOverrideUrlLoading(view, url);
          }
        });
      }
    } catch (Throwable t) {
      Log.w(TAG, "Could not attach custom BridgeWebViewClient: " + t.getMessage());
    }

    // Brand-themed status and navigation bars with high-contrast, crystal-clear white icons.
    // Prevents white-on-white invisible battery percentage, charging amount, and clock.
    Window window = getWindow();
    if (window == null) return;

    int brandDark = getColor(R.color.colorPrimaryDark);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      window.setStatusBarColor(brandDark);
      window.setNavigationBarColor(brandDark);
    }

    View decor = window.getDecorView();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      WindowInsetsController c = window.getInsetsController();
      if (c != null) {
        // Dark background requires WHITE system icons (battery %, clock, wifi, notifications).
        // Passing 0 as appearance clears APPEARANCE_LIGHT_STATUS_BARS, rendering crisp white icons.
        c.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
        c.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
      }
    } else {
      int flags = decor.getSystemUiVisibility();
      flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
      flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
      decor.setSystemUiVisibility(flags);
    }
  }
}
