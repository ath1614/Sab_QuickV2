package com.sabquick.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
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
