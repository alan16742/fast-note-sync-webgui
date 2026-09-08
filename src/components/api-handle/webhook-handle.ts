import type { WebhookSubscription, WebhookSubscriptionRequest } from "@/lib/types/webhook";
import { addCacheBuster } from "@/lib/utils/cache-buster";
import { buildApiHeaders } from "@/lib/utils/api-headers";
import { useConfirmDialog } from "@/components/context/confirm-dialog-context";
import { toast } from "@/components/common/Toast";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";
import env from "@/env.ts";

export function useWebhookHandle() {
    const { t } = useTranslation();
    const { openConfirmDialog } = useConfirmDialog();
    const token = localStorage.getItem("token") || "";

    const handleWebhookList = useCallback(async (callback: (items: WebhookSubscription[]) => void) => {
        try {
            const response = await fetch(addCacheBuster(`${env.API_URL}/api/webhooks`), { headers: buildApiHeaders({ token }) });
            const result = await response.json();
            if (!response.ok || (typeof result.code !== "number" || result.code <= 0 || result.code >= 100)) throw new Error(apiError(result) || t("api.webhook.list.error"));
            callback((result.data || []).map((item: WebhookSubscription) => ({
                ...item,
                provider: item.provider === "bark" ? "bark" : item.provider === "custom" ? "custom" : "serverchan",
                method: item.method || "POST",
                headers: item.headers || {},
                titleTemplate: item.titleTemplate || "",
                bodyTemplate: item.bodyTemplate || "",
            })));
        } catch (error) {
            openConfirmDialog(`${t("api.webhook.list.error")}: ${error}`, "error");
        }
    }, [openConfirmDialog, t, token]);

    const handleWebhookTest = useCallback(async (request: number | WebhookSubscriptionRequest) => {
        try {
            const response = await fetch(addCacheBuster(`${env.API_URL}/api/webhooks/test`), {
                method: "POST",
                headers: buildApiHeaders({ token }),
                body: JSON.stringify(typeof request === "number" ? { id: request } : request),
            });
            const result = await response.json();
            if (!response.ok || (typeof result.code !== "number" || result.code <= 0 || result.code >= 100)) throw new Error(apiError(result) || t("api.webhook.test.error"));
            toast.success(result.message || t("api.webhook.test.success"));
        } catch (error) {
            openConfirmDialog(`${t("api.webhook.test.error")}: ${error}`, "error");
        }
    }, [openConfirmDialog, t, token]);

    const handleWebhookSave = useCallback(async (request: WebhookSubscriptionRequest, callback: (item: WebhookSubscription) => void) => {
        try {
            const response = await fetch(addCacheBuster(`${env.API_URL}/api/webhooks`), {
                method: request.id ? "PUT" : "POST",
                headers: buildApiHeaders({ token }),
                body: JSON.stringify(request),
            });
            const result = await response.json();
            if (!response.ok || (typeof result.code !== "number" || result.code <= 0 || result.code >= 100)) throw new Error(apiError(result) || t("api.webhook.save.error"));
            toast.success(result.message || t("api.webhook.save.success"));
            callback(result.data);
        } catch (error) {
            openConfirmDialog(`${t("api.webhook.save.error")}: ${error}`, "error");
        }
    }, [openConfirmDialog, t, token]);

    const handleWebhookDelete = useCallback(async (id: number, callback: () => void) => {
        openConfirmDialog(t("ui.webhook.confirmDelete"), "confirm", async () => {
            try {
                const response = await fetch(addCacheBuster(`${env.API_URL}/api/webhooks?id=${id}`), {
                    method: "DELETE",
                    headers: buildApiHeaders({ token, includeContentType: false }),
                });
                const result = await response.json();
                if (!response.ok || (typeof result.code !== "number" || result.code <= 0 || result.code >= 100)) throw new Error(apiError(result) || t("api.webhook.delete.error"));
                toast.success(result.message || t("api.webhook.delete.success"));
                callback();
            } catch (error) {
                openConfirmDialog(`${t("api.webhook.delete.error")}: ${error}`, "error");
            }
        });
    }, [openConfirmDialog, t, token]);

    return useMemo(() => ({ handleWebhookList, handleWebhookSave, handleWebhookDelete, handleWebhookTest }), [handleWebhookDelete, handleWebhookList, handleWebhookSave, handleWebhookTest]);
}

function apiError(result: { message?: string; details?: string | string[] }): string {
    const details = Array.isArray(result.details) ? result.details.join("; ") : result.details;
    return [result.message, details].filter(Boolean).join(": ");
}
