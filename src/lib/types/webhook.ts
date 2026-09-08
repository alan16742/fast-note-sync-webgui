export type WebhookAction = "create" | "modify" | "rename" | "delete" | "restore" | "permanent_delete";
export type WebhookProvider = "serverchan" | "bark" | "custom";

export type NotificationMode = "note_change" | "reminder";

export interface WebhookSubscription {
    id: number;
    uid: number;
    enabled: boolean;
    provider: WebhookProvider;
    mode: NotificationMode;
    timezone: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    hasSecret: boolean;
    vaultId: number;
    actions: WebhookAction[];
    pathPrefix: string;
    pathGlob: string;
    bodySubstring: string;
    bodyRegex: string;
    bodyMaxBytes: number;
    titleTemplate: string;
    bodyTemplate: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface WebhookSubscriptionRequest {
    id?: number;
    enabled: boolean;
    provider: WebhookProvider;
    mode: NotificationMode;
    timezone: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    secret?: string;
    vaultId: number;
    actions: WebhookAction[];
    pathPrefix: string;
    pathGlob: string;
    bodySubstring: string;
    bodyRegex: string;
    bodyMaxBytes: number;
    titleTemplate: string;
    bodyTemplate: string;
}
