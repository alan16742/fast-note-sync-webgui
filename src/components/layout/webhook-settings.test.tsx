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

    const addHeader = (name: string, value: string, index: number) => {
        fireEvent.click(screen.getByText("ui.common.add"));
        fireEvent.change(screen.getByLabelText(`ui.settings.headerNamePlaceholder ${index}`), { target: { value: name } });
        fireEvent.change(screen.getByLabelText(`ui.settings.headerValuePlaceholder ${index}`), { target: { value } });
    };

    it("keeps channel settings independent from automation triggers", () => {
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.webhook.add"));
        expect(screen.queryByLabelText("ui.webhook.mode")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("ui.webhook.timezone")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("ui.webhook.pathPrefix")).not.toBeInTheDocument();
        expect(screen.getByLabelText("ui.webhook.titleTemplate")).toHaveValue("ui.webhook.defaultNoteTitleTemplate");
        expect(screen.getByLabelText("ui.webhook.bodyTemplate").parentElement).toHaveTextContent("ui.webhook.requestBodyHelp");
        expect(screen.queryByText("ui.webhook.templateHelp")).not.toBeInTheDocument();
        chooseProvider("Bark");
        expect(screen.getByLabelText("ui.webhook.endpoint")).toHaveValue("https://api.day.app");
        expect(screen.getByLabelText("ui.webhook.secret")).toBeRequired();
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
        expect(screen.getByLabelText("ui.webhook.secret")).not.toBeRequired();
        fireEvent.change(screen.getByLabelText("ui.webhook.secret"), { target: { value: "old-key" } });
        chooseProvider("Bark");
        expect(screen.getByLabelText("ui.webhook.secret")).toHaveValue("");
        expect(screen.getByLabelText("ui.webhook.secret")).toBeRequired();
    });

    it("shows method and headers for a custom webhook", () => {
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.webhook.add"));
        chooseProvider("Webhook");
        expect(screen.getByLabelText("ui.webhook.endpoint")).toBeRequired();
        expect(screen.getByLabelText("ui.webhook.endpoint").parentElement).toHaveTextContent("ui.webhook.endpointHelp");
        expect(screen.getByLabelText("ui.webhook.method")).toHaveTextContent("POST");
        expect(screen.queryByLabelText("ui.webhook.titleTemplate")).not.toBeInTheDocument();
        expect(screen.getByLabelText("ui.webhook.requestBody").parentElement).toHaveTextContent("ui.webhook.requestBodyHelp");
        expect(screen.queryByText("ui.webhook.templateHelp")).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("ui.webhook.requestBody"), { target: { value: '{"content":"{{content}}"}' } });
        addHeader("Authorization", "Bearer token", 1);
        addHeader("X-Source", "fast-note-sync", 2);
        expect(screen.getByLabelText("ui.settings.headerValuePlaceholder 1")).toHaveAttribute("type", "password");
        expect(screen.getByLabelText("ui.settings.headerValuePlaceholder 2")).toHaveAttribute("type", "text");
        expect(mocks.test).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText("ui.webhook.test"));
        expect(mocks.test).toHaveBeenCalledWith(expect.objectContaining({ provider: "custom", method: "POST", titleTemplate: "", bodyTemplate: '{"content":"{{content}}"}', headers: { Authorization: "Bearer token", "X-Source": "fast-note-sync" } }));
    });

    it("treats a pasted backslash-n as header text instead of a line break", () => {
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.webhook.add"));
        chooseProvider("Webhook");
        addHeader("X-Test", "one\\nX-Other: two", 1);
        fireEvent.click(screen.getByText("ui.webhook.test"));
        expect(mocks.test).toHaveBeenCalledWith(expect.objectContaining({ headers: { "X-Test": "one\\nX-Other: two" } }));
    });
    it("preserves, replaces and removes a saved sensitive header row", async () => {
        mocks.list.mockImplementation((callback: (items: unknown[]) => void) => callback([{
            id: 1, provider: "custom", url: "https://example.com", method: "POST",
            headers: { Authorization: "", "X-Source": "test" }, protectedHeaders: ["Authorization"],
            hasSecret: false, titleTemplate: "", bodyTemplate: "test",
        }]));
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.common.edit"));
        const value = screen.getByLabelText("ui.settings.headerValuePlaceholder 1");
        expect(value).toHaveValue("");
        expect(value).toHaveAttribute("placeholder", "ui.webhook.secretKeep");
        fireEvent.click(screen.getByText("ui.common.save"));
        expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ headers: { Authorization: "", "X-Source": "test" } }), expect.any(Function));
        // Finish the async save before interacting with the disabled fieldset.
        await vi.waitFor(() => expect(screen.getByText("ui.common.save")).not.toBeDisabled());
        fireEvent.change(value, { target: { value: "replacement" } });
        fireEvent.click(screen.getByText("ui.webhook.test"));
        expect(mocks.test).toHaveBeenLastCalledWith(expect.objectContaining({ headers: { Authorization: "replacement", "X-Source": "test" } }));
        await vi.waitFor(() => expect(screen.getByText("ui.webhook.test")).not.toBeDisabled());
        fireEvent.click(screen.getByLabelText("ui.common.delete 1"));
        fireEvent.click(screen.getByText("ui.common.save"));
        expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ headers: { "X-Source": "test" } }), expect.any(Function));
    });

    it("blocks duplicate names and unnamed values for both save and test", () => {
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.webhook.add"));
        chooseProvider("Webhook");
        fireEvent.change(screen.getByLabelText("ui.webhook.endpoint"), { target: { value: "https://example.com" } });
        addHeader("Authorization", "first", 1);
        addHeader("authorization", "second", 2);
        fireEvent.click(screen.getByText("ui.webhook.test"));
        fireEvent.click(screen.getByText("ui.common.save"));
        expect(mocks.test).not.toHaveBeenCalled();
        expect(mocks.save).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toHaveTextContent("ui.webhook.headersInvalid");
        fireEvent.change(screen.getByLabelText("ui.settings.headerNamePlaceholder 2"), { target: { value: "" } });
        fireEvent.click(screen.getByText("ui.webhook.test"));
        expect(mocks.test).not.toHaveBeenCalled();
    });

    it("keeps an intentionally empty custom request body when editing", () => {
        mocks.list.mockImplementation((callback: (items: unknown[]) => void) => callback([{
            id: 1, provider: "custom", url: "https://example.com", method: "POST",
            headers: {}, bodyTemplate: "", titleTemplate: "", hasSecret: false,
        }]));
        render(<WebhookSettings />);
        fireEvent.click(screen.getByTitle("ui.common.edit"));
        expect(screen.getByLabelText("ui.webhook.requestBody")).toHaveValue("");
        fireEvent.click(screen.getByText("ui.common.save"));
        expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ bodyTemplate: "" }), expect.any(Function));
    });

});
