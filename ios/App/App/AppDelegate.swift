import UIKit
import Capacitor
import WebKit
import CapApp_SPM

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKScriptMessageHandler {

    var window: UIWindow?

    /// Set once the Cashfree bridge is attached to the live WKWebView.
    private var cashfreeBridgeAttached = false

    /// UPI apps we can offer, keyed by the URL scheme each one answers to.
    /// Also declared in Info.plist under LSApplicationQueriesSchemes.
    private let candidateUpiApps: [(id: String, name: String)] = [
        ("phonepe", "PhonePe"),
        ("tez", "Google Pay"),
        ("paytmmp", "Paytm"),
        ("bhim", "BHIM"),
        ("credpay", "CRED"),
        ("amazonpay", "Amazon Pay"),
        ("navipay", "Navi"),
        ("mobikwik", "MobiKwik"),
        ("myairtel", "Airtel Thanks"),
        ("whatsapp-consumer", "WhatsApp Pay")
    ]

    /// Schemes that can be launched from a checkout page deep link.
    static let upiSchemes: Set<String> = [
        "upi", "phonepe", "tez", "gpay", "paytmmp", "paytm", "bhim", "credpay",
        "amazonpay", "navipay", "mobikwik", "myairtel", "whatsapp-consumer", "tnupi", "postpe"
    ]

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Retain SPM plugin classes against dead-code stripping
        CapAppSPMInit.retainClasses()

        // 1. Intercept native UPI schemes from web checkout (Cashfree / direct UPI intent)
        NotificationCenter.default.addObserver(
            forName: .capacitorDecidePolicyForNavigationAction,
            object: nil,
            queue: .main
        ) { notification in
            if let navigationAction = notification.object as? WKNavigationAction,
               let url = navigationAction.request.url,
               let scheme = url.scheme?.lowercased() {
                if Self.upiSchemes.contains(scheme) {
                    if UIApplication.shared.canOpenURL(url) {
                        UIApplication.shared.open(url, options: [:], completionHandler: nil)
                    }
                }
            }
        }

        // 2. Attach Cashfree WKWebView script message handler
        attachCashfreeBridge()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.attachCashfreeBridge()
        }

        return true
    }

    /// Idempotently attaches the message handler to the Capacitor WebView.
    func attachCashfreeBridge(to bridgeViewController: CAPBridgeViewController? = nil) {
        guard !cashfreeBridgeAttached else { return }

        let bridgeVC: CAPBridgeViewController? = bridgeViewController ?? {
            if let root = window?.rootViewController as? CAPBridgeViewController {
                return root
            }
            if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController as? CAPBridgeViewController {
                return root
            }
            return nil
        }()

        guard let targetVC = bridgeVC else { return }
        targetVC.loadViewIfNeeded()
        guard let webView = targetVC.webView else { return }

        webView.configuration.userContentController.removeScriptMessageHandler(forName: "nativeProcess")
        webView.configuration.userContentController.add(self, name: "nativeProcess")
        cashfreeBridgeAttached = true
    }

    // MARK: - WKScriptMessageHandler (Cashfree iOS WebView Bridge)

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "nativeProcess" else { return }

        let webView = message.webView
        var action = ""
        var targetUrl = ""

        if let bodyStr = message.body as? String {
            if bodyStr == "getAppList" || bodyStr.contains("\"getAppList\"") {
                action = "getAppList"
            } else if bodyStr.contains("://") {
                targetUrl = bodyStr
            } else {
                action = bodyStr
            }
        } else if let bodyDict = message.body as? [String: Any] {
            action = (bodyDict["action"] as? String) ?? ""
            targetUrl = (bodyDict["url"] as? String) ?? (bodyDict["uri"] as? String) ?? ""
        }

        switch action {
        case "getAppList":
            let payload = installedUpiApps()
            if let data = try? JSONSerialization.data(withJSONObject: payload),
               let json = String(data: data, encoding: .utf8) {
                let jsCode = """
                if (typeof window.receiveAppList === 'function') {
                    try { window.receiveAppList(\(json)); } catch(e) { window.receiveAppList('\(json)'); }
                }
                """
                webView?.evaluateJavaScript(jsCode, completionHandler: nil)
            } else {
                webView?.evaluateJavaScript("if (typeof window.receiveAppList === 'function') { window.receiveAppList([]); }", completionHandler: nil)
            }

        case "", "dismissLoader", "dismissWeb", "enableCancelButton", "disableCancelButton":
            break

        default:
            break
        }

        if !targetUrl.isEmpty && targetUrl.contains("://") {
            let link = targetUrl.hasPrefix("paytm:") ? "paytmmp:" + targetUrl.dropFirst("paytm:".count) : targetUrl
            guard let url = URL(string: link) else { return }

            webView?.evaluateJavaScript("if (typeof window.verifyPaymentForiOS === 'function') { window.verifyPaymentForiOS(); }", completionHandler: nil)

            DispatchQueue.main.async {
                if UIApplication.shared.canOpenURL(url) {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
            }
        }
    }

    private func installedUpiApps() -> [[String: String]] {
        candidateUpiApps.compactMap { app in
            guard let probe = URL(string: "\(app.id)://"), UIApplication.shared.canOpenURL(probe) else {
                return nil
            }
            return [
                "id": app.id,
                "name": app.name,
                "displayName": app.name,
                "scheme": app.id
            ]
        }
    }

    // MARK: - Remote Push Notifications (APNs Delegate Forwarding to Capacitor)

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // MARK: - App Lifecycle

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {}

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        attachCashfreeBridge()
    }

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
