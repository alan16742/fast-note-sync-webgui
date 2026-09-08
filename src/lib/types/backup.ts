 export type BackupType = "full" | "incremental" | "sync";
export interface BackupConfig {
    id?: number;
    uid?: number;
    vault: string;
    type: BackupType;
    storageIds: string; // JSON array string, e.g., "[1, 2]"
    isEnabled: boolean;
    includeVaultName?: boolean;
    passwordMode: number;
    passwordValue?: string;
    retentionDays?: number;
    lastRunTime?: string;
    lastStatus?: number;
    lastMessage?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface BackupHistory {
    id: number;
    configId: number;
    uid: number;
    storageId: number;
    type: BackupType;
    status: number;
    message?: string;
    filePath?: string;
    password?: string;
    fileSize?: number;
    fileCount?: number;
    startTime: string;
    endTime?: string;
    createdAt: string;
    updatedAt: string;
}

export interface BackupConfigRequest {
    id?: number;
    vault: string;
    type: BackupType;
    storageIds: string;
    isEnabled: boolean;
    includeVaultName?: boolean;
    passwordMode: number;
    passwordValue?: string;
    retentionDays?: number;
}

export interface BackupExecuteRequest {
    id: number;
}
