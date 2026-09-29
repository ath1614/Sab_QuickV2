package com.sabquick.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {

  @CapacitorPlugin(name = "NativeUpi")
  public static class NativeUpiPlugin extends Plugin {
    @PluginMethod
    public void launchUpi(PluginCall call) {
      String uriString = call.getString("uri");
      String packageName = call.getString("packageName");

      if (uriString == null || uriString.isEmpty()) {
        call.reject("URI cannot be empty");
        return;
      }

      try {
        Uri uri = Uri.parse(uriString);
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);

        if (packageName != null && !packageName.isEmpty()) {
          intent.setPackage(packageName);
        }

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);
        call.resolve();
      } catch (Exception e) {
        // Fallback: If targeted package (e.g. PhonePe or GPay) fails or isn't installed, open system chooser
        try {
          Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(uriString));
          Intent chooser = Intent.createChooser(fallback, "Pay with UPI");
          chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
          getActivity().startActivity(chooser);
          call.resolve();
        } catch (Exception ex) {
          call.reject("Could not launch UPI app: " + ex.getMessage());
        }
      }
    }
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(NativeUpiPlugin.class);
    super.onCreate(savedInstanceState);

    // The site draws its own edge-to-edge canvas (viewport-fit=cover +
    // env(safe-area-inset-*) padding), so the system bars must be
    // transparent with legible icons — never the dead black band from the
    // default dark statusBarColor.
    Window window = getWindow();
    if (window == null) return;

    int fog = getColor(R.color.sqFog);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      window.setStatusBarColor(fog);
      window.setNavigationBarColor(fog);
    }

    View decor = window.getDecorView();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      WindowInsetsController c = window.getInsetsController();
      if (c != null) {
        // Light bars (dark icons) on the light fog background.
        c.setSystemBarsAppearance(WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
        c.setSystemBarsAppearance(WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
            WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
      }
    } else {
      int flags = decor.getSystemUiVisibility()
          | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
          | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
      decor.setSystemUiVisibility(flags);
    }
  }
}
