import { z } from "zod";


/**
 * Git 同步配置校验 Schema（工厂函数，支持 i18n）
 */
export const createGitSyncSchema = (t: (key: string) => string) => z.object({
    id: z.number().optional(),
    vault: z.string().min(1, t("ui.validation.git.vaultRequired")),
    repoUrl: z.string().min(1, t("ui.validation.git.repoUrlRequired")).url(t("ui.validation.git.repoUrlInvalid")),
    branch: z.string().min(1, t("ui.validation.git.branchRequired")),
    username: z.string().optional(),
    password: z.string().optional(),
    retentionDays: z.number().min(-1, t("ui.validation.git.retentionDaysMin")).default(0),
    isEnabled: z.boolean().default(true),
    includeConfig: z.boolean().default(false),
    configSyncRules: z.array(z.string()).default([]),
}).superRefine((data, ctx) => {
    if (data.includeConfig && data.configSyncRules.filter(r => r.trim() !== "").length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("ui.validation.git.configSyncRulesRequired"),
            path: ["configSyncRules"],
        });
    }
});

export type GitSyncFormData = z.infer<ReturnType<typeof createGitSyncSchema>>;
