package com.sabquick.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
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

import java.util.List;

public class MainActivity extends BridgeActivity {
  private static final String TAG = "SabQuick";

  @CapacitorPlugin(name = "NativeUpi")
  public static class NativeUpiPlugin extends Plugin {

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

    @PluginMethod
    public void getAvailableUpiApps(PluginCall call) {
      try {
        Uri uri = Uri.parse("upi://pay");
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        PackageManager pm = getContext().getPackageManager();
        List<ResolveInfo> activities = pm.queryIntentActivities(intent, 0);

        JSArray apps = new JSArray();
        for (ResolveInfo info : activities) {
          JSObject app = new JSObject();
          app.put("packageName", info.activityInfo.packageName);
          app.put("name", info.loadLabel(pm).toString());
          apps.put(app);
        }

        JSObject ret = new JSObject();
        ret.put("apps", apps);
        ret.put("count", activities.size());
        call.resolve(ret);
      } catch (Exception e) {
        call.reject("Could not query installed UPI apps: " + e.getMessage());
      }
    }

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
      if (url == null) return null;
      String urlStr = url.toString();
      if (urlStr.startsWith("upi://") ||
          urlStr.startsWith("intent://") ||
          urlStr.startsWith("phonepe://") ||
          urlStr.startsWith("tez://") ||
          urlStr.startsWith("gpay://") ||
          urlStr.startsWith("paytmmp://") ||
          urlStr.startsWith("bhim://") ||
          urlStr.startsWith("credpay://") ||
          urlStr.startsWith("mobikwik://")) {
        Log.i(TAG, "Intercepted native UPI scheme via shouldOverrideLoad: " + urlStr);
        launchIntentInternal(urlStr, null);
        return Boolean.TRUE; // Consumes event to prevent WebView ERR_UNKNOWN_URL_SCHEME
      }
      return null;
    }
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

    // 3. Fail-safe WebViewClient interceptor for any embedded frame or redirect
    try {
      if (getBridge() != null && getBridge().getWebView() != null) {
        WebView webView = getBridge().getWebView();
        webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
          @Override
          public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (request != null && request.getUrl() != null) {
              String urlStr = request.getUrl().toString();
              if (urlStr.startsWith("upi://") ||
                  urlStr.startsWith("intent://") ||
                  urlStr.startsWith("phonepe://") ||
                  urlStr.startsWith("tez://") ||
                  urlStr.startsWith("gpay://") ||
                  urlStr.startsWith("paytmmp://") ||
                  urlStr.startsWith("bhim://") ||
                  urlStr.startsWith("credpay://") ||
                  urlStr.startsWith("mobikwik://")) {
                try {
                  Intent intent;
                  if (urlStr.startsWith("intent://")) {
                    intent = Intent.parseUri(urlStr, Intent.URI_INTENT_SCHEME);
                  } else {
                    intent = new Intent(Intent.ACTION_VIEW, request.getUrl());
                  }
                  intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                  view.getContext().startActivity(intent);
                  return true;
                } catch (Exception ex) {
                  Log.e(TAG, "WebViewClient UPI intercept failed: " + ex.getMessage());
                  return true;
                }
              }
            }
            return super.shouldOverrideUrlLoading(view, request);
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
