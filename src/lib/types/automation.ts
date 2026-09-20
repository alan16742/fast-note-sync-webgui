export type AutomationEventType = "cron" | "note_content" | "file_behavior" | "todo_reminder" | "manual";
export type AutomationTargetType = "git" | "backup" | "webhook";
export type AutomationMatchMode = "any" | "all";
export type AutomationExecutionStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";

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
    latestExecution?: AutomationExecution;
    lastRunAt?: string;
    lastAttemptAt?: string;
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

export interface AutomationActionExecution {
    type: AutomationTargetType;
    configId: number;
    status: AutomationExecutionStatus;
    error?: string;
    startedAt?: string | null;
    finishedAt?: string | null;
}

export interface AutomationExecution {
    id: number;
    uid: number;
    triggerId: number;
    vaultId: number;
    eventId: string;
    eventType: AutomationEventType;
    status: AutomationExecutionStatus;
    error?: string;
    actions: AutomationActionExecution[];
    startedAt?: string | null;
    finishedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
}
