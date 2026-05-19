import { lazy, Suspense } from "react";
import { LANG_MAP } from "../../constants";

const Editor = lazy(() => import("@monaco-editor/react"));

export default function EditorPanel({ question, questionIndex, code, onChange, isFinished }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-ink-800 px-6 py-4 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-[#00c8ff] uppercase tracking-widest">
            Pergunta {questionIndex + 1}
          </span>
          <span className="text-xs font-mono text-ink-600">
            &middot; {question.language}
          </span>
        </div>
        <p className="text-ink-100 text-sm leading-relaxed font-body">
          {question.promptText}
        </p>
      </div>

      <div className="flex-1 overflow-hidden" role="region" aria-label="Editor de código">
        <Suspense fallback={<div className="flex-1 h-full bg-ink-900 animate-pulse" />}>
          <Editor
            height="100%"
            language={LANG_MAP[question.language] || "python"}
            value={code}
            onChange={(v) => onChange(v || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineHeight: 22,
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              readOnly: isFinished,
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
