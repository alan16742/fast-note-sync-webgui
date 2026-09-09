import * as z from "zod";


export const createBackupConfigSchema = (t: (key: string) => string) => z.object({
    storageIds: z.string().refine((val) => {
        try {
            const arr = JSON.parse(val);
            return Array.isArray(arr) && arr.length > 0;
        } catch {
            return false;
        }
    }, t("ui.backup.validation.storageRequired")),
    type: z.enum(["full", "incremental", "sync"]).default("full"),
    includeVaultName: z.boolean().optional(),
    passwordMode: z.number().int().min(0).max(2).optional(),
    passwordValue: z.string().optional(),
    retentionDays: z.number().int().min(-1, t("ui.backup.validation.retentionDaysMin")).optional(),
});

export type BackupFormData = z.infer<ReturnType<typeof createBackupConfigSchema>>;
