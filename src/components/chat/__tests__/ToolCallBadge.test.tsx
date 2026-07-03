import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// str_replace_editor — create
test("shows 'Creating' with filename for str_replace_editor create command", () => {
  render(
    <ToolCallBadge
      tool={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        input: { command: "create", path: "/components/Button.jsx" },
        state: "input-available",
      }}
    />
  );

  expect(screen.getByText("Creating Button.jsx")).toBeDefined();
  expect(screen.getByText(/Working/)).toBeDefined();
});

// str_replace_editor — str_replace
test("shows 'Editing' with filename for str_replace_editor str_replace command", () => {
  render(
    <ToolCallBadge
      tool={{
        toolCallId: "2",
        toolName: "str_replace_editor",
        input: { command: "str_replace", path: "/components/Card.jsx" },
        state: "output-available",
        output: "Success",
      }}
    />
  );

  expect(screen.getByText("Editing Card.jsx")).toBeDefined();
  expect(screen.getByText(/Done/)).toBeDefined();
});

// str_replace_editor — insert
test("shows 'Editing' with filename for str_replace_editor insert command", () => {
  render(
    <ToolCallBadge
      tool={{
        toolCallId: "3",
        toolName: "str_replace_editor",
        input: { command: "insert", path: "/App.jsx" },
        state: "input-available",
      }}
    />
  );

  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

// str_replace_editor — view
test("shows 'Viewing' with filename for str_replace_editor view command", () => {
  render(
    <ToolCallBadge
      tool={{
        toolCallId: "4",
        toolName: "str_replace_editor",
        input: { command: "view", path: "/components/Form.tsx" },
        state: "input-available",
      }}
    />
  );

  expect(screen.getByText("Viewing Form.tsx")).toBeDefined();
});

// file_manager — rename
test("shows 'Renaming' with old and new filenames for file_manager rename command", () => {
  render(
    <ToolCallBadge
      tool={{
        toolCallId: "5",
        toolName: "file_manager",
        input: { command: "rename", path: "/components/Old.jsx", new_path: "/components/New.jsx" },
        state: "output-available",
        output: { success: true },
      }}
    />
  );

  expect(screen.getByText("Renaming Old.jsx → New.jsx")).toBeDefined();
  expect(screen.getByText(/Done/)).toBeDefined();
});

// file_manager — delete
test("shows 'Deleting' with filename for file_manager delete command", () => {
  render(
    <ToolCallBadge
      tool={{
        toolCallId: "6",
        toolName: "file_manager",
        input: { command: "delete", path: "/components/Unused.jsx" },
        state: "input-available",
      }}
    />
  );

  expect(screen.getByText("Deleting Unused.jsx")).toBeDefined();
  expect(screen.getByText(/Working/)).toBeDefined();
});

// in-progress state shows spinner label
test("shows 'Working' label when state is not result", () => {
  render(
    <ToolCallBadge
      tool={{
        toolCallId: "7",
        toolName: "str_replace_editor",
        input: { command: "create", path: "/index.tsx" },
        state: "input-available",
      }}
    />
  );

  expect(screen.getByText(/Working/)).toBeDefined();
});

// completed state shows done label
test("shows 'Done' label when state is result", () => {
  render(
    <ToolCallBadge
      tool={{
        toolCallId: "8",
        toolName: "str_replace_editor",
        input: { command: "create", path: "/index.tsx" },
        state: "output-available",
        output: "created",
      }}
    />
  );

  expect(screen.getByText(/Done/)).toBeDefined();
});

// falls back gracefully for unknown tool
test("falls back to tool name for unknown tools", () => {
  render(
    <ToolCallBadge
      tool={{
        toolCallId: "9",
        toolName: "unknown_tool",
        input: {},
        state: "output-available",
        output: null,
      }}
    />
  );

  expect(screen.getByText("unknown_tool")).toBeDefined();
});

// extracts filename from nested path
test("extracts just the filename from a deeply nested path", () => {
  render(
    <ToolCallBadge
      tool={{
        toolCallId: "10",
        toolName: "str_replace_editor",
        input: { command: "create", path: "/src/components/ui/Button.tsx" },
        state: "input-available",
      }}
    />
  );

  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
});
