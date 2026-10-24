import UIKit
import Capacitor

/**
 * Capacitor builds this controller in code (the app has no Main.storyboard
 * bridge), so plugins compiled into the App target are NOT auto-registered:
 * the bridge only registers the classes listed in capacitor.config.json's
 * packageClassList.
 *
 * capacitorDidLoad() runs after the bridge exists but before the WebView is
 * loaded. That timing matters: plugin JS is injected as a document-start user
 * script, so registering in applicationDidFinishLaunching (no bridge yet) or
 * after the first page load is too late - calls then fail with
 * '"NativeUpi" plugin is not implemented on ios'.
 */
@objc(SabBridgeViewController)
class SabBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        if bridge?.plugin(withName: "NativeUpi") == nil {
            bridge?.registerPluginInstance(NativeUpiPlugin())
            #if DEBUG
            NSLog("[SabBridge] NativeUpi plugin registered before WebView load")
            #endif
        }
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let win = UIWindow(windowScene: windowScene)
        let bridgeVC = SabBridgeViewController()
        win.rootViewController = bridgeVC
        win.makeKeyAndVisible()
        self.window = win

        if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
            appDelegate.window = win
            appDelegate.attachCashfreeBridge(to: bridgeVC)
        }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
