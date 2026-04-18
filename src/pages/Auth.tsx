import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const emailSchema = z.string().trim().email("E-mail inválido").max(255);
const passwordSchema = z.string().min(6, "Mínimo 6 caracteres").max(72);
const nameSchema = z.string().trim().min(2, "Mínimo 2 caracteres").max(80);

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/dashboard", { replace: true }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (mode === "signup") nameSchema.parse(name);
    } catch (err) {
      if (err instanceof z.ZodError) { toast.error(err.errors[0].message); return; }
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro de autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.15), transparent 60%)" }} />
      <Card className="relative z-10 w-full max-w-md p-8 surface-card border-border">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold">ApostaPro</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">EV Trading</div>
          </div>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          {mode === "signin" ? "Bem-vindo de volta" : "Crie sua conta"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "signin" ? "Acesse seu painel de apostas" : "Comece a apostar com método"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>Não tem conta? <button onClick={() => setMode("signup")} className="text-primary hover:underline">Cadastre-se</button></>
          ) : (
            <>Já tem conta? <button onClick={() => setMode("signin")} className="text-primary hover:underline">Entrar</button></>
          )}
        </div>
      </Card>
    </div>
  );
}
