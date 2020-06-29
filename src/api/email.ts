import { D2Api } from "./d2-api";
import { D2ApiResponse } from "./api-response";

/* https://docs.dhis2.org/master/en/developer/html/webapi_email.html */

export default class Email {
    constructor(public d2Api: D2Api) {}

    sendSystemNotification(message: NotificationMessage): D2ApiResponse<void> {
        return this.d2Api.post("/email/notification", {}, message);
    }

    sendMessage(message: OutboundMessage): D2ApiResponse<void> {
        const params = {
            recipients: message.recipients,
            subject: message.subject,
            message: message.text,
        };

        return this.d2Api.post("/email/notification", params);
    }

    sendTestMessage(): D2ApiResponse<void> {
        return this.d2Api.post("/email/test");
    }
}

export interface OutboundMessage {
    recipients: string[];
    subject?: string;
    text: string;
}
export interface NotificationMessage {
    subject: string;
    text: string;
}
