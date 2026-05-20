import { Link } from "wouter";
import { motion } from "framer-motion";
import { Code2, Zap, Globe, Bot, Terminal, Users, ChevronRight, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { isAuthenticated } from "@/lib/api-config";

const FEATURES = [
  { icon: Code2, title: "Full IDE in Browser", desc: "Monaco-powered editor with syntax highlighting, IntelliSense, multi-file tabs, and keyboard shortcuts you already know." },
  { icon: Terminal, title: "Cloud Terminal", desc: "Real terminal access to your container. Run npm install, execute scripts, inspect processes — right in the browser." },
  { icon: Bot, title: "AI Coding Agent", desc: "GPT-4o and Claude 3.5 understand your entire codebase. Refactor, debug, generate, and explain — autonomously." },
  { icon: Globe, title: "One-Click Deploy", desc: "Ship to production instantly. Custom domains, SSL, env vars, and build logs — without leaving the IDE." },
  { icon: Zap, title: "Instant Start", desc: "Zero-config project start. Pick a template, write code — your environment is ready in under 3 seconds." },
  { icon: Users, title: "Team Collaboration", desc: "Live cursors, shared terminals, and multiplayer editing. Real-time presence that feels like working side-by-side." },
];

const PLANS = [
  { name: "Free", price: "0", period: "forever", features: ["3 projects", "1 GB storage", "Shared compute", "Community support", "AI assistant (limited)"], cta: "Get started free", primary: false },
  { name: "Pro", price: "20", period: "month", features: ["Unlimited projects", "10 GB storage", "Dedicated compute", "Priority support", "AI assistant (unlimited)", "Custom domains", "Advanced deployment"], cta: "Start free trial", primary: true },
  { name: "Team", price: "60", period: "month", features: ["Everything in Pro", "5 team seats", "Shared workspaces", "Team dashboards", "SSO / SAML", "Audit logs", "SLA guarantee"], cta: "Contact sales", primary: false },
];

const CODE_SAMPLE = `// NovaDev AI refactored your auth module
import { createServer } from './server';
import { db } from './db';

async function bootstrap() {
  const app = await createServer({
    port: process.env.PORT ?? 3000,
    database: db,
    auth: { jwt: process.env.JWT_SECRET },
  });

  app.listen(() => {
    console.log(\`Server ready on :3000\`);
  });
}

bootstrap().catch(console.error);`;

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const authed = isAuthenticated();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-tight">NovaDev</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link href="/templates" className="hover:text-foreground transition-colors">Templates</Link>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {authed ? (
              <Link href="/dashboard">
                <Button size="sm" className="gap-1">Dashboard <ArrowRight className="w-3 h-3" /></Button>
              </Link>
            ) : (
              <>
                <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
                <Link href="/register"><Button size="sm">Get started</Button></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
              Now in public beta — AI agents included
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.08]"
          >
            Code. Ship.{" "}
            <span className="text-primary">Anywhere.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            A cloud IDE that thinks with you. Full VS Code experience, AI coding agents, instant deployment, and real terminals — all from your browser, zero setup.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/register">
              <Button size="lg" className="gap-2 px-8 h-12 text-base">
                Start building free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/templates">
              <Button size="lg" variant="outline" className="h-12 text-base px-8">
                Browse templates
              </Button>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-sm text-muted-foreground"
          >
            No credit card required. 3 free projects forever.
          </motion.p>
        </div>

        {/* Code preview */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="max-w-4xl mx-auto mt-20 rounded-xl border border-border shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-2 text-xs text-muted-foreground font-mono">server.ts — NovaDev IDE</span>
          </div>
          <div className="bg-card/50 p-6 font-mono text-sm">
            <pre className="text-left overflow-x-auto">
              {CODE_SAMPLE.split("\n").map((line, i) => (
                <div key={i} className="flex gap-4">
                  <span className="select-none text-muted-foreground/50 w-6 text-right shrink-0">{i + 1}</span>
                  <span className="text-foreground/90">{line}</span>
                </div>
              ))}
            </pre>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to build</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Professional development tools, without the setup. Open the browser and ship.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-xl border border-border bg-card/50 hover:bg-card/80 hover:border-primary/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">Start free, scale when you need to. No hidden fees.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-xl border p-6 flex flex-col ${plan.primary ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border bg-card"}`}
              >
                {plan.primary && <Badge className="self-start mb-3 text-xs">Most popular</Badge>}
                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground text-sm">/{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button className="w-full" variant={plan.primary ? "default" : "outline"}>{plan.cta}</Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to build something great?</h2>
            <p className="text-muted-foreground text-lg mb-8">Join thousands of developers shipping faster with NovaDev.</p>
            <Link href="/register">
              <Button size="lg" className="gap-2 h-12 px-8 text-base">
                Start for free <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <Code2 className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">NovaDev</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built with Node.js, React, PostgreSQL, and AI. The cloud IDE for modern developers.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
