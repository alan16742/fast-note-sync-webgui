import { useAutomationHandle } from "@/components/api-handle/automation-handle";
import { useBackupHandle } from "@/components/api-handle/backup-handle";
import { useGitHandle } from "@/components/api-handle/git-handle";
import { useVaultHandle } from "@/components/api-handle/vault-handle";
import { useWebhookHandle } from "@/components/api-handle/webhook-handle";
import type { AutomationAction, AutomationEventRule, AutomationEventType, AutomationExecution, AutomationMatchMode, AutomationTargetType, AutomationTrigger, AutomationTriggerRequest } from "@/lib/types/automation";
import type { BackupConfig } from "@/lib/types/backup";
import type { GitSyncConfigDTO } from "@/lib/types/git";
import type { VaultType } from "@/lib/types/vault";
import type { WebhookSubscription } from "@/lib/types/webhook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Play, Plus, RefreshCw, RotateCcw, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_ACTIONS = ["create", "modify", "delete", "rename", "restore", "permanent_delete"];
const EVENT_TYPES: AutomationEventType[] = ["cron", "note_content", "file_behavior", "todo_reminder", "manual"];

const emptyRule = (type: AutomationEventType = "note_content"): AutomationEventRule => ({
    type,
    ...(type === "cron" ? { schedule: "*/5 * * * *" } : {}),
    ...(type === "note_content" ? { contentContains: "" } : {}),
    ...(type === "file_behavior" ? { pathPrefix: "", pathGlob: "", eventActions: [] } : {}),
});

const emptyTrigger = (): AutomationTriggerRequest => ({
    name: "", enabled: true, vaultId: 0, timezone: "Asia/Shanghai", matchMode: "any",
    events: [emptyRule()], actions: [],
});

function hasCommonFileAction(events: AutomationEventRule[]): boolean {
    if (!events.length || events.some(event => event.type !== "file_behavior")) return true;
    return events.slice(1).reduce((common, event) => common.filter(action => (event.eventActions || []).includes(action)), events[0].eventActions || []).length > 0;
}

/** 匹配行为下拉多选（保持菜单打开以便连续勾选） */
function EventActionsSelect({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
    const { t } = useTranslation();
    const actionLabel = (action: string) => t(`ui.automation.action.${action}`);
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between font-normal">
                    <span className="truncate">{value.length ? value.map(actionLabel).join(", ") : t("ui.automation.eventActionsPlaceholder")}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
                {EVENT_ACTIONS.map(action => (
                    <DropdownMenuCheckboxItem
                        key={action}
                        checked={value.includes(action)}
                        onCheckedChange={checked => onChange(checked ? [...value, action] : value.filter(item => item !== action))}
                        onSelect={event => event.preventDefault()}
                    >
                        {actionLabel(action)}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function AutomationSettings() {
    const { t } = useTranslation();
    const { handleAutomationList, handleAutomationSave, handleAutomationDelete, handleAutomationTrigger, handleAutomationExecutionList, handleAutomationExecutionRetry } = useAutomationHandle();
    const { handleBackupConfigList } = useBackupHandle();
    const { handleGitSyncList } = useGitHandle();
    const { handleVaultList } = useVaultHandle();
    const { handleWebhookList } = useWebhookHandle();
    const [items, setItems] = useState<AutomationTrigger[]>([]);
    const [editing, setEditing] = useState<AutomationTriggerRequest | null>(null);
    const [backups, setBackups] = useState<BackupConfig[]>([]);
    const [gitConfigs, setGitConfigs] = useState<GitSyncConfigDTO[]>([]);
    const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
    const [vaults, setVaults] = useState<VaultType[]>([]);
    const [executions, setExecutions] = useState<AutomationExecution[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const reload = useCallback(() => {
        setLoading(true);
        void Promise.all([
            handleAutomationList(setItems), handleAutomationExecutionList(setExecutions), handleBackupConfigList(setBackups),
            handleGitSyncList(setGitConfigs), handleWebhookList(setWebhooks), handleVaultList(setVaults),
        ]).finally(() => setLoading(false));
    }, [handleAutomationExecutionList, handleAutomationList, handleBackupConfigList, handleGitSyncList, handleWebhookList, handleVaultList]);

    useEffect(() => { reload(); }, [reload]);

    const editItem = (item: AutomationTrigger) => setEditing({
        id: item.id, name: item.name, enabled: item.enabled, vaultId: item.vaultId,
        timezone: item.timezone || "Asia/Shanghai", matchMode: item.matchMode || "any",
        events: item.events || [emptyRule()],
        actions: item.actions || [],
    });

    const availableTargets = useMemo(() => ({
        git: gitConfigs.map(item => ({ id: item.id, label: `${item.repoUrl} · ${item.branch}` })),
        backup: backups.filter(item => item.id).map(item => ({ id: item.id as number, label: `#${item.id}` })),
        webhook: webhooks.map(item => ({ id: item.id, label: `${item.provider} · ${item.url || t("ui.automation.defaultEndpoint")}` })),
    }), [backups, gitConfigs, t, webhooks]);

    const hasTodo = Boolean(editing?.events.some(event => event.type === "todo_reminder"));
    const updateEditing = (patch: Partial<AutomationTriggerRequest>) => setEditing(value => value ? { ...value, ...patch } : value);
    const addEvent = () => {
        const eventType = editing?.matchMode === "all" ? (editing.events[0]?.type || "note_content") : "note_content";
        updateEditing({ events: [...(editing?.events || []), emptyRule(eventType)] });
    };
    const removeEvent = (index: number) => updateEditing({ events: editing!.events.filter((_, itemIndex) => itemIndex !== index) });
    const updateEvent = (index: number, patch: Partial<AutomationEventRule>) => updateEditing({ events: editing!.events.map((event, itemIndex) => itemIndex === index ? { ...event, ...patch } : event) });
    const changeEventType = (index: number, type: AutomationEventType) => updateEvent(index, { ...emptyRule(type) });
    const addTarget = () => updateEditing({ actions: [...(editing?.actions || []), { type: hasTodo ? "webhook" : "backup", configId: 0 }] });
    const removeTarget = (index: number) => updateEditing({ actions: editing!.actions.filter((_, itemIndex) => itemIndex !== index) });
    const updateTarget = (index: number, patch: Partial<AutomationAction>) => updateEditing({ actions: editing!.actions.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
    const toggleEnabled = (item: AutomationTrigger) => {
        const request: AutomationTriggerRequest = {
            id: item.id, name: item.name, enabled: !item.enabled, vaultId: item.vaultId,
            timezone: item.timezone || "Asia/Shanghai", matchMode: item.matchMode || "any",
            events: item.events || [], actions: item.actions || [],
        };
        void handleAutomationSave(request, reload);
    };

    const save = (event: React.FormEvent) => {
        event.preventDefault();
        if (!editing || saving) return;
        setSaving(true);
        handleAutomationSave(editing, () => { setEditing(null); reload(); }).finally(() => setSaving(false));
    };

    const eventLabel = (type: AutomationEventType) => t(`ui.automation.event.${type}`);
    const targetLabel = (type: AutomationTargetType) => t(`ui.automation.target.${type}`);
    const hasMixedEventTypes = new Set((editing?.events || []).map(event => event.type)).size > 1;
    const invalidAllCombination = editing?.matchMode === "all" && hasMixedEventTypes;
    const invalidAllFileActions = Boolean(editing?.matchMode === "all" && !hasMixedEventTypes && editing.events[0]?.type === "file_behavior" && !hasCommonFileAction(editing.events));
    const eventTypeAllowed = (index: number, type: AutomationEventType) => {
        if (!editing || editing.matchMode !== "all" || type === editing.events[index]?.type) return true;
        return editing.events.every((event, itemIndex) => itemIndex === index || event.type === type);
    };
    const hasUnselectedActions = Boolean(editing?.events.some(event =>
        event.type === "file_behavior" && !(event.eventActions || []).length,
    ));
    const reuseWarnings = editing ? editing.actions.flatMap(action => items.filter(item => item.id !== editing.id && item.vaultId !== editing.vaultId && item.actions.some(existing => existing.type === action.type && existing.configId === action.configId)).map(item => `${targetLabel(action.type)} #${action.configId} 已被笔记库 #${item.vaultId} 的规则使用，可能产生存储/Git 冲突。`)) : [];
    const latestExecutionByTrigger = useMemo(() => {
        const result = new Map<number, AutomationExecution>();
        for (const execution of executions) {
            const current = result.get(execution.triggerId);
            if (!current || execution.id > current.id) result.set(execution.triggerId, execution);
        }
        return result;
    }, [executions]);
    const executionStatusLabel = (status: AutomationExecution["status"]) => t(`ui.automation.executionStatus.${status}`);
    const executionTime = (value?: string) => value ? new Date(value.replace(" ", "T")).toLocaleString() : t("ui.common.never");

    return <div className="max-w-5xl mx-auto pb-24 space-y-4">
        <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />{t("ui.automation.title")}</h2><p className="text-sm text-muted-foreground mt-1">{t("ui.automation.description")}</p></div>
            <div className="flex gap-2"><Button variant="ghost" size="icon" onClick={reload} disabled={loading}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></Button><Button onClick={() => setEditing(emptyTrigger())}><Plus className="h-4 w-4 mr-2" />{t("ui.automation.add")}</Button></div>
        </div>

        {editing && <form onSubmit={save} className="border rounded-xl p-5 bg-card space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5"><Label htmlFor="automation-name">{t("ui.automation.name")}</Label><Input id="automation-name" required value={editing.name} onChange={event => updateEditing({ name: event.target.value })} placeholder={t("ui.automation.namePlaceholder")} /></div>
                <div className="space-y-1.5"><Label htmlFor="automation-vault">{t("ui.automation.vault")}</Label><Select value={String(editing.vaultId || "")} onValueChange={value => updateEditing({ vaultId: Number(value) })}><SelectTrigger id="automation-vault"><SelectValue placeholder={t("ui.automation.vaultRequired")} /></SelectTrigger><SelectContent>{vaults.map(vault => <SelectItem key={vault.id} value={String(vault.id)}>{vault.vault}</SelectItem>)}</SelectContent></Select></div>
                {editing.events.some(event => event.type === "cron" || event.type === "todo_reminder") && <div className="space-y-1.5"><Label htmlFor="automation-timezone">{t("ui.automation.timezone")}</Label><Input id="automation-timezone" value={editing.timezone} onChange={event => updateEditing({ timezone: event.target.value })} placeholder="Asia/Shanghai" /></div>}
                <div className="space-y-1.5"><Label htmlFor="automation-match-mode">{t("ui.automation.matchMode")}</Label><Select value={editing.matchMode || "any"} onValueChange={value => updateEditing({ matchMode: value as AutomationMatchMode })}><SelectTrigger id="automation-match-mode"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">{t("ui.automation.matchMode.any")}</SelectItem><SelectItem value="all" disabled={hasMixedEventTypes}>{t("ui.automation.matchMode.all")}</SelectItem></SelectContent></Select><p className={cn("text-xs", invalidAllCombination ? "text-destructive" : "text-muted-foreground")}>{invalidAllCombination ? t("ui.automation.matchModeMixedError") : t("ui.automation.matchModeHelp")}</p></div>
                <div className="md:col-span-2 border rounded-lg p-3 space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-semibold">{t("ui.automation.events")}</h3><p className="text-xs text-muted-foreground">{t("ui.automation.eventsHelp")}</p></div><Button type="button" variant="outline" size="sm" onClick={addEvent}><Plus className="h-4 w-4 mr-1" />{t("ui.automation.addEvent")}</Button></div>
                    {editing.events.map((eventRule, index) => <div key={`${index}-${eventRule.type}`} className="border rounded-md p-3 space-y-3 bg-background/50"><div className="flex gap-2"><Select value={eventRule.type} onValueChange={value => changeEventType(index, value as AutomationEventType)}><SelectTrigger className="flex-1"><SelectValue /></SelectTrigger><SelectContent>{EVENT_TYPES.map(type => <SelectItem key={type} value={type} disabled={!eventTypeAllowed(index, type)}>{eventLabel(type)}</SelectItem>)}</SelectContent></Select><Button type="button" variant="ghost" size="icon" onClick={() => removeEvent(index)} disabled={editing.events.length <= 1}><Trash2 className="h-4 w-4" /></Button></div>
                        {eventRule.type === "cron" && <Input value={eventRule.schedule || ""} onChange={event => updateEvent(index, { schedule: event.target.value })} placeholder="*/5 * * * *" />}
                        {eventRule.type === "note_content" && <>
                            <div className="space-y-1.5"><Label>{t("ui.automation.contentContains")}</Label><Input value={eventRule.contentContains || ""} onChange={event => updateEvent(index, { contentContains: event.target.value })} placeholder={t("ui.automation.contentPlaceholder")} /></div>
                        </>}
                        {eventRule.type === "file_behavior" && <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-1.5"><Label>{t("ui.automation.pathPrefix")}</Label><Input value={eventRule.pathPrefix || ""} onChange={event => updateEvent(index, { pathPrefix: event.target.value })} placeholder="notes/projects/" /><p className="text-xs text-muted-foreground">{t("ui.automation.pathPrefixHelp")}</p></div><div className="space-y-1.5"><Label>{t("ui.automation.pathGlob")}</Label><Input value={eventRule.pathGlob || ""} onChange={event => updateEvent(index, { pathGlob: event.target.value })} placeholder="notes/*.md" /><p className="text-xs text-muted-foreground">{t("ui.automation.pathGlobHelp")}</p></div></div>
                            <div className="space-y-1.5"><Label>{t("ui.automation.eventActions")}</Label><p className="text-xs text-muted-foreground">{t("ui.automation.eventActionsHelp")}</p><EventActionsSelect value={eventRule.eventActions || []} onChange={next => updateEvent(index, { eventActions: next })} /></div>
                        </>}
                        {eventRule.type === "todo_reminder" && <p className="text-xs text-muted-foreground">{t("ui.automation.todoHelp")}</p>}
                        {eventRule.type === "manual" && <p className="text-xs text-muted-foreground">{t("ui.automation.manualHelp")}</p>}
                    </div>)}
                    {hasUnselectedActions && <p className="text-xs text-destructive">{t("ui.automation.eventActionsRequired")}</p>}
                    {invalidAllFileActions && <p className="text-xs text-destructive">{t("ui.automation.matchModeFileActionsError")}</p>}
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.enabled} onChange={event => updateEditing({ enabled: event.target.checked })} />{t("ui.automation.enabled")}</label>
            </div>
            <div className="border-t pt-4 space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-semibold">{t("ui.automation.targets")}</h3><p className="text-xs text-muted-foreground">{t("ui.automation.targetsHelp")}</p></div><Button type="button" variant="outline" size="sm" onClick={addTarget}><Plus className="h-4 w-4 mr-1" />{t("ui.automation.addTarget")}</Button></div>
                {editing.actions.map((action, index) => <div className="flex gap-2" key={`${index}-${action.type}`}><Select value={action.type} onValueChange={value => updateTarget(index, { type: value as AutomationTargetType, configId: 0 })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{(hasTodo ? ["webhook"] : ["git", "backup", "webhook"]).map(type => <SelectItem key={type} value={type}>{targetLabel(type as AutomationTargetType)}</SelectItem>)}</SelectContent></Select><Select value={String(action.configId)} onValueChange={value => updateTarget(index, { configId: Number(value) })}><SelectTrigger className="flex-1"><SelectValue placeholder={t("ui.automation.selectTarget")} /></SelectTrigger><SelectContent><SelectItem value="0">{t("ui.automation.selectTarget")}</SelectItem>{availableTargets[action.type].map(option => <SelectItem key={option.id} value={String(option.id)}>{option.label}</SelectItem>)}</SelectContent></Select><Button type="button" variant="ghost" size="icon" onClick={() => removeTarget(index)}><Trash2 className="h-4 w-4" /></Button></div>)}
                {!editing.actions.length && <p className="text-sm text-destructive">{t("ui.automation.noTargets")}</p>}
                {reuseWarnings.length > 0 && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 space-y-1">{[...new Set(reuseWarnings)].map(warning => <p key={warning}>{warning}</p>)}</div>}
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t("ui.common.cancel")}</Button><Button type="submit" disabled={saving || !editing.vaultId || hasUnselectedActions || invalidAllCombination || invalidAllFileActions || editing.actions.some(action => action.configId <= 0)}>{t("ui.common.save")}</Button></div>
        </form>}

        <div className="space-y-3">{items.map(item => { const execution = latestExecutionByTrigger.get(item.id); return <div key={item.id} className="border rounded-xl p-4 bg-card flex flex-col md:flex-row md:items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><input type="checkbox" checked={item.enabled} onChange={() => toggleEnabled(item)} aria-label={t("ui.automation.toggleEnabled")} /><span className="font-semibold truncate">{item.name}</span><span className="text-xs text-muted-foreground">#{item.vaultId}</span></div><div className="text-xs text-muted-foreground mt-1">{item.events.map(event => eventLabel(event.type)).join(" / ")} · {item.actions.map(action => `${targetLabel(action.type)} #${action.configId}`).join(", ")}</div><div className="text-xs text-muted-foreground mt-1">{t("ui.automation.executionStatus")}: {execution ? executionStatusLabel(execution.status) : t("ui.common.never")} · {t("ui.automation.lastExecution")}: {executionTime(execution?.finishedAt || execution?.startedAt)}{execution?.error && <span className="text-destructive" title={execution.error}> · {execution.error}</span>}</div></div><div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" title={t("ui.automation.run")} disabled={!item.enabled || !item.events.some(event => event.type === "manual")} onClick={() => void handleAutomationTrigger(item.id).then(reload)}><Play className="h-4 w-4" /></Button>{execution && (execution.status === "failed" || execution.status === "cancelled") && <Button size="icon" variant="ghost" title={t("ui.automation.retry")} onClick={() => void handleAutomationExecutionRetry(execution.id, reload)}><RotateCcw className="h-4 w-4" /></Button>}<Button size="icon" variant="ghost" title={t("ui.common.edit")} onClick={() => editItem(item)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title={t("ui.common.delete")} onClick={() => void handleAutomationDelete(item.id, reload)}><Trash2 className="h-4 w-4" /></Button></div></div>; })}
        {!loading && !items.length && !editing && <div className="border border-dashed rounded-xl p-10 text-center text-sm text-muted-foreground">{t("ui.automation.empty")}</div>}</div>
    </div>;
}
