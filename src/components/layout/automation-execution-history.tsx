import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, RotateCcw } from "lucide-react";
import { useAutomationHandle } from "@/components/api-handle/automation-handle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AutomationExecution, AutomationTrigger } from "@/lib/types/automation";

export function AutomationExecutionHistory({ trigger, onClose, onChanged }: {
    trigger: AutomationTrigger;
    onClose: () => void;
    onChanged: () => Promise<unknown>;
}) {
    const { t } = useTranslation();
    const { handleAutomationExecutionList, handleAutomationExecutionRetry } = useAutomationHandle();
    const [page, setPage] = useState(1);
    const [records, setRecords] = useState<AutomationExecution[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState<number | null>(null);
    const retryInFlight = useRef(false);
    const requestID = useRef(0);

    const reload = useCallback(async () => {
        const id = ++requestID.current;
        setLoading(true);
        try {
            const result = await handleAutomationExecutionList(trigger.id, page);
            if (result && id === requestID.current) {
                setRecords(result.list);
                setTotal(result.total);
            }
        } finally {
            if (id === requestID.current) setLoading(false);
        }
    }, [handleAutomationExecutionList, trigger.id, page]);

    useEffect(() => {
        const requests = requestID;
        setRecords([]);
        void reload();
        return () => { requests.current++; };
    }, [reload]);

    const retry = async (id: number) => {
        if (retryInFlight.current) return;
        retryInFlight.current = true;
        setRetrying(id);
        try {
            await handleAutomationExecutionRetry(id);
        } finally {
            // A failed retry still changes action states and timestamps.
            await Promise.all([reload(), onChanged()]);
            retryInFlight.current = false;
            setRetrying(null);
        }
    };

    return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{t("ui.automation.history")}</DialogTitle>
                <DialogDescription>{trigger.name}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
                <Button variant="ghost" size="icon" title={t("ui.common.refresh")} disabled={loading} onClick={() => void reload()}><RefreshCw className="h-4 w-4" /></Button>
            </div>
            <div className="min-h-0 overflow-y-auto space-y-3" aria-busy={loading}>
                {records.map(record => <div key={record.id} className="border rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                        <span>#{record.id} · {t(`ui.automation.executionStatus.${record.status}`)}</span>
                        {(record.status === "failed" || record.status === "cancelled") && <Button variant="outline" size="sm" disabled={!trigger.enabled || retrying !== null} onClick={() => void retry(record.id)}>
                            <RotateCcw className="h-3 w-3 mr-1" />{t("ui.automation.retry")}
                        </Button>}
                    </div>
                    <div className="text-xs text-muted-foreground">{(record.finishedAt || record.startedAt || record.createdAt) ? new Date((record.finishedAt || record.startedAt || record.createdAt)!).toLocaleString() : t("ui.common.never")}</div>
                    {record.error && <p className="text-destructive break-words">{record.error}</p>}
                    {record.actions.map((action, index) => <div key={index} className="border-t pt-2">
                        <span>{t(`ui.automation.target.${action.type}`)} #{action.configId} · {t(`ui.automation.executionStatus.${action.status}`)}</span>
                        {action.error && <p className="text-xs text-destructive break-words">{action.error}</p>}
                    </div>)}
                </div>)}
                {!loading && !records.length && <p className="text-sm text-muted-foreground">{t("ui.automation.historyEmpty")}</p>}
            </div>
            <div className="flex justify-between items-center gap-2">
                <Button variant="outline" disabled={loading || retrying !== null || page <= 1} onClick={() => setPage(value => value - 1)}>{t("ui.common.previous")}</Button>
                <span className="text-sm">{page} / {Math.max(1, Math.ceil(total / 20))}</span>
                <Button variant="outline" disabled={loading || retrying !== null || page * 20 >= total} onClick={() => setPage(value => value + 1)}>{t("ui.common.next")}</Button>
            </div>
        </DialogContent>
    </Dialog>;
}
