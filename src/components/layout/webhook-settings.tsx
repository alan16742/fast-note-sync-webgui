import { Pencil, Plus, Send, Trash2, Webhook } from "lucide-react";
import { useWebhookHandle } from "@/components/api-handle/webhook-handle";
import type { NotificationMode, WebhookAction, WebhookProvider, WebhookSubscription, WebhookSubscriptionRequest } from "@/lib/types/webhook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

const actions: WebhookAction[] = ["create", "modify", "rename", "delete", "restore", "permanent_delete"];
const selectClass = "h-10 rounded-md border bg-background px-3 text-sm";

function defaultTemplates(t: TFunction, mode: NotificationMode) {
    if (mode === "reminder") {
        return {
            titleTemplate: t("ui.webhook.defaultReminderTitleTemplate", { title: "{{title}}" }),
            bodyTemplate: t("ui.webhook.defaultReminderBodyTemplate", { title: "{{title}}", due: "{{due}}", timezone: "{{timezone}}", vault: "{{vault}}", path: "{{path}}" }),
        };
    }
    return {
        titleTemplate: t("ui.webhook.defaultNoteTitleTemplate", { action: "{{action}}", path: "{{path}}" }),
        bodyTemplate: t("ui.webhook.defaultNoteBodyTemplate", { vault: "{{vault}}", action: "{{action}}", path: "{{path}}", content: "{{content}}" }),
    };
}

function headersToText(headers?: Record<string, string>) {
    return Object.entries(headers || {}).map(([name, value]) => `${name}: ${value}`).join("\n");
}

function textToHeaders(value: string): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const line of value.split(/\r?\n/)) {
        const separator = line.indexOf(":");
        if (separator <= 0) continue;
        const name = line.slice(0, separator).trim();
        if (!name) continue;
        headers[name] = line.slice(separator + 1).trim();
    }
    return headers;
}

function newSubscription(t: TFunction): WebhookSubscriptionRequest {
    const templates = defaultTemplates(t, "reminder");
    return {
        enabled: true, provider: "serverchan", mode: "reminder", timezone: "Asia/Shanghai",
        url: "", method: "POST", headers: {}, secret: "", vaultId: 0, actions: [], pathPrefix: "", pathGlob: "",
        bodySubstring: "", bodyRegex: "", bodyMaxBytes: 65536, ...templates,
    };
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
    return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

export function WebhookSettings() {
    const { t } = useTranslation();
    const { handleWebhookList, handleWebhookSave, handleWebhookDelete, handleWebhookTest } = useWebhookHandle();
    const [items, setItems] = useState<WebhookSubscription[]>([]);
    const [editing, setEditing] = useState<WebhookSubscriptionRequest | null>(null);
    const [original, setOriginal] = useState<WebhookSubscription | null>(null);
    const [saving, setSaving] = useState(false);
    const [testingId, setTestingId] = useState<number | null>(null);

    const reload = useCallback(() => { void handleWebhookList(setItems); }, [handleWebhookList]);
    useEffect(() => { reload(); }, [reload]);

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!editing || saving) return;
        setSaving(true);
        try {
            await handleWebhookSave(editing, () => { setEditing(null); reload(); });
        } finally {
            setSaving(false);
        }
    };

    const changeProvider = (provider: WebhookProvider) => {
        if (!editing) return;
        setEditing({
            ...editing,
            provider,
            secret: "",
            url: provider === "bark" ? "https://api.day.app" : "",
            method: provider === "custom" ? (editing.method || "POST") : "",
            headers: provider === "custom" ? (editing.headers || {}) : {},
        });
    };

    const changeMode = (mode: NotificationMode) => {
        if (!editing) return;
        const previous = defaultTemplates(t, editing.mode);
        const next = defaultTemplates(t, mode);
        setEditing({
            ...editing,
            mode,
            titleTemplate: editing.titleTemplate === previous.titleTemplate ? next.titleTemplate : editing.titleTemplate,
            bodyTemplate: editing.bodyTemplate === previous.bodyTemplate ? next.bodyTemplate : editing.bodyTemplate,
        });
    };

    const test = async (target: number | WebhookSubscriptionRequest) => {
        if (testingId !== null) return;
        const id = typeof target === "number" ? target : target.id || -1;
        setTestingId(id);
        try {
            await handleWebhookTest(target);
        } finally {
            setTestingId(null);
        }
    };

    const canKeepSecret = original?.provider === editing?.provider && original?.hasSecret;
    const isReminder = editing?.mode === "reminder";

    return (
        <div className="max-w-3xl mx-auto pb-24 space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{t("ui.webhook.title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("ui.webhook.description")}</p>
                </div>
                <Button size="icon" title={t("ui.webhook.add")} onClick={() => { setOriginal(null); setEditing(newSubscription(t)); }}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            {editing && (
                <form onSubmit={save} className="border rounded-lg p-4 space-y-4 bg-card">
                    <fieldset disabled={saving} className="space-y-4">
                        <Field id="webhook-provider" label={t("ui.webhook.provider")}>
                            <select id="webhook-provider" className={selectClass} value={editing.provider} onChange={event => changeProvider(event.target.value as WebhookProvider)}>
                                <option value="serverchan">{t("ui.webhook.providerServerChan")}</option>
                                <option value="bark">{t("ui.webhook.providerBark")}</option>
                                <option value="custom">{t("ui.webhook.providerCustom")}</option>
                            </select>
                        </Field>
                        <Field id="webhook-mode" label={t("ui.webhook.mode")}>
                            <select id="webhook-mode" className={selectClass} value={editing.mode} onChange={event => changeMode(event.target.value as NotificationMode)}>
                                <option value="reminder">{t("ui.webhook.modeReminder")}</option>
                                <option value="note_change">{t("ui.webhook.modeNoteChange")}</option>
                            </select>
                        </Field>
                        {isReminder && (
                            <>
                                <p className="text-sm text-muted-foreground">{t("ui.webhook.reminderHelp")}</p>
                                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{t("ui.webhook.reminderExample")}</pre>
                                <p className="whitespace-pre-line text-xs text-muted-foreground">{t("ui.webhook.reminderDetails")}</p>
                                <Field id="webhook-timezone" label={t("ui.webhook.timezone")}>
                                    <Input id="webhook-timezone" required placeholder="Asia/Shanghai" value={editing.timezone} onChange={event => setEditing({ ...editing, timezone: event.target.value })} />
                                </Field>
                            </>
                        )}
                        {(editing.provider === "bark" || editing.provider === "custom") && (
                            <Field id="webhook-url" label={t(editing.provider === "bark" ? "ui.webhook.endpoint" : "ui.webhook.customEndpoint")}>
                                <Input id="webhook-url" required={editing.provider === "custom"} type="url" placeholder={editing.provider === "bark" ? "https://api.day.app" : "https://example.com/webhook"} value={editing.url} onChange={event => setEditing({ ...editing, url: event.target.value })} />
                                {editing.provider === "bark" && <p className="text-xs text-muted-foreground">{t("ui.webhook.barkHelp")}</p>}
                                {editing.provider === "custom" && <p className="text-xs text-muted-foreground">{t("ui.webhook.customHelp")}</p>}
                            </Field>
                        )}
                        {editing.provider === "custom" ? (
                            <>
                                <Field id="webhook-method" label={t("ui.webhook.method")}>
                                    <select id="webhook-method" className={selectClass} value={editing.method || "POST"} onChange={event => setEditing({ ...editing, method: event.target.value })}>
                                        <option value="POST">{t("ui.webhook.methodPost")}</option>
                                        <option value="GET">{t("ui.webhook.methodGet")}</option>
                                    </select>
                                </Field>
                                <Field id="webhook-headers" label={t("ui.webhook.headers")}>
                                    <Textarea id="webhook-headers" rows={4} value={headersToText(editing.headers)} onChange={event => setEditing({ ...editing, headers: textToHeaders(event.target.value) })} placeholder="Authorization: Bearer ...\nX-Source: fast-note-sync" />
                                    <p className="whitespace-pre-line text-xs text-muted-foreground">{t("ui.webhook.headersHelp")}</p>
                                </Field>
                            </>
                        ) : (
                            <Field id="webhook-secret" label={t(editing.provider === "serverchan" ? "ui.webhook.sendKey" : "ui.webhook.deviceKey")}>
                                <Input id="webhook-secret" required={!canKeepSecret} type="password" autoComplete="new-password" placeholder={canKeepSecret ? t("ui.webhook.secretKeep") : ""} value={editing.secret || ""} onChange={event => setEditing({ ...editing, secret: event.target.value })} />
                            </Field>
                        )}
                        <Field id="webhook-title-template" label={t("ui.webhook.titleTemplate")}>
                            <Input id="webhook-title-template" value={editing.titleTemplate} onChange={event => setEditing({ ...editing, titleTemplate: event.target.value })} />
                        </Field>
                        <Field id="webhook-body-template" label={t("ui.webhook.bodyTemplate")}>
                            <Textarea id="webhook-body-template" rows={5} value={editing.bodyTemplate} onChange={event => setEditing({ ...editing, bodyTemplate: event.target.value })} />
                            <p className="whitespace-pre-line text-xs text-muted-foreground">{t("ui.webhook.templateHelp", { content: "{{content}}", vault: "{{vault}}", path: "{{path}}", old_path: "{{old_path}}", action: "{{action}}", title: "{{title}}", due: "{{due}}", timezone: "{{timezone}}", url: "{{url}}" })}</p>
                        </Field>
                        <label className="flex items-center gap-3 text-sm">
                            <input type="checkbox" checked={editing.enabled} onChange={event => setEditing({ ...editing, enabled: event.target.checked })} />
                            {t("ui.webhook.enabled")}
                        </label>
                        {!isReminder && (
                            <div className="grid gap-2">
                                <Label>{t("ui.webhook.actions")}</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {actions.map(action => (
                                        <label key={action} className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" checked={editing.actions.includes(action)} onChange={event => setEditing({ ...editing, actions: event.target.checked ? [...editing.actions, action] : editing.actions.filter(item => item !== action) })} />
                                            {t(`ui.webhook.action.${action}`)}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Field id="webhook-path-prefix" label={t("ui.webhook.pathPrefix")}>
                            <Input id="webhook-path-prefix" placeholder={t("ui.webhook.pathPrefixPlaceholder")} value={editing.pathPrefix} onChange={event => setEditing({ ...editing, pathPrefix: event.target.value })} />
                        </Field>
                        <Field id="webhook-path-glob" label={t("ui.webhook.pathGlob")}>
                            <Input id="webhook-path-glob" placeholder={t("ui.webhook.pathGlobPlaceholder")} value={editing.pathGlob} onChange={event => setEditing({ ...editing, pathGlob: event.target.value })} />
                        </Field>
                        {!isReminder && (
                            <Field id="webhook-body" label={t("ui.webhook.bodySubstring")}>
                                <Input id="webhook-body" value={editing.bodySubstring} onChange={event => setEditing({ ...editing, bodySubstring: event.target.value })} />
                            </Field>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t("ui.common.cancel")}</Button>
                            <Button type="button" variant="outline" disabled={testingId !== null} onClick={() => void test(editing)}><Send className="h-4 w-4" />{t(testingId === (editing.id || -1) ? "ui.webhook.testing" : "ui.webhook.test")}</Button>
                            <Button type="submit">{t("ui.common.save")}</Button>
                        </div>
                    </fieldset>
                </form>
            )}
            {items.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 border rounded-lg p-4 bg-card">
                    <div className="flex min-w-0 items-center gap-3">
                        <Webhook className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                            <div className="truncate font-medium">{item.url || t("ui.webhook.providerServerChan")}</div>
                            <div className="text-xs text-muted-foreground">
                                {t(item.mode === "reminder" ? "ui.webhook.modeReminder" : "ui.webhook.modeNoteChange")} · {t(item.enabled ? "ui.webhook.enabled" : "ui.webhook.disabled")}
                                {item.hasSecret && ` · ${t("ui.webhook.secretSet")}`}
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" title={t(testingId === item.id ? "ui.webhook.testing" : "ui.webhook.test")} disabled={testingId !== null} onClick={() => void test(item.id)}><Send className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title={t("ui.common.edit")} onClick={() => { const templates = defaultTemplates(t, item.mode); setOriginal(item); setEditing({ ...item, method: item.method || "POST", headers: item.headers || {}, titleTemplate: item.titleTemplate || templates.titleTemplate, bodyTemplate: item.bodyTemplate || templates.bodyTemplate, secret: "" }); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title={t("ui.common.delete")} onClick={() => void handleWebhookDelete(item.id, reload)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </div>
            ))}
            {!items.length && !editing && <div className="border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground">{t("ui.webhook.empty")}</div>}
        </div>
    );
}
