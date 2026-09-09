import { GitSyncConfigDTO, GitSyncConfigRequest, GitSyncValidateRequest, GitSyncHistoryDTO } from "@/lib/types/git";
import { addCacheBuster } from "@/lib/utils/cache-buster";
import { buildApiHeaders } from "@/lib/utils/api-headers";
import { toast } from "@/components/common/Toast";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";
import env from "@/env.ts";


/**
 * Git 同步 API 处理 Hook
 */
export function useGitHandle() {
    const { t } = useTranslation();
    const token = localStorage.getItem("token")!;

    const getHeaders = useCallback((contentType = true) => {
        return buildApiHeaders({
            token,
            includeContentType: contentType,
        });
    }, [token]);

    /**
     * 获取 Git 同步配置列表
     */
    const handleGitSyncList = useCallback(async (callback: (data: GitSyncConfigDTO[]) => void) => {
        try {
            const response = await fetch(addCacheBuster(`${env.API_URL}/api/git-sync/configs`), {
                method: "GET",
                headers: getHeaders(),
            });

            if (!response.ok) {
                throw new Error(t("api.git.list.error"));
            }

            const res = await response.json();
            if (res.code > 0 && res.code <= 200) {
                callback(res.data || []);
            } else {
                toast.error(res.message || t("api.git.list.error"));
            }
        } catch (error) {
            console.error("GitSyncList error:", error);
            toast.error(error instanceof Error ? error.message : t("api.git.list.error"));
        }
    }, [getHeaders, t]);

    /**
     * 更新或创建 Git 同步配置
     */
    const handleGitSyncUpdate = useCallback(async (config: GitSyncConfigRequest, callback: (res: GitSyncConfigDTO) => void) => {
        try {
            const response = await fetch(addCacheBuster(`${env.API_URL}/api/git-sync/config`), {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(config),
            });

            if (!response.ok) {
                throw new Error(t("api.git.save.error"));
            }

            const res = await response.json();
            if (res.code > 0 && res.code <= 200) {
                toast.success(res.message || t("api.git.save.success"));
                callback(res.data);
            } else {
                toast.error(res.message || t("api.git.save.error"));
            }
        } catch (error) {
            console.error("GitSyncUpdate error:", error);
            toast.error(error instanceof Error ? error.message : t("api.git.save.error"));
        }
    }, [getHeaders, t]);

    /**
     * 删除 Git 同步配置
     */
    const handleGitSyncDelete = useCallback(async (id: number, callback: () => void) => {
        try {
            const response = await fetch(addCacheBuster(`${env.API_URL}/api/git-sync/config?id=${id}`), {
                method: "DELETE",
                headers: getHeaders(false),
            });

            if (!response.ok) {
                throw new Error(t("api.git.delete.error"));
            }

            const res = await response.json();
            if (res.code > 0 && res.code <= 200) {
                toast.success(res.message || t("api.git.delete.success"));
                callback();
            } else {
                toast.error(res.message || t("api.git.delete.error"));
            }
        } catch (error) {
            console.error("GitSyncDelete error:", error);
            toast.error(error instanceof Error ? error.message : t("api.git.delete.error"));
        }
    }, [getHeaders, t]);

    /**
     * 清理 Git 工作区
     */
    const handleGitSyncClean = useCallback(async (id: number, callback: () => void) => {
        try {
            const response = await fetch(addCacheBuster(`${env.API_URL}/api/git-sync/config/clean?configId=${id}`), {
                method: "DELETE",
                headers: getHeaders(false),
            });

            if (!response.ok) {
                throw new Error(t("api.git.clean.error"));
            }

            const res = await response.json();
            if (res.code > 0 && res.code <= 200) {
                toast.success(res.message || t("api.git.clean.success"));
                callback();
            } else {
                toast.error(res.message || t("api.git.clean.error"));
            }
        } catch (error) {
            console.error("GitSyncClean error:", error);
            toast.error(error instanceof Error ? error.message : t("api.git.clean.error"));
        }
    }, [getHeaders, t]);

    /**
     * 获取 Git 同步历史记录
     * @param page      页码
     * @param pageSize  每页数量
     * @param configId  可选，指定 Git 配置 ID 时只返回该配置的历史
     * @param callback  回调，接收 { list, total }
     */
    const handleGitSyncHistories = useCallback(async (
        page: number,
        pageSize: number,
        configId: number | undefined,
        callback: (data: { list: GitSyncHistoryDTO[]; total: number }) => void
    ) => {
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
            });
            if (configId !== undefined) {
                params.set("configId", String(configId));
            }
            const response = await fetch(addCacheBuster(`${env.API_URL}/api/git-sync/histories?${params.toString()}`), {
                method: "GET",
                headers: getHeaders(false),
            });

            if (!response.ok) {
                throw new Error(t("api.git.history.error"));
            }

            const res = await response.json();
            if (res.code > 0 && res.code <= 200) {
                callback({
                    list: res.data?.list || [],
                    total: res.data?.total ?? -1,
                });
            } else {
                toast.error(res.message || t("api.git.history.error"));
            }
        } catch (error) {
            console.error("GitSyncHistories error:", error);
            toast.error(error instanceof Error ? error.message : t("api.git.history.error"));
        }
    }, [getHeaders, t]);

    /**
     * 验证 Git 同步参数
     * Validate git sync parameters
     */
    const handleGitSyncValidate = useCallback(async (params: GitSyncValidateRequest, callback: () => void) => {
        try {
            const response = await fetch(addCacheBuster(`${env.API_URL}/api/git-sync/validate`), {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                throw new Error(t("api.git.validate.error"));
            }

            const res = await response.json();
            if (res.code > 0 && res.code <= 200) {
                toast.success(t("api.git.validate.success"));
                callback();
            } else {
                const detail = res.details || res.message || "";
                toast.error(detail ? `${t("api.git.validate.error")}: ${detail}` : t("api.git.validate.error"));
            }
        } catch (error) {
            console.error("GitSyncValidate error:", error);
            toast.error(error instanceof Error ? error.message : t("api.git.validate.error"));
        }
    }, [getHeaders, t]);

    return useMemo(() => ({
        handleGitSyncList,
        handleGitSyncUpdate,
        handleGitSyncDelete,
        handleGitSyncClean,
        handleGitSyncHistories,
        handleGitSyncValidate,
    }), [
        handleGitSyncList,
        handleGitSyncUpdate,
        handleGitSyncDelete,
        handleGitSyncClean,
        handleGitSyncHistories,
        handleGitSyncValidate,
    ]);
}
