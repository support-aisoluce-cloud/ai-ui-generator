"use client";

import { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Sparkles } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolCallBadge } from "./ToolCallBadge";

interface MessageListProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1 text-neutral-400">
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
    </div>
  );
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white" />
        </div>
        <p className="text-neutral-900 font-semibold text-base mb-1.5">What should we build?</p>
        <p className="text-neutral-400 text-sm max-w-xs leading-relaxed">
          Describe a component and I&apos;ll write it live in the editor.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-6">
      <div className="space-y-4 max-w-4xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 items-end",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 mb-0.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            )}

            <div className={cn(
              "flex flex-col gap-1.5 max-w-[82%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20 rounded-br-sm"
                  : "bg-neutral-100 text-neutral-900 rounded-bl-sm"
              )}>
                {message.parts ? (
                  <>
                    {message.parts.map((part, partIndex) => {
                      switch (part.type) {
                        case "text":
                          return message.role === "user" ? (
                            <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>
                          ) : (
                            <MarkdownRenderer
                              key={partIndex}
                              content={part.text}
                              className="prose-sm"
                            />
                          );
                        case "reasoning":
                          return (
                            <div key={partIndex} className="mt-2 p-2.5 bg-white/60 rounded-xl border border-neutral-200/80">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">Reasoning</span>
                              <span className="text-xs text-neutral-600 leading-relaxed">{part.text}</span>
                            </div>
                          );
                        case "dynamic-tool":
                          return (
                            <ToolCallBadge key={partIndex} tool={part} />
                          );
                        case "source-url":
                          return (
                            <div key={partIndex} className="mt-2 text-xs text-neutral-400">
                              Source: {part.url}
                            </div>
                          );
                        case "step-start":
                          return partIndex > 0 ? <hr key={partIndex} className="my-3 border-neutral-200/70" /> : null;
                        default:
                          return null;
                      }
                    })}
                    {isLoading &&
                      message.role === "assistant" &&
                      messages.indexOf(message) === messages.length - 1 && (
                        <ThinkingDots />
                      )}
                  </>
                ) : isLoading &&
                  message.role === "assistant" &&
                  messages.indexOf(message) === messages.length - 1 ? (
                  <ThinkingDots />
                ) : null}
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 mb-0.5">
                <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center shadow-sm">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
