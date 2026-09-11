import { Pencil, Plus, Send, Trash2, Webhook } from "lucide-react";
import { useWebhookHandle } from "@/components/api-handle/webhook-handle";
import type { WebhookProvider, WebhookSubscription, WebhookSubscriptionRequest } from "@/lib/types/webhook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

function defaultTemplates(t: TFunction) {
    return {
        titleTemplate: t("ui.webhook.defaultNoteTitleTemplate", { action: "{{action}}", path: "{{path}}" }),
        bodyTemplate: t("ui.webhook.defaultNoteBodyTemplate", { vault: "{{vault}}", action: "{{action}}", path: "{{path}}", content: "{{content}}" }),
    };
}

const templateValues = {
    content: "{{content}}",
    vault: "{{vault}}",
    path: "{{path}}",
    old_path: "{{old_path}}",
    action: "{{action}}",
    task: "{{task}}",
    due: "{{due}}",
    timezone: "{{timezone}}",
    ob_uri: "{{ob_uri}}",
};

type HeaderRow = { id: number; name: string; value: string };

function isSensitiveHeader(name: string) {
    const key = name.trim().toLowerCase();
    return ["cookie", "set-cookie", "key"].includes(key)
        || /auth|token|secret|password|passwd|credential|api_key|api-key|apikey/.test(key)
        || /[-_]key$|^key[-_]/.test(key);
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
    const [headerRows, setHeaderRows] = useState<HeaderRow[]>([]);
    const nextHeaderID = useRef(0);
    const [headerError, setHeaderError] = useState("");
    const makeHeaderRows = (headers: Record<string, string>) => Object.entries(headers).map(([name, value]) => ({ id: nextHeaderID.current++, name, value }));
    const requestWithHeaders = (value: WebhookSubscriptionRequest): WebhookSubscriptionRequest | null => {
        if (value.provider !== "custom") return value;
        const entries: [string, string][] = [];
        const seen = new Set<string>();
        for (const row of headerRows) {
            if (!row.name && !row.value) continue;
            const name = row.name.trim();
            if (!name || name.length > 256 || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)
                || seen.has(name.toLowerCase()) || new TextEncoder().encode(row.value).length > 8192 || /[\x00-\x08\x0a-\x1f\x7f]/.test(row.value)) {
                setHeaderError(t("ui.webhook.headersInvalid"));
                return null;
            }
            seen.add(name.toLowerCase());
            entries.push([name, row.value]);
        }
        if (entries.length > 64) {
            setHeaderError(t("ui.webhook.headersInvalid"));
            return null;
        }
        setHeaderError("");
        return { ...value, headers: Object.fromEntries(entries), titleTemplate: "" };
    };
    const [saving, setSaving] = useState(false);
    const [testingId, setTestingId] = useState<number | null>(null);

    const reload = useCallback(() => { void handleWebhookList(setItems); }, [handleWebhookList]);
    useEffect(() => { reload(); }, [reload]);

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!editing || saving) return;
        const request = requestWithHeaders(editing);
        if (!request) return;
        setSaving(true);
        try {
            await handleWebhookSave(request, () => { setEditing(null); reload(); });
        } finally {
            setSaving(false);
        }
    };

    const changeProvider = (provider: WebhookProvider) => {
        if (!editing) return;
        const templates = defaultTemplates(t);
        setEditing({
            ...editing,
            provider,
            secret: "",
            url: provider === "bark" ? "https://api.day.app" : "",
            method: provider === "custom" ? (editing.method || "POST") : "",
            headers: provider === "custom" ? (editing.headers || {}) : {},
            titleTemplate: provider === "custom" ? "" : (editing.titleTemplate || templates.titleTemplate),
        });
        setHeaderRows([]);
        setHeaderError("");
    };

    const beginEdit = (value: WebhookSubscriptionRequest, source?: WebhookSubscription | null) => {
        setOriginal(source || null);
        setEditing(value);
        setHeaderRows(makeHeaderRows(value.headers || {}));
        setHeaderError("");
    };

    const test = async (target: number | WebhookSubscriptionRequest) => {
        if (testingId !== null) return;
        const request = typeof target === "number" ? target : requestWithHeaders(target);
        if (request === null) return;
        const id = typeof target === "number" ? target : target.id || -1;
        setTestingId(id);
        try {
            await handleWebhookTest(request);
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
                                    <SelectItem value="serverchan">ServerChan</SelectItem>
                                    <SelectItem value="bark">Bark</SelectItem>
                                    <SelectItem value="custom">Webhook</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>

                        {(["bark", "custom"].includes(editing.provider) &&
                            <Field id="webhook-url" label={t("ui.webhook.endpoint")}>
                                <Input id="webhook-url" required={editing.provider === "custom"} type={editing.provider === "custom" ? "text" : "url"} placeholder={editing.provider === "bark" ? "https://api.day.app" : "https://example.com/webhook?title={{content}}"} value={editing.url} onChange={event => setEditing({ ...editing, url: event.target.value })} />
                                <p className="text-xs text-muted-foreground">{t("ui.webhook.endpointHelp")}</p>
                            </Field>
                        )}
                        {editing.provider === "custom" ? (
                            <>
                                <Field id="webhook-method" label={t("ui.webhook.method")}>
                                    <Select value={editing.method || "POST"} onValueChange={value => setEditing({ ...editing, method: value })}>
                                        <SelectTrigger id="webhook-method" className="bg-background border-input"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="POST">POST</SelectItem>
                                            <SelectItem value="GET">GET</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <div className="grid gap-2" role="group" aria-labelledby="webhook-headers-label">
                                    <Label id="webhook-headers-label">{t("ui.webhook.headers")}</Label>
                                    {headerRows.map((row, index) => {
                                        const protectedValue = original?.provider === "custom" && original.protectedHeaders?.some(name => name.toLowerCase() === row.name.trim().toLowerCase());
                                        const sensitive = protectedValue || isSensitiveHeader(row.name);
                                        return <div key={row.id} className="flex items-start gap-2">
                                            <div className="grid flex-1 min-w-0 grid-cols-1 sm:grid-cols-2 gap-2">
                                                <Input aria-label={`${t("ui.settings.headerNamePlaceholder")} ${index + 1}`} placeholder="Authorization" value={row.name} maxLength={256} onChange={event => { setHeaderError(""); setHeaderRows(rows => rows.map(item => item.id === row.id ? { ...item, name: event.target.value } : item)); }} />
                                                <div className="grid gap-1">
                                                    <Input aria-label={`${t("ui.settings.headerValuePlaceholder")} ${index + 1}`} type={sensitive ? "password" : "text"} autoComplete="new-password" placeholder={protectedValue ? t("ui.webhook.secretKeep") : t("ui.settings.headerValuePlaceholder")} value={row.value} maxLength={8192} onChange={event => { setHeaderError(""); setHeaderRows(rows => rows.map(item => item.id === row.id ? { ...item, value: event.target.value } : item)); }} />
                                                    {protectedValue && <p className="text-xs text-muted-foreground">{t("ui.webhook.secretSet")}</p>}
                                                </div>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" aria-label={`${t("ui.common.delete")} ${index + 1}`} onClick={() => { setHeaderRows(rows => rows.filter(item => item.id !== row.id)); setHeaderError(""); }}><Trash2 className="h-4 w-4" /></Button>
                                        </div>;
                                    })}
                                    <Button type="button" variant="outline" className="justify-self-start" disabled={headerRows.length >= 64} onClick={() => setHeaderRows(rows => [...rows, { id: nextHeaderID.current++, name: "", value: "" }])}><Plus className="h-4 w-4" />{t("ui.common.add")}</Button>
                                    <p className="whitespace-pre-line text-xs text-muted-foreground">{t("ui.webhook.headersHelp")}</p>
                                    {headerError && <p role="alert" className="text-sm text-destructive">{headerError}</p>}
                                </div>
                            </>
                        ) : (
                            <Field id="webhook-secret" label={t("ui.webhook.secret")}>
                                <Input id="webhook-secret" required={!canKeepSecret} type="password" autoComplete="new-password" placeholder={canKeepSecret ? t("ui.webhook.secretKeep") : ""} value={editing.secret || ""} onChange={event => setEditing({ ...editing, secret: event.target.value })} />
                            </Field>
                        )}
                        {editing.provider !== "custom" && <Field id="webhook-title-template" label={t("ui.webhook.titleTemplate")}>
                            <Input id="webhook-title-template" value={editing.titleTemplate} onChange={event => setEditing({ ...editing, titleTemplate: event.target.value })} />
                        </Field>}
                        <Field id={editing.provider === "custom" ? "webhook-request-body" : "webhook-body-template"} label={t(editing.provider === "custom" ? "ui.webhook.requestBody" : "ui.webhook.bodyTemplate")}>
                            <Textarea id={editing.provider === "custom" ? "webhook-request-body" : "webhook-body-template"} rows={5} value={editing.bodyTemplate} onChange={event => setEditing({ ...editing, bodyTemplate: event.target.value })} />
                            <p className="whitespace-pre-line text-xs text-muted-foreground">{t("ui.webhook.requestBodyHelp", templateValues)}</p>
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
                            <div className="truncate font-medium">{item.url || "ServerChan"}</div>
                            <div className="text-xs text-muted-foreground">{item.hasSecret && t("ui.webhook.secretSet")}</div>
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" title={t(testingId === item.id ? "ui.webhook.testing" : "ui.webhook.test")} disabled={testingId !== null} onClick={() => void test(item.id)}><Send className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title={t("ui.common.edit")} onClick={() => { const templates = defaultTemplates(t); beginEdit({ ...item, method: item.method || "POST", headers: item.headers || {}, titleTemplate: item.provider === "custom" ? "" : (item.titleTemplate || templates.titleTemplate), bodyTemplate: item.bodyTemplate || templates.bodyTemplate, secret: "" }, item); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title={t("ui.common.delete")} onClick={() => void handleWebhookDelete(item.id, reload)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </div>
            ))}
            {!items.length && !editing && <div className="border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground">{t("ui.webhook.empty")}</div>}
        </div>
    );
}
