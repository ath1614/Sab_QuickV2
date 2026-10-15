import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKScriptMessageHandler {

    var window: UIWindow?

    /// Set once the Cashfree bridge is attached to the live WKWebView.
    private var cashfreeBridgeAttached = false

    /// UPI apps we can offer, keyed by the URL scheme each one answers to.
    /// Also declare every scheme in Info.plist under LSApplicationQueriesSchemes, otherwise
    /// canOpenURL() silently returns false and the app never shows up.
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

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Intercept native UPI schemes from web checkout (Cashfree / direct UPI intent)
        NotificationCenter.default.addObserver(
            forName: Notification.Name("capacitorDecidePolicyForNavigationAction"),
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

        // Cashfree's checkout page looks for a script message handler named "nativeProcess".
        // It asks us for the installed UPI apps and hands us the one the customer tapped, which
        // is the only way a WebView can launch a UPI app on iOS (it cannot enumerate apps itself).
        attachCashfreeBridge()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.attachCashfreeBridge()
        }

        return true
    }

    /// Schemes that can be launched from a checkout page deep link.
    static let upiSchemes: Set<String> = [
        "upi", "phonepe", "tez", "gpay", "paytmmp", "paytm", "bhim", "credpay",
        "amazonpay", "navipay", "mobikwik", "myairtel", "whatsapp-consumer", "tnupi", "postpe"
    ]

    /// Idempotently attaches the message handler to the Capacitor WebView.
    private func attachCashfreeBridge() {
        guard !cashfreeBridgeAttached else { return }
        guard let bridgeViewController = window?.rootViewController as? CAPBridgeViewController,
              let webView = bridgeViewController.webView else { return }

        webView.configuration.userContentController.add(self, name: "nativeProcess")
        cashfreeBridgeAttached = true
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "nativeProcess" else { return }

        let body = (message.body as? String) ?? ""
        let webView = message.webView

        switch body {
        case "getAppList":
            let payload = installedUpiApps()
            if let data = try? JSONSerialization.data(withJSONObject: payload),
               let json = String(data: data, encoding: .utf8) {
                webView?.evaluateJavaScript("window.receiveAppList && window.receiveAppList(\(json));")
            } else {
                webView?.evaluateJavaScript("window.receiveAppList && window.receiveAppList([]);")
            }

        case "", "dismissLoader", "dismissWeb", "enableCancelButton", "disableCancelButton":
            // Nothing to do: there is no native loader chrome to update.
            break

        default:
            // Anything else is a UPI deep link for the app the customer chose.
            guard body.contains("://") else { return }

            let link = body.hasPrefix("paytm:") ? "paytmmp:" + body.dropFirst("paytm:".count) : body
            guard let url = URL(string: link) else { return }

            // Cashfree defines this hook: calling it makes the checkout verify the payment.
            webView?.evaluateJavaScript("window.verifyPaymentForiOS && window.verifyPaymentForiOS();")

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
            return ["id": app.id, "displayName": app.name]
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        attachCashfreeBridge()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
