import { useAutomationHandle } from "@/components/api-handle/automation-handle";
import { useBackupHandle } from "@/components/api-handle/backup-handle";
import { useGitHandle } from "@/components/api-handle/git-handle";
import { useVaultHandle } from "@/components/api-handle/vault-handle";
import { useWebhookHandle } from "@/components/api-handle/webhook-handle";
import type { AutomationAction, AutomationEventType, AutomationTargetType, AutomationTrigger, AutomationTriggerRequest } from "@/lib/types/automation";
import type { BackupConfig } from "@/lib/types/backup";
import type { GitSyncConfigDTO } from "@/lib/types/git";
import type { VaultType } from "@/lib/types/vault";
import type { WebhookSubscription } from "@/lib/types/webhook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Play, Plus, RefreshCw, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_ACTIONS = ["create", "modify", "delete", "rename", "restore", "permanent_delete"];

const emptyTrigger = (): AutomationTriggerRequest => ({
    name: "",
    enabled: true,
    eventType: "content",
    vaultId: 0,
    timezone: "Asia/Shanghai",
    schedule: "*/5 * * * *",
    contentContains: "",
    pathPrefix: "",
    pathGlob: "",
    eventActions: [],
    actions: [],
});

export function AutomationSettings() {
    const { t } = useTranslation();
    const { handleAutomationList, handleAutomationSave, handleAutomationDelete, handleAutomationTrigger } = useAutomationHandle();
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const reload = useCallback(() => {
        setLoading(true);
        void Promise.all([
            handleAutomationList(setItems),
            handleBackupConfigList(setBackups),
            handleGitSyncList(setGitConfigs),
            handleWebhookList(setWebhooks),
            handleVaultList(setVaults),
        ]).finally(() => setLoading(false));
    }, [handleAutomationList, handleBackupConfigList, handleGitSyncList, handleVaultList, handleWebhookList]);

    useEffect(() => {
        reload();
    }, [reload]);

    const editItem = (item: AutomationTrigger) => setEditing({
        id: item.id,
        name: item.name,
        enabled: item.enabled,
        eventType: item.eventType,
        vaultId: item.vaultId,
        timezone: item.timezone || "Asia/Shanghai",
        schedule: item.schedule || "*/5 * * * *",
        contentContains: item.contentContains || "",
        pathPrefix: item.pathPrefix || "",
        pathGlob: item.pathGlob || "",
        eventActions: item.eventActions || [],
        actions: item.actions || [],
    });

    const availableTargets = useMemo(() => ({
        git: gitConfigs.map(item => ({ id: item.id, label: `${item.vault || t("ui.automation.unknownVault")} · ${item.repoUrl}` })),
        backup: backups.filter(item => item.id).map(item => ({ id: item.id as number, label: `${item.vault || t("ui.automation.allVaults")} · ${item.type}` })),
        webhook: webhooks.map(item => ({ id: item.id, label: `${item.provider} · ${item.url || t("ui.automation.defaultEndpoint")}` })),
    }), [backups, gitConfigs, t, webhooks]);

    const addTarget = () => setEditing(value => value ? { ...value, actions: [...value.actions, { type: "webhook", configId: 0 }] } : value);
    const removeTarget = (index: number) => setEditing(value => value ? { ...value, actions: value.actions.filter((_, itemIndex) => itemIndex !== index) } : value);
    const updateTarget = (index: number, patch: Partial<AutomationAction>) => setEditing(value => value ? {
        ...value,
        actions: value.actions.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    } : value);

    const changeEventType = (eventType: AutomationEventType) => setEditing(value => {
        if (!value) return value;
        const actions = eventType === "todo"
            ? value.actions.map(action => ({ ...action, type: "webhook" as const, configId: action.type === "webhook" ? action.configId : 0 }))
            : value.actions;
        return { ...value, eventType, actions, eventActions: eventType === "todo" ? [] : value.eventActions };
    });

    const save = (event: React.FormEvent) => {
        event.preventDefault();
        if (!editing || saving) return;
        setSaving(true);
        handleAutomationSave(editing, () => {
            setEditing(null);
            reload();
        }).finally(() => setSaving(false));
    };

    const eventTypeLabel = (type: AutomationEventType) => t(`ui.automation.event.${type}`);
    const targetLabel = (type: AutomationTargetType) => t(`ui.automation.target.${type}`);
    const actionLabel = (action: string) => t(`ui.automation.action.${action}`);

    return (
        <div className="max-w-5xl mx-auto pb-24 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />{t("ui.automation.title")}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t("ui.automation.description")}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={reload} disabled={loading} title={t("ui.common.refresh")}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></Button>
                    <Button onClick={() => setEditing(emptyTrigger())}><Plus className="h-4 w-4 mr-2" />{t("ui.automation.add")}</Button>
                </div>
            </div>

            {editing && (
                <form onSubmit={save} className="border rounded-xl p-5 bg-card space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor="automation-name">{t("ui.automation.name")}</Label>
                            <Input id="automation-name" required value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} placeholder={t("ui.automation.namePlaceholder")} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="automation-event">{t("ui.automation.eventType")}</Label>
                            <Select value={editing.eventType} onValueChange={value => changeEventType(value as AutomationEventType)}>
                                <SelectTrigger id="automation-event" className="bg-background border-input"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="time">{eventTypeLabel("time")}</SelectItem>
                                    <SelectItem value="content">{eventTypeLabel("content")}</SelectItem>
                                    <SelectItem value="todo">{eventTypeLabel("todo")}</SelectItem>
                                    <SelectItem value="file">{eventTypeLabel("file")}</SelectItem>
                                    <SelectItem value="manual">{eventTypeLabel("manual")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="automation-vault">{t("ui.automation.vault")}</Label>
                            <Select value={String(editing.vaultId)} onValueChange={value => setEditing({ ...editing, vaultId: Number(value) })}>
                                <SelectTrigger id="automation-vault" className="bg-background border-input"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">{t("ui.automation.allVaults")}</SelectItem>
                                    {vaults.map(vault => <SelectItem key={vault.id} value={String(vault.id)}>{vault.vault}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {(editing.eventType === "time" || editing.eventType === "todo") && (
                            <>
                                {editing.eventType === "time" && <div className="space-y-1.5">
                                    <Label htmlFor="automation-schedule">{t("ui.automation.schedule")}</Label>
                                    <Input id="automation-schedule" required value={editing.schedule} onChange={event => setEditing({ ...editing, schedule: event.target.value })} placeholder="*/5 * * * *" />
                                    <p className="text-xs text-muted-foreground">{t("ui.automation.scheduleHelp")}</p>
                                </div>}
                                <div className="space-y-1.5">
                                    <Label htmlFor="automation-timezone">{t("ui.automation.timezone")}</Label>
                                    <Input id="automation-timezone" value={editing.timezone} onChange={event => setEditing({ ...editing, timezone: event.target.value })} placeholder="Asia/Shanghai" />
                                </div>
                            </>
                        )}
                        {(editing.eventType === "content" || editing.eventType === "file" || editing.eventType === "todo") && (
                            <>
                                {(editing.eventType === "content" || editing.eventType === "todo") && <div className="space-y-1.5 md:col-span-2">
                                    <Label htmlFor="automation-content">{t("ui.automation.contentContains")}</Label>
                                    <Input id="automation-content" value={editing.contentContains} onChange={event => setEditing({ ...editing, contentContains: event.target.value })} placeholder={t("ui.automation.contentPlaceholder")} />
                                    {editing.eventType === "todo" && <p className="text-xs text-muted-foreground">{t("ui.automation.todoHelp")}</p>}
                                </div>}
                                <div className="space-y-1.5">
                                    <Label htmlFor="automation-prefix">{t("ui.automation.pathPrefix")}</Label>
                                    <Input id="automation-prefix" value={editing.pathPrefix} onChange={event => setEditing({ ...editing, pathPrefix: event.target.value })} placeholder="Projects/" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="automation-glob">{t("ui.automation.pathGlob")}</Label>
                                    <Input id="automation-glob" value={editing.pathGlob} onChange={event => setEditing({ ...editing, pathGlob: event.target.value })} placeholder="**/*.md" />
                                </div>
                                {(editing.eventType === "content" || editing.eventType === "file") && <div className="md:col-span-2 space-y-2">
                                    <Label>{t("ui.automation.eventActions")}</Label>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        {EVENT_ACTIONS.map(action => <label key={action} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.eventActions.includes(action)} onChange={event => setEditing({ ...editing, eventActions: event.target.checked ? [...editing.eventActions, action] : editing.eventActions.filter(item => item !== action) })} />{actionLabel(action)}</label>)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{t("ui.automation.emptyActionsHelp")}</p>
                                </div>}
                            </>
                        )}
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.enabled} onChange={event => setEditing({ ...editing, enabled: event.target.checked })} />{t("ui.automation.enabled")}</label>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                        <div className="flex items-center justify-between"><div><h3 className="font-semibold">{t("ui.automation.targets")}</h3><p className="text-xs text-muted-foreground">{t("ui.automation.targetsHelp")}</p></div><Button type="button" variant="outline" size="sm" onClick={addTarget}><Plus className="h-4 w-4 mr-1" />{t("ui.automation.addTarget")}</Button></div>
                        {editing.actions.map((action, index) => <div className="flex flex-col sm:flex-row gap-2" key={`${index}-${action.type}`}>
                            <Select value={action.type} onValueChange={value => updateTarget(index, { type: value as AutomationTargetType, configId: 0 })}>
                                <SelectTrigger className="bg-background border-input sm:w-40"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(editing.eventType === "todo" ? ["webhook"] : ["git", "backup", "webhook"]).map(type => <SelectItem key={type} value={type}>{targetLabel(type as AutomationTargetType)}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={String(action.configId)} onValueChange={value => updateTarget(index, { configId: Number(value) })}>
                                <SelectTrigger className="bg-background border-input min-w-0 flex-1"><SelectValue placeholder={t("ui.automation.selectTarget")} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">{t("ui.automation.selectTarget")}</SelectItem>
                                    {availableTargets[action.type].map(option => <SelectItem key={option.id} value={String(option.id)}>{option.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTarget(index)} title={t("ui.common.delete")}><Trash2 className="h-4 w-4" /></Button>
                        </div>)}
                        {!editing.actions.length && <p className="text-sm text-destructive">{t("ui.automation.noTargets")}</p>}
                    </div>
                    <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t("ui.common.cancel")}</Button><Button type="submit" disabled={saving || editing.actions.some(action => action.configId <= 0)}>{t("ui.common.save")}</Button></div>
                </form>
            )}

            <div className="space-y-3">
                {items.map(item => <div key={item.id} className="border rounded-xl p-4 bg-card flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0"><div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", item.enabled ? "bg-emerald-500" : "bg-muted-foreground")} /><span className="font-semibold truncate">{item.name}</span><span className="text-xs text-muted-foreground">{eventTypeLabel(item.eventType)}</span></div><div className="text-xs text-muted-foreground mt-1">{item.eventType === "time" ? `${item.schedule} · ${item.timezone}` : item.eventType === "todo" ? `${item.timezone} · ${item.pathPrefix || item.pathGlob || t("ui.automation.anyEvent")}` : item.pathPrefix || item.contentContains || t("ui.automation.anyEvent")} · {item.actions.map(action => `${targetLabel(action.type)} #${action.configId}`).join(", ")}</div></div>
                    <div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" title={t("ui.automation.run")} disabled={!item.enabled || item.eventType !== "manual"} onClick={() => void handleAutomationTrigger(item.id, item.vaultId)}><Play className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title={t("ui.common.edit")} onClick={() => editItem(item)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title={t("ui.common.delete")} onClick={() => void handleAutomationDelete(item.id, reload)}><Trash2 className="h-4 w-4" /></Button></div>
                </div>)}
                {!loading && !items.length && !editing && <div className="border border-dashed rounded-xl p-10 text-center text-sm text-muted-foreground">{t("ui.automation.empty")}</div>}
            </div>
        </div>
    );
}
