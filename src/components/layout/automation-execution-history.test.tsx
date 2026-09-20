import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AutomationExecution, AutomationTrigger } from "@/lib/types/automation";
import { AutomationExecutionHistory } from "./automation-execution-history";

const mocks = vi.hoisted(() => ({ list: vi.fn(), retry: vi.fn(), t: (key: string) => key }));
vi.mock("@/components/api-handle/automation-handle", () => ({ useAutomationHandle: () => ({ handleAutomationExecutionList: mocks.list, handleAutomationExecutionRetry: mocks.retry }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: mocks.t }) }));

const trigger: AutomationTrigger = { id: 7, uid: 1, name: "Daily", enabled: true, vaultId: 2, timezone: "UTC", matchMode: "any", events: [], actions: [] };
const record = (id: number, status: AutomationExecution["status"] = "failed"): AutomationExecution => ({
    id, uid: 1, triggerId: 7, vaultId: 2, eventId: String(id), eventType: "manual", status,
    actions: [{ type: "webhook", configId: 3, status }],
});

describe("automation execution history", () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it("loads older pages within the selected rule", async () => {
        mocks.list.mockImplementation(async (_id: number, page: number) => ({ list: [record(page === 1 ? 40 : 20)], total: 40 }));
        render(<AutomationExecutionHistory trigger={trigger} onClose={vi.fn()} onChanged={vi.fn()} />);
        expect(await screen.findByText("#40 · ui.automation.executionStatus.failed")).toBeInTheDocument();
        fireEvent.click(screen.getByText("ui.common.next"));
        expect(await screen.findByText("#20 · ui.automation.executionStatus.failed")).toBeInTheDocument();
        expect(mocks.list).toHaveBeenLastCalledWith(7, 2);
        expect(screen.getByText("ui.common.next")).toBeDisabled();
    });

    it("prevents duplicate retries and refreshes even when the retry fails", async () => {
        mocks.list.mockResolvedValue({ list: [record(12)], total: 1 });
        let finish!: () => void;
        mocks.retry.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
        const changed = vi.fn().mockResolvedValue(undefined);
        render(<AutomationExecutionHistory trigger={trigger} onClose={vi.fn()} onChanged={changed} />);
        const retry = await screen.findByText("ui.automation.retry");
        fireEvent.click(retry);
        fireEvent.click(retry);
        expect(mocks.retry).toHaveBeenCalledOnce();
        expect(retry).toBeDisabled();
        mocks.list.mockResolvedValue({ list: [{ ...record(12), error: "retry failed again" }], total: 1 });
        await act(async () => finish());
        expect(await screen.findByText("retry failed again")).toBeInTheDocument();
        expect(changed).toHaveBeenCalledOnce();
    });

    it("ignores a late result after changing rules", async () => {
        let finish!: (value: { list: AutomationExecution[]; total: number }) => void;
        mocks.list.mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValue({ list: [record(90)], total: 1 });
        const props = { onClose: vi.fn(), onChanged: vi.fn() };
        const view = render(<AutomationExecutionHistory trigger={trigger} {...props} />);
        view.rerender(<AutomationExecutionHistory trigger={{ ...trigger, id: 8 }} {...props} />);
        expect(await screen.findByText("#90 · ui.automation.executionStatus.failed")).toBeInTheDocument();
        await act(async () => finish({ list: [record(1)], total: 1 }));
        await waitFor(() => expect(screen.queryByText("#1 · ui.automation.executionStatus.failed")).not.toBeInTheDocument());
    });
});
