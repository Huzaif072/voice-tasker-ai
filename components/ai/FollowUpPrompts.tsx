"use client";

interface FollowUpPromptsProps {
  prompts: string[];
  onSelect?: (prompt: string) => void;
}

export function FollowUpPrompts({ prompts, onSelect }: FollowUpPromptsProps) {
  if (prompts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect?.(prompt)}
          className="rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300 transition-colors hover:bg-violet-500/20"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
