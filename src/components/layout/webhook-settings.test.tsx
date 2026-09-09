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

    const chooseProvider = (providerKey: string) => {
        fireEvent.click(screen.getByLabelText("ui.webhook.provider"));
        const options = screen.getAllByText(providerKey);
        fireEvent.click(options[options.length - 1]);
    };

    it("keeps channel settings independent from automation triggers", () => {
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.webhook.add"));
        expect(screen.queryByLabelText("ui.webhook.mode")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("ui.webhook.timezone")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("ui.webhook.pathPrefix")).not.toBeInTheDocument();
        expect(screen.getByLabelText("ui.webhook.titleTemplate")).toHaveValue("ui.webhook.defaultNoteTitleTemplate");
        chooseProvider("ui.webhook.providerBark");
        expect(screen.getByLabelText("ui.webhook.endpoint")).toHaveValue("https://api.day.app");
        expect(screen.getByLabelText("ui.webhook.deviceKey")).toBeRequired();
        fireEvent.click(screen.getByText("ui.webhook.test"));
        expect(mocks.test).toHaveBeenCalledWith(expect.objectContaining({ provider: "bark" }));
    });

    it("requires a replacement key when an existing channel changes provider", () => {
        mocks.list.mockImplementation((callback: (items: unknown[]) => void) => callback([{
            id: 1, provider: "serverchan",
            hasSecret: true, url: "", titleTemplate: "", bodyTemplate: "",
        }]));
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.common.edit"));
        expect(screen.getByLabelText("ui.webhook.sendKey")).not.toBeRequired();
        fireEvent.change(screen.getByLabelText("ui.webhook.sendKey"), { target: { value: "old-key" } });
        chooseProvider("ui.webhook.providerBark");
        expect(screen.getByLabelText("ui.webhook.deviceKey")).toHaveValue("");
        expect(screen.getByLabelText("ui.webhook.deviceKey")).toBeRequired();
    });

    it("shows method and headers for a custom webhook", () => {
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.webhook.add"));
        chooseProvider("ui.webhook.providerCustom");
        expect(screen.getByLabelText("ui.webhook.customEndpoint")).toBeRequired();
        expect(screen.getByLabelText("ui.webhook.method")).toHaveTextContent("ui.webhook.methodPost");
        fireEvent.change(screen.getByLabelText("ui.webhook.headers"), { target: { value: "Authorization: Bearer token\nX-Source: fast-note-sync" } });
        expect(mocks.test).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText("ui.webhook.test"));
        expect(mocks.test).toHaveBeenCalledWith(expect.objectContaining({ provider: "custom", method: "POST", headers: { Authorization: "Bearer token", "X-Source": "fast-note-sync" } }));
    });

    it("treats a pasted backslash-n as header text instead of a line break", () => {
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.webhook.add"));
        chooseProvider("ui.webhook.providerCustom");
        fireEvent.change(screen.getByLabelText("ui.webhook.headers"), { target: { value: "X-Test: one\\nX-Other: two" } });
        fireEvent.click(screen.getByText("ui.webhook.test"));
        expect(mocks.test).toHaveBeenCalledWith(expect.objectContaining({ headers: { "X-Test": "one\\nX-Other: two" } }));
    });
});
