import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Calculator, Bell, Layers, LineChart, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, hsl(var(--primary) / 0.18), transparent 60%)" }} />

      <header className="relative z-10 max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight">ApostaPro</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">EV Trading Platform</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
          <Link to="/auth?mode=signup"><Button size="sm" className="gap-1">Criar conta <ArrowRight className="h-3 w-3" /></Button></Link>
        </div>
      </header>

      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
          Decisão baseada em dados, não em palpite
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-[1.05]">
          Transforme apostas em<br />
          <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">investimento esportivo</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Plataforma profissional para análise de EV+, gestão de banca e identificação de valor real nos mercados esportivos.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/auth?mode=signup">
            <Button size="lg" className="gap-2 glow-primary">
              Começar grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth"><Button size="lg" variant="outline">Já tenho conta</Button></Link>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: BarChart3, title: "Dashboard inteligente", text: "ROI, yield, taxa de acerto e evolução da banca em tempo real." },
            { icon: Calculator, title: "Cálculo de EV", text: "EV = (prob × odd) − 1. Identifique apostas com valor positivo." },
            { icon: Layers, title: "Múltiplas inteligentes", text: "Calcule prob. combinada, EV e risco de cada combinação." },
            { icon: LineChart, title: "Simulador Monte Carlo", text: "Projete cenários P10/P50/P90 e risco de ruína da sua banca." },
            { icon: Radio, title: "Odds em tempo real", text: "Compare odds entre casas e detecte movimentos." },
            { icon: Bell, title: "Alertas de valor", text: "Receba avisos quando aparecer +EV nos seus mercados." },
          ].map((f) => (
            <div key={f.title} className="surface-card border border-border rounded-xl p-5">
              <f.icon className="h-5 w-5 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Pronto para apostar como um profissional?</h2>
        <p className="text-muted-foreground mb-6">Sem mensalidade na fase beta. Sem cartão.</p>
        <Link to="/auth?mode=signup">
          <Button size="lg" className="gap-2">Criar minha conta <CheckCircle2 className="h-4 w-4" /></Button>
        </Link>
      </section>

      <footer className="relative z-10 border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ApostaPro · Aposte com responsabilidade.
      </footer>
    </div>
  );
}

function Radio(props: React.SVGProps<SVGSVGElement>) {
  return <BarChart3 {...props} />;
}
