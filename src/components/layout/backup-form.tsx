import { createBackupConfigSchema, BackupFormData } from "@/lib/validations/backup-schema";
import { BackupConfig } from "@/lib/types/backup";
import { useBackupHandle } from "@/components/api-handle/backup-handle";
import { useAppStore } from "@/stores/app-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { StorageConfig } from "@/lib/types/storage";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

interface BackupFormProps {
    config?: BackupConfig;
    storages: StorageConfig[];
    onSubmit: () => void;
    onCancel?: () => void;
}

export function BackupForm({ config, storages, onSubmit, onCancel }: BackupFormProps) {
    const { t } = useTranslation();
    const { handleBackupConfigUpdate } = useBackupHandle();
    const setDirty = useAppStore(state => state.setDirty);
    const activeStorages = useMemo(() => storages.filter(storage => storage.isEnabled), [storages]);
    const initialStorageIds = useMemo(() => {
        if (!config?.storageIds) return [];
        try {
            return (JSON.parse(config.storageIds) as number[]).filter(id => activeStorages.some(storage => Number(storage.id) === id));
        } catch {
            return [];
        }
    }, [config?.storageIds, activeStorages]);
    const [selectedStorageIds, setSelectedStorageIds] = useState<number[]>(initialStorageIds);
    const schema = createBackupConfigSchema(t);
    const defaultValues = useMemo(() => ({
        storageIds: JSON.stringify(initialStorageIds),
        type: config?.type ?? "full",
        includeVaultName: config?.includeVaultName ?? false,
        passwordMode: config?.passwordMode ?? 0,
        passwordValue: config?.passwordValue ?? "",
        retentionDays: config?.retentionDays ?? 10,
    }), [config, initialStorageIds]);
    const { register, handleSubmit, formState: { errors, isDirty }, setValue, watch, reset } = useForm<BackupFormData>({
        resolver: zodResolver(schema),
        defaultValues,
    });

    useEffect(() => setDirty("backup-config", isDirty), [isDirty, setDirty]);
    useEffect(() => {
        setSelectedStorageIds(initialStorageIds);
        reset(defaultValues);
    }, [defaultValues, initialStorageIds, reset]);

    const handleCancel = useCallback(() => {
        setSelectedStorageIds(initialStorageIds);
        reset(defaultValues);
        onCancel?.();
    }, [defaultValues, initialStorageIds, onCancel, reset]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && onCancel) {
                event.preventDefault();
                handleCancel();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleCancel, onCancel]);

    const onFormSubmit = (data: BackupFormData) => {
        handleBackupConfigUpdate({
            id: config?.id,
            storageIds: data.storageIds,
            type: data.type,
            includeVaultName: data.includeVaultName,
            passwordMode: data.passwordMode,
            passwordValue: data.passwordValue,
            retentionDays: data.retentionDays,
        }, onSubmit);
    };
	const toggleStorage = (id: number) => {
        const ids = selectedStorageIds.includes(id) ? selectedStorageIds.filter(item => item !== id) : [...selectedStorageIds, id];
        setSelectedStorageIds(ids);
        setValue("storageIds", JSON.stringify(ids), { shouldDirty: true });
    };

    return <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="space-y-2">
            <Label>{t("ui.backup.storages")}</Label>
            <p className="text-xs text-muted-foreground">{t("ui.backup.storageHelp")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 border border-input rounded-md p-3 bg-background/50">
                {activeStorages.length === 0 ? (
                    <div className="col-span-full py-5 text-center text-sm text-muted-foreground">{t("ui.backup.addStorageTip")}</div>
                ) : activeStorages.map(storage => <div key={storage.id} className="flex items-center gap-2">
                    <Checkbox id={`storage-${storage.id}`} checked={selectedStorageIds.includes(Number(storage.id))} onCheckedChange={() => toggleStorage(Number(storage.id))} />
                    <Label htmlFor={`storage-${storage.id}`} className="cursor-pointer truncate">
                        {t(`ui.storage.storageType.${storage.type}`)} · #{storage.id}
                    </Label>
                </div>)}
            </div>
            {errors.storageIds && <p className="text-xs text-destructive">{errors.storageIds.message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
            <div className="md:col-span-2">
                <h3 className="text-sm font-semibold">{t("ui.backup.policy")}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t("ui.backup.policyHelp")}</p>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="backup-type">{t("ui.backup.type")}</Label>
                <Select value={watch("type") || "full"} onValueChange={value => setValue("type", value as BackupFormData["type"], { shouldDirty: true })}>
                    <SelectTrigger id="backup-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="full">{t("ui.backup.backupType.full")}</SelectItem>
                        <SelectItem value="incremental">{t("ui.backup.backupType.incremental")}</SelectItem>
                        <SelectItem value="sync">{t("ui.backup.backupType.sync")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="backup-retention-days">{t("ui.backup.retentionDays")}</Label>
                <Input id="backup-retention-days" type="number" {...register("retentionDays", { valueAsNumber: true })} />
                <p className="text-xs text-muted-foreground">{t("ui.backup.retentionDaysHelp")}</p>
                {errors.retentionDays && <p className="text-xs text-destructive">{errors.retentionDays.message}</p>}
            </div>
            {watch("type") === "sync" && <div className="md:col-span-2 flex items-center gap-2">
                <Checkbox id="include-vault-name" checked={Boolean(watch("includeVaultName"))} onCheckedChange={checked => setValue("includeVaultName", Boolean(checked), { shouldDirty: true })} />
                <Label htmlFor="include-vault-name">{t("ui.backup.includeVaultName.label")}</Label>
            </div>}
            {(watch("type") === "full" || watch("type") === "incremental") && <>
                <div className="space-y-1.5">
                    <Label htmlFor="backup-password-mode">{t("ui.backup.passwordMode")}</Label>
                    <Select value={String(watch("passwordMode") ?? 0)} onValueChange={value => setValue("passwordMode", Number(value), { shouldDirty: true })}>
                        <SelectTrigger id="backup-password-mode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">{t("ui.backup.passwordMode.0")}</SelectItem>
                            <SelectItem value="1">{t("ui.backup.passwordMode.1")}</SelectItem>
                            <SelectItem value="2">{t("ui.backup.passwordMode.2")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="backup-password-value">{t("ui.backup.passwordValue")}</Label>
                    <Input id="backup-password-value" type="password" disabled={watch("passwordMode") !== 1} placeholder={t("ui.backup.passwordValue.placeholder")} {...register("passwordValue")} />
                </div>
            </>}
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            {onCancel && <Button type="button" variant="ghost" onClick={handleCancel}>{t("ui.common.cancel")}</Button>}
            <Button type="submit">{config ? t("ui.common.save") : t("ui.common.add")}</Button>
        </div>
    </form>;
}
