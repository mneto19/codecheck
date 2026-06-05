export function Button({ children, variant = "primary", loading, className = "", ...props }) {
  const base = "font-mono text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2";
  const variants = {
    primary: "btn-grad active:scale-95",
    ghost: "bg-ink-700 text-ink-100 hover:bg-ink-600 active:scale-95",
    danger: "bg-danger text-white hover:opacity-90 active:scale-95",
    outline: "border border-ink-600 text-ink-200 hover:border-[#00c8ff] hover:text-[#00c8ff] active:scale-95",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function Input({ label, error, className = "", ...props }) {
  const inputId = label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : props.id;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-mono text-ink-300 uppercase tracking-widest">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`bg-ink-800 border border-ink-600 rounded-lg px-4 py-2.5 text-ink-100 font-mono text-sm
          placeholder:text-ink-500 focus:outline-none focus:border-[#00c8ff] transition-colors
          ${error ? "border-danger" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger font-mono">{error}</p>}
    </div>
  );
}

export function Card({ children, className = "", ...props }) {
  return (
    <div className={`bg-ink-800 border border-ink-700 rounded-xl p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Badge({ children, color = "default" }) {
  const colors = {
    default: "bg-ink-700 text-ink-200",
    green: "bg-[#00c8ff]/15 text-[#00c8ff] border border-[#00c8ff]/30",
    orange: "bg-warn/15 text-warn border border-warn/30",
    red: "bg-danger/15 text-danger border border-danger/30",
    blue: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  };
  return (
    <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${colors[color]}`}>
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <svg className="animate-spin h-8 w-8 text-[#00c8ff]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  );
}

export function ScoreRing({ score }) {
  const r = 28;
  const circ = 2 * Math.PI * r;

  if (score === null || score === undefined) {
    return (
      <div className="flex flex-col items-center gap-1 shrink-0">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#21212d" strokeWidth="6" />
          <text x="36" y="41" textAnchor="middle" fill="#555570" fontSize="14" fontFamily="JetBrains Mono" fontWeight="700">
            —
          </text>
        </svg>
        <span className="text-xs text-ink-400 font-mono">/ 100</span>
      </div>
    );
  }

  const color = score >= 80 ? "#00c8ff" : score >= 50 ? "#ff6b35" : "#ff3355";
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#21212d" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x="36" y="41" textAnchor="middle" fill={color} fontSize="14" fontFamily="JetBrains Mono" fontWeight="700">
          {score}
        </text>
      </svg>
      <span className="text-xs text-ink-400 font-mono">/ 100</span>
    </div>
  );
}
