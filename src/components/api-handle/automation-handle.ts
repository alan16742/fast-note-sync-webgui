import type { AutomationTrigger, AutomationTriggerRequest } from "@/lib/types/automation";
import { addCacheBuster } from "@/lib/utils/cache-buster";
import { buildApiHeaders } from "@/lib/utils/api-headers";
import { useConfirmDialog } from "@/components/context/confirm-dialog-context";
import { toast } from "@/components/common/Toast";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";
import env from "@/env.ts";

export function useAutomationHandle() {
    const { t } = useTranslation();
    const { openConfirmDialog } = useConfirmDialog();
    const token = localStorage.getItem("token") || "";

    const request = useCallback(async (url: string, init: RequestInit, errorKey: string) => {
        try {
            const response = await fetch(addCacheBuster(`${env.API_URL}${url}`), {
                ...init,
                headers: buildApiHeaders({ token, ...(init.body ? {} : { includeContentType: false }) }),
            });
            const result = await response.json();
            if (!response.ok || typeof result.code !== "number" || result.code <= 0 || result.code >= 100) {
                throw new Error([result.message, result.details].filter(Boolean).join(": ") || t(errorKey));
            }
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            openConfirmDialog(`${t(errorKey)}: ${message}`, "error");
            return null;
        }
    }, [openConfirmDialog, t, token]);

    const handleAutomationList = useCallback(async (callback: (items: AutomationTrigger[]) => void) => {
        const result = await request("/api/automations", { method: "GET" }, "api.automation.list.error");
        if (result) callback(result.data || []);
    }, [request]);

    const handleAutomationSave = useCallback(async (value: AutomationTriggerRequest, callback: (item: AutomationTrigger) => void) => {
        const result = await request("/api/automations", {
            method: value.id ? "PUT" : "POST",
            body: JSON.stringify(value),
        }, "api.automation.save.error");
        if (result) {
            toast.success(result.message || t("api.automation.save.success"));
            if (result.data?.warnings?.length) {
                openConfirmDialog(result.data.warnings.join("\n"), "warning");
            }
            callback(result.data);
        }
    }, [request, t]);

    const handleAutomationDelete = useCallback(async (id: number, callback: () => void) => {
        openConfirmDialog(t("ui.automation.deleteConfirm"), "confirm", async () => {
            const result = await request(`/api/automations?id=${id}`, { method: "DELETE" }, "api.automation.delete.error");
            if (result) {
                toast.success(result.message || t("api.automation.delete.success"));
                callback();
            }
        });
    }, [openConfirmDialog, request, t]);

    const handleAutomationTrigger = useCallback(async (id: number) => {
        const result = await request("/api/automations/trigger", {
            method: "POST",
            body: JSON.stringify({ id }),
        }, "api.automation.trigger.error");
        if (result) toast.success(result.message || t("api.automation.trigger.success"));
    }, [request, t]);

    return useMemo(() => ({
        handleAutomationList,
        handleAutomationSave,
        handleAutomationDelete,
        handleAutomationTrigger,
    }), [handleAutomationDelete, handleAutomationList, handleAutomationSave, handleAutomationTrigger]);
}
