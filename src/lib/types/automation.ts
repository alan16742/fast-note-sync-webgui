export type AutomationEventType = "time" | "content" | "manual" | "file" | "todo";
export type AutomationTargetType = "git" | "backup" | "webhook";

export interface AutomationAction {
    type: AutomationTargetType;
    configId: number;
}

export interface AutomationTrigger {
    id: number;
    uid: number;
    name: string;
    enabled: boolean;
    eventType: AutomationEventType;
    vaultId: number;
    timezone: string;
    schedule: string;
    contentContains: string;
    pathPrefix: string;
    pathGlob: string;
    eventActions: string[];
    actions: AutomationAction[];
    lastRunAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AutomationTriggerRequest {
    id?: number;
    name: string;
    enabled: boolean;
    eventType: AutomationEventType;
    vaultId: number;
    timezone: string;
    schedule: string;
    contentContains: string;
    pathPrefix: string;
    pathGlob: string;
    eventActions: string[];
    actions: AutomationAction[];
}
