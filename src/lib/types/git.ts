/**
 * Git 同步配置信息 (DTO)
 */
export interface GitSyncConfigDTO {
    id: number
    vault: string
    repoUrl: string
    branch: string
    username: string
    password?: string
    retentionDays: number
    isEnabled: boolean
    lastSyncTime: string
    lastStatus: number // 0: Idle, 1: Running, 2: Success, 3: Failed, 4: Shutdown
    lastMessage: string
    includeConfig: boolean
    configSyncRules: string[]
    updatedAt: string
}

/**
 * Git 同步配置请求 (Request)
 */
export interface GitSyncConfigRequest {
    id?: number
    vault: string
    repoUrl: string
    branch: string
    username: string
    password?: string
    retentionDays: number
    isEnabled: boolean
    includeConfig: boolean
    configSyncRules: string[]
}

/**
 * Git 同步验证请求 (Request)
 */
export interface GitSyncValidateRequest {
    repoUrl: string
    branch?: string
    username?: string
    password?: string
}

/**
 * Git 同步历史记录 (DTO)
 */
export interface GitSyncHistoryDTO {
    id: number
    configId: number
    startTime: string
    endTime: string
    status: number // 0: Idle, 1: Running, 2: Success, 3: Failed, 4: Shutdown
    message: string
    createdAt: string
}
