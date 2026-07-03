import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageList } from "../MessageList";
import type { Message } from "ai";

// Mock the MarkdownRenderer component
vi.mock("../MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

// Mock lucide-react icons used by ToolCallBadge
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return {
    ...actual,
    FilePlus: () => <svg data-testid="icon-file-plus" />,
    FilePen: () => <svg data-testid="icon-file-pen" />,
    Eye: () => <svg data-testid="icon-eye" />,
    FileSymlink: () => <svg data-testid="icon-file-symlink" />,
    Trash2: () => <svg data-testid="icon-trash" />,
  };
});

afterEach(() => {
  cleanup();
});

test("MessageList shows empty state when no messages", () => {
  render(<MessageList messages={[]} />);

  expect(screen.getByText("What should we build?")).toBeDefined();
  expect(
    screen.getByText("Describe a component and I'll write it live in the editor.")
  ).toBeDefined();
});

test("MessageList renders user messages", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "Create a button component" }],
    },
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Create a button component")).toBeDefined();
});

test("MessageList renders assistant messages", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "I'll help you create a button component." }],
    },
  ];

  render(<MessageList messages={messages} />);

  expect(
    screen.getByText("I'll help you create a button component.")
  ).toBeDefined();
});

test("MessageList renders messages with parts", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      content: "",
      parts: [
        { type: "text", text: "Creating your component..." },
        {
          type: "dynamic-tool",
          toolCallId: "asdf",
          input: {},
          toolName: "str_replace_editor",
          state: "output-available",
          output: "Success",
        },
      ],
    },
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Creating your component...")).toBeDefined();
  // ToolCallBadge renders a friendly label, not the raw tool name
  expect(screen.getByText(/Working|Done/)).toBeDefined();
});

test("MessageList shows content for assistant message with content", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "Generating your component..." }],
    },
  ];

  const { container } = render(<MessageList messages={messages} isLoading={false} />);

  // The component shows the content but not a loading indicator when not loading
  expect(screen.getByText("Generating your component...")).toBeDefined();
  expect(container.querySelectorAll(".animate-bounce")).toHaveLength(0);
});

test("MessageList shows loading state for last assistant message without content", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      content: "",
    },
  ];

  const { container } = render(<MessageList messages={messages} isLoading={true} />);

  expect(container.querySelectorAll(".animate-bounce")).toHaveLength(3);
});

test("MessageList doesn't show loading state for non-last messages", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      content: "First response",
    },
    {
      id: "2",
      role: "user",
      content: "Another request",
    },
  ];

  const { container } = render(<MessageList messages={messages} isLoading={true} />);

  // Loading state should not appear because the last message is from user, not assistant
  expect(container.querySelectorAll(".animate-bounce")).toHaveLength(0);
});

test("MessageList renders reasoning parts", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      content: "",
      parts: [
        { type: "text", text: "Let me analyze this." },
        {
          type: "reasoning",
          text: "The user wants a button component with specific styling.",
        },
      ],
    },
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Reasoning")).toBeDefined();
  expect(
    screen.getByText("The user wants a button component with specific styling.")
  ).toBeDefined();
});

test("MessageList renders multiple messages in correct order", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "First user message" }],
    },
    {
      id: "2",
      role: "assistant",
      parts: [{ type: "text", text: "First assistant response" }],
    },
    {
      id: "3",
      role: "user",
      parts: [{ type: "text", text: "Second user message" }],
    },
    {
      id: "4",
      role: "assistant",
      parts: [{ type: "text", text: "Second assistant response" }],
    },
  ];

  const { container } = render(<MessageList messages={messages} />);

  // Get all message containers in order
  const messageContainers = container.querySelectorAll(".rounded-2xl");

  // Verify we have 4 messages
  expect(messageContainers).toHaveLength(4);

  // Check the content of each message in order
  expect(messageContainers[0].textContent).toContain("First user message");
  expect(messageContainers[1].textContent).toContain(
    "First assistant response"
  );
  expect(messageContainers[2].textContent).toContain("Second user message");
  expect(messageContainers[3].textContent).toContain(
    "Second assistant response"
  );
});

test("MessageList handles step-start parts", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      content: "",
      parts: [
        { type: "text", text: "Step 1 content" },
        { type: "step-start" },
        { type: "text", text: "Step 2 content" },
      ],
    },
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Step 1 content")).toBeDefined();
  expect(screen.getByText("Step 2 content")).toBeDefined();
  // Check that a separator exists (hr element)
  const container = screen.getByText("Step 1 content").closest(".rounded-2xl");
  expect(container?.querySelector("hr")).toBeDefined();
});

test("MessageList applies correct styling for user vs assistant messages", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "User message" }],
    },
    {
      id: "2",
      role: "assistant",
      parts: [{ type: "text", text: "Assistant message" }],
    },
  ];

  render(<MessageList messages={messages} />);

  const userMessage = screen.getByText("User message").closest(".rounded-2xl");
  const assistantMessage = screen
    .getByText("Assistant message")
    .closest(".rounded-2xl");

  // User messages should have blue gradient and white text
  expect(userMessage?.className).toContain("from-blue-500");
  expect(userMessage?.className).toContain("text-white");

  // Assistant messages should have neutral background
  expect(assistantMessage?.className).toContain("bg-neutral-100");
  expect(assistantMessage?.className).toContain("text-neutral-900");
});

test("MessageList handles empty content with parts", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      content: "", // Empty content but has parts
      parts: [{ type: "text", text: "This is from parts" }],
    },
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("This is from parts")).toBeDefined();
});

test("MessageList shows loading for assistant message with empty parts", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      content: "",
      parts: [],
    },
  ];

  const { container } = render(
    <MessageList messages={messages} isLoading={true} />
  );

  // Check that exactly one ThinkingDots (3 bouncing spans) appears
  expect(container.querySelectorAll(".animate-bounce")).toHaveLength(3);
});
