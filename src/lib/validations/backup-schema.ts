import * as z from "zod";


export const createBackupConfigSchema = (t: (key: string) => string) => z.object({
    vault: z.string().min(1, t("ui.backup.validation.vaultRequired")),
    type: z.enum(["full", "incremental", "sync"], {
        required_error: t("ui.backup.validation.typeRequired"),
    }),
    storageIds: z.string().refine((val) => {
        try {
            const arr = JSON.parse(val);
            return Array.isArray(arr) && arr.length > 0;
        } catch {
            return false;
        }
    }, t("ui.backup.validation.storageRequired")),
    isEnabled: z.boolean().default(true),
    includeVaultName: z.boolean().default(false),
    passwordMode: z.number().int().min(0).max(2).default(0),
    passwordValue: z.string().optional(),
    retentionDays: z.number().int().min(-1, t("ui.backup.validation.retentionDaysMin")).optional(),
});

export type BackupFormData = z.infer<ReturnType<typeof createBackupConfigSchema>>;
