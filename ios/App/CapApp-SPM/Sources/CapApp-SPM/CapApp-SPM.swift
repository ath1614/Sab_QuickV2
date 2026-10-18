import Foundation
import Capacitor
import PushNotificationsPlugin
import GeolocationPlugin
import AppPlugin

public let isCapacitorApp = true

@objc public class CapAppSPMInit: NSObject {
    @objc public static func retainClasses() {
        _ = PushNotificationsPlugin.self
        _ = GeolocationPlugin.self
        _ = AppPlugin.self
    }
}
