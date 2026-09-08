import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebhookSubscription } from "@/lib/types/webhook";
import { WebhookSettings } from "./webhook-settings";

const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), remove: vi.fn(), test: vi.fn(), t: (key: string) => key }));
vi.mock("@/components/api-handle/webhook-handle", () => ({ useWebhookHandle: () => ({ handleWebhookList: mocks.list, handleWebhookSave: mocks.save, handleWebhookDelete: mocks.remove, handleWebhookTest: mocks.test }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: mocks.t }) }));

describe("notification settings", () => {
    beforeEach(() => { vi.clearAllMocks(); mocks.list.mockImplementation((callback: (items: WebhookSubscription[]) => void) => callback([])); });
    afterEach(cleanup);

    it("defaults new channels to task reminders and uses the Bark default URL", () => {
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.webhook.add"));
        expect(screen.getByLabelText("ui.webhook.mode")).toHaveValue("reminder");
        expect(screen.getByLabelText("ui.webhook.timezone")).toHaveValue("Asia/Shanghai");
        expect(screen.getByText("ui.webhook.reminderExample")).toBeInTheDocument();
        expect(screen.getByText("ui.webhook.reminderDetails")).toBeInTheDocument();
        expect(screen.getByLabelText("ui.webhook.pathPrefix")).toHaveAttribute("placeholder", "ui.webhook.pathPrefixPlaceholder");
        expect(screen.getByLabelText("ui.webhook.pathGlob")).toHaveAttribute("placeholder", "ui.webhook.pathGlobPlaceholder");
        fireEvent.change(screen.getByLabelText("ui.webhook.provider"), { target: { value: "bark" } });
        expect(screen.getByLabelText("ui.webhook.endpoint")).toHaveValue("https://api.day.app");
        expect(screen.getByLabelText("ui.webhook.deviceKey")).toBeRequired();
        fireEvent.click(screen.getByText("ui.webhook.test"));
        expect(mocks.test).toHaveBeenCalledWith(expect.objectContaining({ provider: "bark", mode: "reminder" }));
    });

    it("requires a replacement key when an existing channel changes provider", () => {
        mocks.list.mockImplementation((callback: (items: unknown[]) => void) => callback([{
            id: 1, provider: "serverchan", mode: "reminder", timezone: "UTC", enabled: true,
            hasSecret: true, url: "", actions: [], pathPrefix: "", pathGlob: "", bodySubstring: "",
        }]));
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.common.edit"));
        expect(screen.getByLabelText("ui.webhook.sendKey")).not.toBeRequired();
        fireEvent.change(screen.getByLabelText("ui.webhook.sendKey"), { target: { value: "old-key" } });
        fireEvent.change(screen.getByLabelText("ui.webhook.provider"), { target: { value: "bark" } });
        expect(screen.getByLabelText("ui.webhook.deviceKey")).toHaveValue("");
        expect(screen.getByLabelText("ui.webhook.deviceKey")).toBeRequired();
    });

    it("shows method and headers for a custom webhook", () => {
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.webhook.add"));
        fireEvent.change(screen.getByLabelText("ui.webhook.provider"), { target: { value: "custom" } });
        expect(screen.getByLabelText("ui.webhook.customEndpoint")).toBeRequired();
        expect(screen.getByLabelText("ui.webhook.method")).toHaveValue("POST");
        fireEvent.change(screen.getByLabelText("ui.webhook.headers"), { target: { value: "Authorization: Bearer token" } });
        expect(mocks.test).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText("ui.webhook.test"));
        expect(mocks.test).toHaveBeenCalledWith(expect.objectContaining({ provider: "custom", method: "POST", headers: { Authorization: "Bearer token" } }));
    });
});
