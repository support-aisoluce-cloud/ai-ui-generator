import { Loader2, FilePlus, FilePen, Eye, FileSymlink, Trash2 } from "lucide-react";

interface DynamicToolPart {
  toolCallId: string;
  toolName: string;
  input: unknown;
  state: string;
}

interface ToolCallBadgeProps {
  tool: DynamicToolPart;
}

function getFileName(path: string | undefined): string {
  if (!path) return "file";
  return path.split("/").filter(Boolean).pop() || path;
}

function getToolLabel(tool: DynamicToolPart): { icon: React.ReactNode; text: string } {
  const { toolName } = tool;
  const args = tool.input as Record<string, any> | undefined;

  if (toolName === "str_replace_editor") {
    const filename = getFileName(args?.path);
    switch (args?.command) {
      case "create":
        return { icon: <FilePlus className="w-3 h-3" />, text: `Creating ${filename}` };
      case "str_replace":
      case "insert":
        return { icon: <FilePen className="w-3 h-3" />, text: `Editing ${filename}` };
      case "view":
        return { icon: <Eye className="w-3 h-3" />, text: `Viewing ${filename}` };
      default:
        return { icon: <FilePen className="w-3 h-3" />, text: `Editing ${filename}` };
    }
  }

  if (toolName === "file_manager") {
    if (args?.command === "rename") {
      const oldName = getFileName(args?.path);
      const newName = getFileName(args?.new_path);
      return { icon: <FileSymlink className="w-3 h-3" />, text: `Renaming ${oldName} → ${newName}` };
    }
    if (args?.command === "delete") {
      return { icon: <Trash2 className="w-3 h-3" />, text: `Deleting ${getFileName(args?.path)}` };
    }
  }

  return { icon: <FilePen className="w-3 h-3" />, text: toolName };
}

export function ToolCallBadge({ tool }: ToolCallBadgeProps) {
  const isDone = tool.state === "output-available";
  const { icon, text } = getToolLabel(tool);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0" />
      )}
      <span className="text-neutral-500 flex-shrink-0">{isDone ? "Done" : "Working"} —</span>
      <span className="text-neutral-700 flex items-center gap-1.5">
        {icon}
        {text}
      </span>
    </div>
  );
}
