import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AutomationTrigger } from "@/lib/types/automation";
import { AutomationSettings } from "./automation-settings";

const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), run: vi.fn(), retry: vi.fn(), remove: vi.fn(), empty: (callback: (items: never[]) => void) => Promise.resolve(callback([])), t: (key: string) => key }));
vi.mock("@/components/api-handle/automation-handle", () => ({ useAutomationHandle: () => ({ handleAutomationList: mocks.list, handleAutomationSave: mocks.save, handleAutomationTrigger: mocks.run, handleAutomationExecutionRetry: mocks.retry, handleAutomationDelete: mocks.remove }) }));
vi.mock("@/components/api-handle/backup-handle", () => ({ useBackupHandle: () => ({ handleBackupConfigList: mocks.empty }) }));
vi.mock("@/components/api-handle/git-handle", () => ({ useGitHandle: () => ({ handleGitSyncList: mocks.empty }) }));
vi.mock("@/components/api-handle/vault-handle", () => ({ useVaultHandle: () => ({ handleVaultList: mocks.empty }) }));
vi.mock("@/components/api-handle/webhook-handle", () => ({ useWebhookHandle: () => ({ handleWebhookList: mocks.empty }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: mocks.t }) }));

const item: AutomationTrigger = { id: 7, uid: 1, name: "Rare rule", enabled: true, vaultId: 2, timezone: "UTC", matchMode: "any", events: [{ type: "manual" }], actions: [{ type: "backup", configId: 3 }] };
beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockImplementation(async (callback: (items: AutomationTrigger[]) => void) => callback([item]));
});
afterEach(cleanup);

it("shows the rule's own latest result even when it is old", async () => {
    mocks.list.mockImplementation(async (callback: (items: AutomationTrigger[]) => void) => callback([{
        ...item, latestExecution: { id: 1, uid: 1, triggerId: 7, vaultId: 2, eventType: "manual", eventId: "old", status: "failed", error: "old failure", actions: [] },
    }]));
    render(<AutomationSettings />);
    expect(await screen.findByText(/old failure/)).toBeInTheDocument();
    expect(screen.getByTitle("ui.automation.retry")).not.toBeDisabled();
});

it("prevents a second manual run while the first request is pending", async () => {
    let finish!: () => void;
    mocks.run.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    render(<AutomationSettings />);
    const run = await screen.findByTitle("ui.automation.run");
    fireEvent.click(run);
    fireEvent.click(run);
    expect(mocks.run).toHaveBeenCalledOnce();
    expect(run).toBeDisabled();
    await act(async () => finish());
    await waitFor(() => expect(run).not.toBeDisabled());
    expect(mocks.list).toHaveBeenCalledTimes(2);
});
