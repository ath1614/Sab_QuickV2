declare const PLUGIN_NAME = "CFPaymentGateway";
declare const version = "1.1.0";
declare let cordova: any;
declare function validateDropInput(cfDropPayment: any): "payment_session_id object is missing in session object" | "orderID object is missing in session object" | "environment object is missing in session object" | "session object is missing in cfDropPayment object" | "cfDropPayment object is missing";
declare function validateWebInput(cfWebPayment: any): "payment_session_id object is missing in session object" | "orderID object is missing in session object" | "environment object is missing in session object" | "session object is missing in cfWebPayment object" | "cfWebPayment object is missing";
declare function validateSubscriptionInput(cfSubscriptionPayment: any): "subscription_session_id is missing in session object" | "subscription_id is missing in session object" | "environment is missing in session object" | "session object is missing in cfSubscriptionPayment object" | "cfSubscriptionPayment object is missing";
declare function validateUPIInput(cfUPIPayment: any): "payment_session_id object is missing in session object" | "orderID object is missing in session object" | "environment object is missing in session object" | "session object is missing in cfUPIPayment object" | "cfUPIPayment object is missing";
declare function getError(message: string, orderId?: string): {
    status: string;
    message: string;
    code: string;
    type: string;
    orderID: string;
};
declare const CFPaymentGatewayService: {
    cfCallback: any;
    doUPIPayment(cfUPIPayment: any): void;
    /** @deprecated Use doWebCheckoutPayment instead. */
    doDropPayment(cfDropPayment: any): void;
    doWebCheckoutPayment(cfWebPayment: any): void;
    doSubscriptionPayment(cfSubscriptionPayment: any): void;
    setCallback(cfCallback: any): void;
};
