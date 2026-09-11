import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebhookSubscriptionRequest } from "@/lib/types/webhook";
import { useWebhookHandle } from "./webhook-handle";

const mocks = vi.hoisted(() => ({ dialog: vi.fn(), success: vi.fn(), t: (key: string) => key }));
vi.mock("@/components/context/confirm-dialog-context", () => ({ useConfirmDialog: () => ({ openConfirmDialog: mocks.dialog }) }));
vi.mock("@/components/common/Toast", () => ({ toast: { success: mocks.success } }));
vi.mock("react-i18next", async (importOriginal) => ({ ...await importOriginal<typeof import("react-i18next")>(), useTranslation: () => ({ t: mocks.t }) }));

const request: WebhookSubscriptionRequest = {
    provider: "bark", url: "", method: "POST", headers: {}, secret: "key",
    titleTemplate: "{{task}}", bodyTemplate: "{{content}}",
};

describe("notification API handling", () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.unstubAllGlobals());

    it("keeps the editor open and reports positive business error codes", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 10001, message: "Invalid parameters", details: ["invalid template"] }) }));
        const callback = vi.fn();
        const { result } = renderHook(() => useWebhookHandle());
        await act(async () => result.current.handleWebhookSave(request, callback));
        expect(callback).not.toHaveBeenCalled();
        expect(mocks.success).not.toHaveBeenCalled();
        expect(mocks.dialog).toHaveBeenCalledWith(expect.stringContaining("invalid template"), "error");
    });

    it("sends channel configuration and only closes after success", async () => {
        const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 1, data: { ...request, id: 1 } }) });
        vi.stubGlobal("fetch", fetch);
        const callback = vi.fn();
        const { result } = renderHook(() => useWebhookHandle());
        await act(async () => result.current.handleWebhookSave(request, callback));
        expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ provider: "bark", secret: "key", titleTemplate: "{{task}}" });
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
        expect(mocks.success).toHaveBeenCalledOnce();
    });

    it("normalizes incomplete subscription responses", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 1, data: [{ id: 1, actions: null }] }) }));
        const callback = vi.fn();
        const { result } = renderHook(() => useWebhookHandle());
        await act(async () => result.current.handleWebhookList(callback));
        expect(callback).toHaveBeenCalledWith([expect.objectContaining({ method: "POST", headers: {}, titleTemplate: "", bodyTemplate: "" })]);
    });

    it("sends a test request for a saved channel", async () => {
        const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 1, message: "sent" }) });
        vi.stubGlobal("fetch", fetch);
        const { result } = renderHook(() => useWebhookHandle());
        await act(async () => result.current.handleWebhookTest(7));
        expect(fetch.mock.calls[0][0]).toContain("/api/webhooks/test");
        expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ id: 7 });
        expect(mocks.success).toHaveBeenCalledOnce();
    });
});
