import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAutomationHandle } from "./automation-handle";

const mocks = vi.hoisted(() => ({ dialog: vi.fn(), success: vi.fn(), t: (key: string) => key }));
vi.mock("@/components/context/confirm-dialog-context", () => ({ useConfirmDialog: () => ({ openConfirmDialog: mocks.dialog }) }));
vi.mock("@/components/common/Toast", () => ({ toast: { success: mocks.success } }));
vi.mock("react-i18next", async (importOriginal) => ({ ...await importOriginal<typeof import("react-i18next")>(), useTranslation: () => ({ t: mocks.t }) }));
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

it("passes rule and page filters and reads the API pager", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 1, data: { list: [{ id: 31 }], pager: { totalRows: 41 } } }) });
    vi.stubGlobal("fetch", fetch);
    const { result } = renderHook(() => useAutomationHandle());
    await act(async () => {
        expect(await result.current.handleAutomationExecutionList(7, 2)).toEqual({ list: [{ id: 31 }], total: 41 });
    });
    expect(fetch.mock.calls[0][0]).toContain("triggerId=7&page=2&pageSize=20");
});

it("reports retry business errors without showing a success toast", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 10001, details: "already running" }) }));
    const { result } = renderHook(() => useAutomationHandle());
    await act(async () => result.current.handleAutomationExecutionRetry(4));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.dialog).toHaveBeenCalledWith(expect.stringContaining("already running"), "error");
});
