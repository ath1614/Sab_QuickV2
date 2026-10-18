import Foundation
import UIKit
import Capacitor
import CashfreePG
import CashfreePGCoreSDK
import CashfreePGUISDK
import CashfreeAnalyticsSDK

@objc(NativeUpiPlugin)
public class NativeUpiPlugin: CAPPlugin, CAPBridgedPlugin, CFResponseDelegate {
    public let identifier = "NativeUpiPlugin"
    public let jsName = "NativeUpi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "launchCashfreeNativeUpi", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "launchCashfreeUpiIntent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "launchCashfreeNativeDrop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "launchCashfreeWebCheckout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "launchUpi", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAvailableUpiApps", returnType: CAPPluginReturnPromise)
    ]

    private var activeCall: CAPPluginCall?
    private var activeOrderId: String?

    private struct UpiAppProbe {
        let id: String
        let name: String
        let scheme: String
    }

    private let candidateUpiApps: [UpiAppProbe] = [
        UpiAppProbe(id: "phonepe", name: "PhonePe", scheme: "phonepe"),
        UpiAppProbe(id: "tez", name: "Google Pay", scheme: "tez"),
        UpiAppProbe(id: "paytmmp", name: "Paytm", scheme: "paytmmp"),
        UpiAppProbe(id: "bhim", name: "BHIM", scheme: "bhim"),
        UpiAppProbe(id: "credpay", name: "CRED", scheme: "credpay"),
        UpiAppProbe(id: "amazonpay", name: "Amazon Pay", scheme: "amazonpay"),
        UpiAppProbe(id: "navipay", name: "Navi", scheme: "navipay"),
        UpiAppProbe(id: "mobikwik", name: "MobiKwik", scheme: "mobikwik"),
        UpiAppProbe(id: "myairtel", name: "Airtel Thanks", scheme: "myairtel"),
        UpiAppProbe(id: "whatsapp", name: "WhatsApp Pay", scheme: "whatsapp")
    ]

    @objc public func getAvailableUpiApps(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // First check Cashfree SDK's CFUPIUtils
            let sdkApps = CFUPIUtils().getInstalledUPIApplications()
            var apps: [[String: String]] = []

            if !sdkApps.isEmpty {
                for item in sdkApps {
                    let id = item["id"] ?? ""
                    let name = item["displayName"] ?? item["name"] ?? id
                    let icon = item["icon"] ?? ""
                    let cleanId = id.replacingOccurrences(of: "://", with: "")
                    apps.append([
                        "id": id,
                        "packageName": cleanId,
                        "name": name,
                        "icon": icon,
                        "scheme": cleanId
                    ])
                }
            } else {
                // Fallback manual probe using canOpenURL
                for app in self.candidateUpiApps {
                    if let url = URL(string: "\(app.scheme)://"), UIApplication.shared.canOpenURL(url) {
                        apps.append([
                            "id": "\(app.scheme)://",
                            "packageName": app.id,
                            "name": app.name,
                            "icon": "",
                            "scheme": app.scheme
                        ])
                    }
                }
            }

            call.resolve([
                "apps": apps,
                "count": apps.count
            ])
        }
    }

    @objc public func launchCashfreeNativeUpi(_ call: CAPPluginCall) {
        launchPayment(call: call, flow: .drop)
    }

    @objc public func launchCashfreeUpiIntent(_ call: CAPPluginCall) {
        launchPayment(call: call, flow: .upiIntent)
    }

    @objc public func launchCashfreeNativeDrop(_ call: CAPPluginCall) {
        launchPayment(call: call, flow: .drop)
    }

    @objc public func launchCashfreeWebCheckout(_ call: CAPPluginCall) {
        launchPayment(call: call, flow: .web)
    }

    @objc public func launchUpi(_ call: CAPPluginCall) {
        guard let uriString = call.getString("uri"), let url = URL(string: uriString) else {
            call.reject("Invalid UPI URI")
            return
        }
        DispatchQueue.main.async {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:]) { success in
                    if success {
                        call.resolve()
                    } else {
                        call.reject("Failed to open UPI app")
                    }
                }
            } else {
                call.reject("UPI app is not installed or scheme is not queried in Info.plist")
            }
        }
    }

    private enum PaymentFlow {
        case upiIntent
        case drop
        case web
    }

    private func normalizeUpiScheme(_ raw: String?) -> String {
        guard let raw = raw?.lowercased().trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
            return ""
        }
        if raw.contains("phonepe") {
            return "phonepe://"
        }
        if raw.contains("paisa") || raw.contains("tez") || raw.contains("gpay") || raw.contains("google") {
            return "tez://"
        }
        if raw.contains("paytm") {
            return "paytmmp://"
        }
        if raw.contains("bhim") {
            return "bhim://"
        }
        if raw.contains("cred") {
            return "credpay://"
        }
        if raw.contains("amazon") {
            return "amazonpay://"
        }
        if raw.contains("navi") {
            return "navipay://"
        }
        if raw.contains("airtel") {
            return "myairtel://"
        }
        if raw.contains("whatsapp") {
            return "whatsapp://"
        }
        if raw.contains("://") {
            return raw
        }
        return "\(raw)://"
    }

    private func launchPayment(call: CAPPluginCall, flow: PaymentFlow) {
        guard let paymentSessionId = call.getString("paymentSessionId"), !paymentSessionId.isEmpty else {
            call.reject("paymentSessionId is required")
            return
        }
        let orderId = call.getString("orderId") ?? ""
        let envStr = call.getString("environment")?.uppercased() ?? "PRODUCTION"
        let env: CFENVIRONMENT = (envStr == "SANDBOX") ? .SANDBOX : .PRODUCTION

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            guard let presentingVC = self.bridge?.viewController ?? UIApplication.shared.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
                call.reject("Unable to find view controller to present payment")
                return
            }

            self.activeCall = call
            self.activeOrderId = orderId

            do {
                let session = try CFSession.CFSessionBuilder()
                    .setOrderID(orderId)
                    .setPaymentSessionId(paymentSessionId)
                    .setEnvironment(env)
                    .build()

                let pgService = CFPaymentGatewayService.getInstance()
                pgService.setCallback(self)

                if flow == .upiIntent {
                    let rawApp = call.getString("packageName") ?? call.getString("upiId") ?? call.getString("appId")
                    let targetScheme = self.normalizeUpiScheme(rawApp)

                    if !targetScheme.isEmpty {
                        do {
                            let cfUpi = try CFUPI.CFUPIBuilder()
                                .setChannel(.INTENT)
                                .setUPIID(targetScheme)
                                .build()

                            let upiPayment = try CFUPIPayment.CFUPIPaymentBuilder()
                                .setSession(session)
                                .setUPI(cfUpi)
                                .build()

                            try pgService.doPayment(upiPayment, viewController: presentingVC)
                            return
                        } catch {
                            // If direct UPI intent fails, fall back to native drop checkout
                            NSLog("[NativeUpiPlugin] Direct UPI Intent error: \(error), falling back to Drop Checkout")
                        }
                    }
                }

                if flow == .web {
                    let webPayment = try CFWebCheckoutPayment.CFWebCheckoutPaymentBuilder()
                        .setSession(session)
                        .build()
                    try pgService.doPayment(webPayment, viewController: presentingVC)
                } else {
                    // Default to Drop checkout (native sheet with UPI, cards, netbanking, wallets)
                    let dropPayment = try CFDropCheckoutPayment.CFDropCheckoutPaymentBuilder()
                        .setSession(session)
                        .build()
                    try pgService.doPayment(dropPayment, viewController: presentingVC)
                }
            } catch let cfError as CashfreeError {
                self.activeCall = nil
                call.resolve([
                    "status": "FAILED",
                    "orderId": orderId,
                    "error": cfError.localizedDescription,
                    "code": "CASHFREE_ERROR"
                ])
            } catch {
                self.activeCall = nil
                call.resolve([
                    "status": "FAILED",
                    "orderId": orderId,
                    "error": error.localizedDescription,
                    "code": "LAUNCH_FAILED"
                ])
            }
        }
    }

    // MARK: - CFResponseDelegate

    public func verifyPayment(order_id: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let ret: [String: Any] = [
                "status": "SUCCESS",
                "orderId": order_id
            ]
            self.notifyListeners("cashfreeUpiResult", data: ret)
            if let call = self.activeCall {
                call.resolve(ret)
                self.activeCall = nil
            }
        }
    }

    public func onError(_ error: CFErrorResponse, order_id: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let ret: [String: Any] = [
                "status": "FAILED",
                "orderId": order_id,
                "error": error.message ?? "Payment failed or cancelled",
                "code": error.code ?? error.status ?? "PAYMENT_FAILED"
            ]
            self.notifyListeners("cashfreeUpiResult", data: ret)
            if let call = self.activeCall {
                call.resolve(ret)
                self.activeCall = nil
            }
        }
    }
}
