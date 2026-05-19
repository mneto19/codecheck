export default function QuestionNav({ questions, results, activeQuestion, setActiveQuestion }) {
  return (
    <nav aria-label="Navegação de questões" className="w-48 border-r border-ink-800 flex flex-col p-3 gap-1 shrink-0">
      <p className="text-xs font-mono text-ink-500 uppercase tracking-widest px-2 mb-2">
        Perguntas
      </p>
      {questions.map((q, i) => {
        const submitted = !!results[q.id];
        const isActive = activeQuestion === i;
        return (
          <button
            key={q.id}
            onClick={() => setActiveQuestion(i)}
            aria-label={`Pergunta ${i + 1}${submitted ? " (submetida)" : ""}`}
            aria-current={isActive ? "true" : undefined}
            className={`text-left px-3 py-2.5 rounded-lg text-sm font-mono transition-all flex items-center justify-between
              ${isActive
                ? "bg-[#00c8ff]/10 text-[#00c8ff] border border-[#00c8ff]/30"
                : "text-ink-400 hover:text-ink-200 hover:bg-ink-800"}`}
          >
            <span>Pergunta {i + 1}</span>
            {submitted && <span className="w-2 h-2 rounded-full bg-[#00c8ff] shrink-0" aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
}
