import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Code2, Search, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListTemplates } from "@workspace/api-client-react";
import { isAuthenticated } from "@/lib/api-config";

const LANG_COLORS: Record<string, string> = {
  javascript: "#f7df1e", typescript: "#3178c6", python: "#3572A5",
  go: "#00ADD8", rust: "#ce422b", html: "#e34c26",
};
const LANG_ICONS: Record<string, string> = {
  javascript: "JS", typescript: "TS", python: "PY", go: "GO", rust: "RS", html: "HT",
};

const CATEGORIES = ["All", "Backend", "Frontend", "Full Stack", "Data Science", "Tools", "Bots"];

export default function TemplatesPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const { data: templates, isLoading } = useListTemplates();
  const authed = isAuthenticated();

  const filtered = (templates ?? []).filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.language.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || t.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Code2 className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">NovaDev Templates</span>
            </div>
          </div>
          {authed ? (
            <Link href="/dashboard"><Button size="sm" variant="outline">Dashboard</Button></Link>
          ) : (
            <Link href="/register"><Button size="sm">Get started free</Button></Link>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2">Project templates</h1>
          <p className="text-muted-foreground mb-8">Start fast with production-ready starter projects. Pick a template, customize, and deploy.</p>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  data-testid={`button-category-${c}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${category === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => authed ? setLocation(`/projects/new?template=${t.id}`) : setLocation("/register")}
                  data-testid={`card-template-${t.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm" style={{ background: (LANG_COLORS[t.language] ?? "#888") + "22", color: LANG_COLORS[t.language] ?? "#888" }}>
                      {LANG_ICONS[t.language] ?? "??"}
                    </div>
                    <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{t.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {(t.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{tag}</span>
                      ))}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No templates match your search.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
