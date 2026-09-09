import { Pencil, Plus, Send, Trash2, Webhook } from "lucide-react";
import { useWebhookHandle } from "@/components/api-handle/webhook-handle";
import type { WebhookProvider, WebhookSubscription, WebhookSubscriptionRequest } from "@/lib/types/webhook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

function defaultTemplates(t: TFunction) {
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
    const templates = defaultTemplates(t);
    return {
        provider: "serverchan",
        url: "", method: "POST", headers: {}, secret: "", ...templates,
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
    const [headersText, setHeadersText] = useState("");
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
        setHeadersText(provider === "custom" ? headersToText(editing.headers || {}) : "");
    };

    const beginEdit = (value: WebhookSubscriptionRequest, source?: WebhookSubscription | null) => {
        setOriginal(source || null);
        setEditing(value);
        setHeadersText(headersToText(value.headers));
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
    return (
        <div className="max-w-3xl mx-auto pb-24 space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{t("ui.webhook.title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("ui.webhook.description")}</p>
                </div>
                <Button size="icon" title={t("ui.webhook.add")} onClick={() => beginEdit(newSubscription(t))}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            {editing && (
                <form onSubmit={save} className="border rounded-lg p-4 space-y-4 bg-card">
                    <fieldset disabled={saving} className="space-y-4">
                        <Field id="webhook-provider" label={t("ui.webhook.provider")}>
                            <Select value={editing.provider} onValueChange={value => changeProvider(value as WebhookProvider)}>
                                <SelectTrigger id="webhook-provider" className="bg-background border-input"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="serverchan">{t("ui.webhook.providerServerChan")}</SelectItem>
                                    <SelectItem value="bark">{t("ui.webhook.providerBark")}</SelectItem>
                                    <SelectItem value="custom">{t("ui.webhook.providerCustom")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        {(editing.provider === "bark" || editing.provider === "custom") && (
                            <Field id="webhook-url" label={t(editing.provider === "bark" ? "ui.webhook.endpoint" : "ui.webhook.customEndpoint")}>
                                <Input id="webhook-url" required={editing.provider === "custom"} type={editing.provider === "custom" ? "text" : "url"} placeholder={editing.provider === "bark" ? "https://api.day.app" : "https://example.com/webhook?title={{content}}"} value={editing.url} onChange={event => setEditing({ ...editing, url: event.target.value })} />
                                {editing.provider === "bark" && <p className="text-xs text-muted-foreground">{t("ui.webhook.barkHelp")}</p>}
                            </Field>
                        )}
                        {editing.provider === "custom" ? (
                            <>
                                <Field id="webhook-method" label={t("ui.webhook.method")}>
                                    <Select value={editing.method || "POST"} onValueChange={value => setEditing({ ...editing, method: value })}>
                                        <SelectTrigger id="webhook-method" className="bg-background border-input"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="POST">{t("ui.webhook.methodPost")}</SelectItem>
                                            <SelectItem value="GET">{t("ui.webhook.methodGet")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field id="webhook-headers" label={t("ui.webhook.headers")}>
                                    <Textarea id="webhook-headers" rows={4} value={headersText} onChange={event => {
                                        const value = event.target.value;
                                        setHeadersText(value);
                                        setEditing({ ...editing, headers: textToHeaders(value) });
                                    }} placeholder={'Authorization: Bearer ...\nX-Source: fast-note-sync'} />
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
                            <div className="text-xs text-muted-foreground">{item.hasSecret && t("ui.webhook.secretSet")}</div>
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" title={t(testingId === item.id ? "ui.webhook.testing" : "ui.webhook.test")} disabled={testingId !== null} onClick={() => void test(item.id)}><Send className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title={t("ui.common.edit")} onClick={() => { const templates = defaultTemplates(t); beginEdit({ ...item, method: item.method || "POST", headers: item.headers || {}, titleTemplate: item.titleTemplate || templates.titleTemplate, bodyTemplate: item.bodyTemplate || templates.bodyTemplate, secret: "" }, item); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title={t("ui.common.delete")} onClick={() => void handleWebhookDelete(item.id, reload)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </div>
            ))}
            {!items.length && !editing && <div className="border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground">{t("ui.webhook.empty")}</div>}
        </div>
    );
}
