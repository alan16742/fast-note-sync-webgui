export type WebhookProvider = "serverchan" | "bark" | "custom";

export interface WebhookSubscription {
    id: number;
    uid: number;
    provider: WebhookProvider;
    url: string;
    method: string;
    headers: Record<string, string>;
    hasSecret: boolean;
    titleTemplate: string;
    bodyTemplate: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface WebhookSubscriptionRequest {
    id?: number;
    provider: WebhookProvider;
    url: string;
    method: string;
    headers: Record<string, string>;
    secret?: string;
    titleTemplate: string;
    bodyTemplate: string;
}
