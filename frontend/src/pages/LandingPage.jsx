import { useNavigate } from 'react-router-dom';

// ─── Brand gradient helpers ───────────────────────────────────────────────────
const GRAD = 'linear-gradient(135deg, #00c8ff 0%, #a855f7 100%)';
const GSTYLE = {
  background: GRAD,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0c0cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: 'Editor Monaco integrado',
    desc: 'Ambiente de código real com syntax highlighting e autocompleção — o mesmo motor do VS Code.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0c0cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: 'Execução em tempo real',
    desc: 'Código compilado e executado instantaneamente via JDoodle. Suporta Python, Java, C/C++ e mais.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0c0cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Avaliação por IA',
    desc: 'Groq analisa cada submissão, gera feedback detalhado e atribui uma pontuação justa automaticamente.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0c0cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: 'Resultados instantâneos',
    desc: 'O professor vê os scores, o código e o feedback de cada aluno em tempo real, numa dashboard clara.',
  },
];

const PROF_STEPS = [
  { n: '01', t: 'Cria uma sala', d: 'Define nome, duração e linguagem do exame em segundos.' },
  { n: '02', t: 'Adiciona questões', d: 'Escreve o enunciado e o código de referência no editor Monaco.' },
  { n: '03', t: 'Inicia e monitoriza', d: 'Vê as submissões dos alunos em tempo real e exporta os resultados.' },
];

const STUD_STEPS = [
  { n: '01', t: 'Entra com o código', d: 'O professor partilha um código de 6 letras. Sem conta necessária.' },
  { n: '02', t: 'Escreve a solução', d: 'Usa o editor Monaco para resolver as questões do exame.' },
  { n: '03', t: 'Recebe feedback', d: 'A IA avalia o código e mostra o score e sugestões de melhoria.' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function GradText({ children, className = '' }) {
  return <span className={className} style={GSTYLE}>{children}</span>;
}

function Stat({ value, label }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 px-8 py-2">
      <span className="text-2xl font-extrabold font-display" style={GSTYLE}>{value}</span>
      <span className="text-xs text-ink-400 font-mono">{label}</span>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-6 rounded-xl border border-ink-700 bg-ink-900 hover:border-ink-600 transition-all duration-200 group">
      <div
        className="mb-4 w-10 h-10 flex items-center justify-center rounded-lg"
        style={{
          background: 'rgba(0,200,255,0.07)',
          border: '1px solid rgba(0,200,255,0.18)',
        }}
      >
        {icon}
      </div>
      <h3 className="font-semibold mb-2 text-ink-100 text-sm">{title}</h3>
      <p className="text-sm text-ink-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ n, t, d }) {
  return (
    <div className="flex gap-4">
      <span className="font-mono text-2xl font-extrabold shrink-0 leading-none" style={GSTYLE}>{n}</span>
      <div>
        <p className="font-semibold text-ink-100 mb-1 text-sm">{t}</p>
        <p className="text-sm text-ink-400 leading-relaxed">{d}</p>
      </div>
    </div>
  );
}

// ─── Terminal mockup ──────────────────────────────────────────────────────────

function Terminal() {
  return (
    <div
      className="relative rounded-xl overflow-hidden border border-ink-700 text-left"
      style={{ background: '#0a0a14' }}
    >
      {/* Traffic lights + filename */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-800">
        <div className="w-3 h-3 rounded-full" style={{ background: '#ff3355', opacity: 0.7 }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#ff6b35', opacity: 0.7 }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#00ff87', opacity: 0.7 }} />
        <span className="ml-3 font-mono text-xs text-ink-500">solution.py</span>
      </div>

      {/* Code */}
      <div className="px-5 py-4 font-mono text-sm select-none space-y-0.5">
        <CodeLine delay={0.4} lnum="1">
          <Tok c="#00c8ff">def </Tok>
          <Tok c="#a855f7">calcular_media</Tok>
          <Tok c="#e4e4ed">(notas):</Tok>
        </CodeLine>
        <CodeLine delay={0.6} lnum="2">
          <Tok c="#e4e4ed">{'    '}soma </Tok>
          <Tok c="#909099">= </Tok>
          <Tok c="#a855f7">sum</Tok>
          <Tok c="#e4e4ed">(notas)</Tok>
        </CodeLine>
        <CodeLine delay={0.8} lnum="3">
          <Tok c="#00c8ff">{'    '}return </Tok>
          <Tok c="#e4e4ed">soma </Tok>
          <Tok c="#909099">/ </Tok>
          <Tok c="#a855f7">len</Tok>
          <Tok c="#e4e4ed">(notas)</Tok>
        </CodeLine>
        <CodeLine delay={1.0} lnum="4">{' '}</CodeLine>
        <CodeLine delay={1.1} lnum="5">
          <Tok c="#e4e4ed">notas </Tok>
          <Tok c="#909099">= [</Tok>
          <Tok c="#ff6b35">85, 92, 78, 96</Tok>
          <Tok c="#909099">]</Tok>
        </CodeLine>
        <CodeLine delay={1.3} lnum="6">
          <Tok c="#a855f7">print</Tok>
          <Tok c="#e4e4ed">(calcular_media(notas))</Tok>
        </CodeLine>

        {/* Output divider */}
        <div
          className="border-t border-ink-800 my-3"
          style={{ animation: 'lineIn 0.3s ease both', animationDelay: '1.6s', opacity: 0 }}
        />

        {/* Output lines */}
        <OutLine delay={1.7} icon="▶" color="#45455a" text="A executar..." />
        <OutLine delay={2.1} icon="✓" color="#00c8ff" text="Output: 87.75" />
        <OutLine delay={2.5} icon="◆" color="#a855f7" text="Score IA: 94 / 100" />
      </div>
    </div>
  );
}

function CodeLine({ children, delay, lnum }) {
  return (
    <div
      style={{
        animation: 'lineIn 0.35s ease both',
        animationDelay: `${delay}s`,
        opacity: 0,
        lineHeight: '1.75',
      }}
    >
      <span style={{ color: '#2e2e3d', userSelect: 'none', marginRight: '1rem', fontSize: '0.7rem' }}>
        {lnum}
      </span>
      {children}
    </div>
  );
}

function Tok({ children, c }) {
  return <span style={{ color: c }}>{children}</span>;
}

function OutLine({ delay, icon, color, text }) {
  return (
    <div
      className="flex items-center gap-2 text-xs"
      style={{ animation: 'lineIn 0.35s ease both', animationDelay: `${delay}s`, opacity: 0 }}
    >
      <span style={{ color }}>{icon}</span>
      <span style={{ color }}>{text}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 overflow-x-hidden">
      <style>{`
        @keyframes lineIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes glowDrift {
          0%, 100% { opacity: 0.4; transform: translateY(0);    }
          50%       { opacity: 0.65; transform: translateY(-14px); }
        }
        html { scroll-behavior: smooth; }
        .anim-up   { animation: fadeUp 0.7s ease both; opacity: 0; }
        .anim-glow { animation: glowDrift 5s ease-in-out infinite; }
        .grad-pill {
          background:
            linear-gradient(#0f0f18, #0f0f18) padding-box,
            linear-gradient(135deg, #00c8ff, #a855f7) border-box;
          border: 1px solid transparent;
        }
        .grad-card-hover:hover {
          box-shadow: 0 0 0 1px rgba(0,200,255,0.25), 0 4px 24px rgba(168,85,247,0.08);
        }
      `}</style>

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-ink-800"
        style={{ background: 'rgba(8,8,14,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2"
          >
            <span className="font-mono text-lg font-bold" style={GSTYLE}>{'{✓}'}</span>
            <span className="font-bold text-sm" style={GSTYLE}>CodeCheck</span>
          </button>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-ink-400">
            <a href="#funcionalidades" className="hover:text-ink-100 transition-colors">Funcionalidades</a>
            <a href="#como-funciona" className="hover:text-ink-100 transition-colors">Como funciona</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:block px-4 py-2 text-sm text-ink-400 hover:text-ink-100 transition-colors rounded-lg border border-ink-700 hover:border-ink-500"
            >
              Professor
            </button>
            <button
              onClick={() => navigate('/join')}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all hover:brightness-90"
              style={{ background: GRAD, color: '#08080e' }}
            >
              Entrar no Exame
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-28 px-6 overflow-hidden">
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #21212d 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Radial fade from center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(8,8,14,0) 0%, #08080e 100%)',
          }}
        />

        {/* Glow orbs */}
        <div
          className="anim-glow absolute top-1/3 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,200,255,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />
        <div
          className="anim-glow absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', filter: 'blur(40px)', animationDelay: '-2.5s' }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
          {/* Pill */}
          <div
            className="anim-up grad-pill inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono text-ink-400"
            style={{ animationDelay: '0.05s', background: 'rgba(10,10,20,0.9)' }}
          >
            <GradText>&lt;/&gt;</GradText>
            Avaliação por IA · Execução em tempo real · Multi-linguagem
          </div>

          {/* Headline */}
          <h1
            className="anim-up font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.18] tracking-tight"
            style={{ animationDelay: '0.2s' }}
          >
            Avaliação de código,
            <br />
            <GradText>reinventada.</GradText>
          </h1>

          {/* Subtitle */}
          <p
            className="anim-up max-w-xl text-base sm:text-lg text-ink-400 font-body leading-relaxed"
            style={{ animationDelay: '0.35s' }}
          >
            Plataforma de exames de programação com editor Monaco, execução em tempo real e avaliação automática por IA. Para professores que valorizam o seu tempo.
          </p>

          {/* CTAs */}
          <div
            className="anim-up flex flex-col sm:flex-row gap-3 mt-1"
            style={{ animationDelay: '0.5s' }}
          >
            <button
              onClick={() => navigate('/login')}
              className="px-7 py-3.5 rounded-lg text-sm font-semibold transition-all hover:brightness-90"
              style={{ background: GRAD, color: '#08080e' }}
            >
              Começar como Professor
            </button>
            <button
              onClick={() => navigate('/join')}
              className="px-7 py-3.5 rounded-lg text-sm font-semibold text-ink-100 border border-ink-600 hover:border-ink-500 hover:bg-ink-800 transition-all"
            >
              Entrar num Exame →
            </button>
          </div>

          {/* Terminal */}
          <div
            className="anim-up relative mt-8 w-full max-w-xl"
            style={{ animationDelay: '0.65s' }}
          >
            {/* Glow halo */}
            <div
              className="absolute -inset-4 rounded-3xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(0,200,255,0.12), rgba(168,85,247,0.12))',
                filter: 'blur(20px)',
              }}
            />
            <Terminal />
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div className="border-y border-ink-800 bg-ink-900">
        <div className="max-w-4xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-center">
          <Stat value="&lt; 3s" label="Execução de código" />
          <div className="hidden sm:block w-px h-8 bg-ink-700" />
          <Stat value="IA" label="Avaliação automática" />
          <div className="hidden sm:block w-px h-8 bg-ink-700" />
          <Stat value="10+" label="Linguagens suportadas" />
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="funcionalidades" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-ink-500 uppercase tracking-widest mb-5">Funcionalidades</p>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold leading-[1.2]">
              Tudo o que precisas,
              <br />
              <GradText>sem fricção.</GradText>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-6 bg-ink-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-ink-500 uppercase tracking-widest mb-5">Como funciona</p>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold leading-[1.2]">
              Simples para todos,
              <br />
              <GradText>poderoso para professores.</GradText>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Professor */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(0,200,255,0.15)', color: '#00c8ff' }}
                >P</div>
                <span className="font-mono text-xs uppercase tracking-widest text-ink-400">Professor</span>
              </div>
              <div className="space-y-7">
                {PROF_STEPS.map((s, i) => <Step key={i} {...s} />)}
              </div>
            </div>
            {/* Aluno */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}
                >A</div>
                <span className="font-mono text-xs uppercase tracking-widest text-ink-400">Aluno</span>
              </div>
              <div className="space-y-7">
                {STUD_STEPS.map((s, i) => <Step key={i} {...s} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(168,85,247,0.06) 0%, transparent 70%)' }}
        />
        <div className="relative z-10 max-w-xl mx-auto text-center flex flex-col items-center gap-5">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold leading-[1.2]">
            Pronto para começar?
          </h2>
          <p className="text-ink-400 text-base">
            Cria a tua primeira sala de exame em menos de um minuto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-lg font-semibold text-sm transition-all hover:brightness-90"
              style={{ background: GRAD, color: '#08080e' }}
            >
              Criar conta gratuita
            </button>
            <button
              onClick={() => navigate('/join')}
              className="px-8 py-4 rounded-lg font-semibold text-sm text-ink-100 border border-ink-600 hover:border-ink-500 hover:bg-ink-800 transition-all"
            >
              Entrar num Exame →
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-ink-800 bg-[#0a0a12]">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold" style={GSTYLE}>{'{✓}'}</span>
            <span className="font-bold text-sm text-ink-500">CodeCheck</span>
          </div>
          <p className="text-xs text-ink-500">Plataforma de avaliação de código para exames · 2025</p>
          <div className="flex gap-5 text-xs text-ink-400">
            <button onClick={() => navigate('/login')} className="hover:text-ink-100 transition-colors">Professor</button>
            <button onClick={() => navigate('/join')} className="hover:text-ink-100 transition-colors">Aluno</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
