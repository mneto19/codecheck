import { Badge, Button } from "../../components/ui";

export default function ExamHeader({ room, student, connected, isWaiting, isFinished, formatted, timerColor, onLeave }) {
  return (
    <header className="border-b border-ink-800 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-display font-bold text-white">
          Code<span className="text-[#00c8ff]">Check</span>
        </span>
        <span className="text-ink-700">|</span>
        <span className="font-mono text-sm text-ink-300">{room.name}</span>
        {!connected && !isFinished && (
          <span role="status" aria-live="polite" className="text-xs font-mono text-warn flex items-center gap-1.5 bg-warn/10 px-2 py-1 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" />
            A reconectar...
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono text-sm text-ink-400">{student.nickname}</span>
        {isWaiting ? (
          <Badge color="blue">A aguardar início...</Badge>
        ) : isFinished ? (
          <Badge color="default">Exame terminado</Badge>
        ) : (
          <span aria-label={`Tempo restante: ${formatted}`} className={`font-mono text-2xl font-bold tabular-nums ${timerColor}`}>
            {formatted}
          </span>
        )}
        <Button variant="ghost" onClick={onLeave} aria-label="Sair do exame">Sair</Button>
      </div>
    </header>
  );
}
