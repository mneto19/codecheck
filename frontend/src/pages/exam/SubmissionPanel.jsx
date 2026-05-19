import { Button } from "../../components/ui";

const STATUS_LABELS = {
  Accepted:              "Executado com sucesso",
  Queued:                "Na fila de execução...",
  "Runtime Error":       "Erro de execução",
  "Compilation Error":   "Erro de compilação",
  "Time Limit Exceeded": "Tempo limite excedido (> 5 s)",
  "Memory Limit Exceeded": "Memória excedida",
  Error:                 "Erro ao processar",
};

const STATUS_COLOR = {
  Accepted: "text-[#00c8ff]",
  Queued:   "text-ink-400",
};

function getOutput(r) {
  if (r.status === "Queued") return r.message || "A executar...";
  if (r.output)              return r.output;
  if (r.error)               return r.error;
  if (r.status === "Accepted") return "Código executado sem erros.\nAdiciona print() para ver resultados.";
  return "Sem output.";
}

export default function SubmissionPanel({ result, submitting, onSubmit, isFinished, hasCode, isLast, onLeave }) {
  const statusLabel = result ? (STATUS_LABELS[result.status] ?? result.status) : null;
  const statusColor = result ? (STATUS_COLOR[result.status] ?? "text-warn") : null;

  return (
    <div className="border-t border-ink-800 px-6 py-4 flex items-start gap-4 shrink-0 bg-ink-900">
      <div className="flex-1" role="region" aria-label="Output da execução" aria-live="polite">
        {result ? (
          <div>
            <p className="text-xs font-mono text-ink-400 uppercase tracking-widest mb-1">
              Output &middot;{" "}
              <span className={statusColor}>{statusLabel}</span>
            </p>
            <pre className="text-sm font-mono text-ink-200 whitespace-pre-wrap max-h-24 overflow-auto">
              {getOutput(result)}
            </pre>
          </div>
        ) : (
          <p className="text-ink-600 text-xs font-mono">
            Submete o código para ver o output. O teu progresso é guardado automaticamente.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onSubmit}
          loading={submitting}
          disabled={isFinished || !hasCode}
          aria-label={result ? "Resubmeter código" : "Submeter código"}
        >
          {result ? "Resubmeter" : "Submeter"}
        </Button>
        {isLast && (
          <Button
            variant="ghost"
            onClick={onLeave}
            disabled={submitting}
            aria-label="Terminar exame e sair"
          >
            Terminar e Sair
          </Button>
        )}
      </div>
    </div>
  );
}
