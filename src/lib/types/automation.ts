export type AutomationEventType = "cron" | "note_content" | "file_behavior" | "todo_reminder" | "manual";
export type AutomationTargetType = "git" | "backup" | "webhook";
export type AutomationMatchMode = "any" | "all";

export interface AutomationEventRule {
    type: AutomationEventType;
    schedule?: string;
    contentContains?: string;
    pathPrefix?: string;
    pathGlob?: string;
    eventActions?: string[];
}

export interface AutomationAction {
    type: AutomationTargetType;
    configId: number;
}

export interface AutomationTrigger {
    id: number;
    uid: number;
    name: string;
    enabled: boolean;
    vaultId: number;
    timezone: string;
    matchMode: AutomationMatchMode;
    events: AutomationEventRule[];
    actions: AutomationAction[];
    warnings?: string[];
    lastRunAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AutomationTriggerRequest {
    id?: number;
    name: string;
    enabled: boolean;
    vaultId: number;
    timezone: string;
    matchMode: AutomationMatchMode;
    events: AutomationEventRule[];
    actions: AutomationAction[];
}
