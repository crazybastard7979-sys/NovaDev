import { Link } from "wouter";
import { ArrowLeft, Code2, Sun, Moon, User, Shield, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useGetMe } from "@workspace/api-client-react";
import { useTheme } from "@/components/ThemeProvider";
import { motion } from "framer-motion";

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["3 projects", "1 GB storage", "Shared compute", "Community support"],
  pro: ["Unlimited projects", "10 GB storage", "Dedicated compute", "Priority support", "Custom domains"],
  team: ["Everything in Pro", "Team management", "SSO / SAML", "Audit logs", "SLA guarantee"],
  enterprise: ["Everything in Team", "Private cloud", "Custom contracts", "Dedicated support"],
};

export default function SettingsPage() {
  const { data: user } = useGetMe();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard">
            <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Settings</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

          {/* Profile */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Profile</h2>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                  {user?.username?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <p className="font-semibold">{user?.username ?? "..."}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1 text-xs capitalize">{user?.plan ?? "free"} plan</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input defaultValue={user?.username ?? ""} data-testid="input-username" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" defaultValue={user?.email ?? ""} data-testid="input-email" />
                </div>
              </div>
              <Button size="sm" variant="outline" data-testid="button-save-profile">Save changes</Button>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              {theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
              <h2 className="font-semibold">Appearance</h2>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Dark mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Switch between light and dark themes</p>
                </div>
                <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} data-testid="switch-dark-mode" />
              </div>
            </div>
          </section>

          {/* Security */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Security</h2>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <div className="space-y-2">
                <Label>Current password</Label>
                <Input type="password" placeholder="••••••••" data-testid="input-current-password" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>New password</Label>
                  <Input type="password" placeholder="••••••••" data-testid="input-new-password" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm new password</Label>
                  <Input type="password" placeholder="••••••••" data-testid="input-confirm-password" />
                </div>
              </div>
              <Button size="sm" variant="outline" data-testid="button-change-password">Change password</Button>
            </div>
          </section>

          {/* AI API Keys */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">AI Provider Keys</h2>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <p className="text-xs text-muted-foreground">Connect your own AI provider keys for unlimited access. Leave empty to use NovaDev's shared quota.</p>
              {[
                { label: "OpenAI API Key", placeholder: "sk-..." },
                { label: "Anthropic API Key", placeholder: "sk-ant-..." },
                { label: "Google Gemini Key", placeholder: "AIza..." },
              ].map((key) => (
                <div key={key.label} className="space-y-2">
                  <Label>{key.label}</Label>
                  <div className="flex gap-2">
                    <Input type="password" placeholder={key.placeholder} className="font-mono text-sm" data-testid={`input-key-${key.label}`} />
                    <Button size="sm" variant="outline">Save</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Plan */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Plan & Billing</h2>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-medium capitalize">{user?.plan ?? "free"} plan</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user?.plan === "free" ? "Free forever" : "$20/month"}
                  </p>
                </div>
                <Badge variant={user?.plan === "free" ? "secondary" : "default"} className="capitalize">{user?.plan ?? "free"}</Badge>
              </div>
              <ul className="space-y-1.5 mb-4">
                {(PLAN_FEATURES[user?.plan ?? "free"] ?? []).map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              {user?.plan === "free" && (
                <Button size="sm" data-testid="button-upgrade">Upgrade to Pro — $20/mo</Button>
              )}
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
