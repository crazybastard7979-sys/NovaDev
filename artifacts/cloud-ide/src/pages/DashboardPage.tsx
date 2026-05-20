import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Plus, Search, Code2, Clock, Globe, MoreHorizontal,
  FolderOpen, Rocket, Settings, LogOut, BarChart2,
  Archive, Trash2, Sun, Moon, Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListProjects, useGetProjectStats, useGetRecentProjects,
  useDeleteProject, useGetMe, getListProjectsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { removeToken } from "@/lib/api-config";
import { useTheme } from "@/components/ThemeProvider";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const LANG_COLORS: Record<string, string> = {
  javascript: "#f7df1e", typescript: "#3178c6", python: "#3572A5",
  go: "#00ADD8", rust: "#ce422b", html: "#e34c26", java: "#b07219",
  cpp: "#f34b7d", ruby: "#701516", php: "#4F5D95",
};
const LANG_ICONS: Record<string, string> = {
  javascript: "JS", typescript: "TS", python: "PY", go: "GO",
  rust: "RS", html: "HT", java: "JV", cpp: "C+",
};
function LangBadge({ lang }: { lang: string }) {
  const color = LANG_COLORS[lang] ?? "#888";
  const label = LANG_ICONS[lang] ?? lang.slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold px-1.5 py-0.5 rounded" style={{ background: color + "22", color }}>
      {label}
    </span>
  );
}

const CHART_COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: meData } = useGetMe();
  const { data: projectsData, isLoading } = useListProjects({ search: search || undefined });
  const { data: stats } = useGetProjectStats();
  const { data: recent } = useGetRecentProjects();
  const deleteMutation = useDeleteProject();

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      },
    });
  };

  const handleLogout = () => {
    removeToken();
    queryClient.clear();
    setLocation("/");
  };

  const projects = projectsData?.projects ?? [];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-sidebar flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">NovaDev</span>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {[
            { icon: FolderOpen, label: "Projects", href: "/dashboard", active: true },
            { icon: Terminal, label: "Templates", href: "/templates", active: false },
            { icon: Rocket, label: "Deployments", href: "/dashboard", active: false },
            { icon: BarChart2, label: "Analytics", href: "/dashboard", active: false },
          ].map((item) => (
            <Link key={item.label} href={item.href}>
              <button className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${item.active ? "bg-sidebar-accent text-sidebar-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-border space-y-0.5">
          <Link href="/settings">
            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors">
              <Settings className="w-4 h-4" />Settings
            </button>
          </Link>
          <button onClick={toggleTheme} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors">
            <LogOut className="w-4 h-4" />Sign out
          </button>
        </div>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              {meData?.username?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{meData?.username ?? "..."}</p>
              <Badge variant="secondary" className="text-xs px-1 py-0 h-auto">{meData?.plan ?? "free"}</Badge>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Projects</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {meData?.username ?? "developer"}</p>
            </div>
            <Link href="/projects/new">
              <Button size="sm" className="gap-1.5" data-testid="button-new-project">
                <Plus className="w-4 h-4" />New project
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total projects", value: stats?.totalProjects ?? 0, icon: FolderOpen },
              { label: "Active this week", value: stats?.recentlyActive ?? 0, icon: Clock },
              { label: "Deployments", value: stats?.totalDeployments ?? 0, icon: Globe },
              { label: "Storage used", value: `${stats?.storageUsedMb ?? 0} MB`, icon: BarChart2 },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl border border-border bg-card"
                data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Recent */}
            {recent && recent.length > 0 && (
              <div className="lg:col-span-2">
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Recently opened</h2>
                <div className="space-y-2">
                  {recent.slice(0, 4).map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer group">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center font-mono text-xs font-bold shrink-0" style={{ background: (LANG_COLORS[p.language] ?? "#888") + "22", color: LANG_COLORS[p.language] ?? "#888" }}>
                          {LANG_ICONS[p.language] ?? "??"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.language}</p>
                        </div>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Language chart */}
            {stats?.languageBreakdown && stats.languageBreakdown.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Languages</h2>
                <div className="p-4 rounded-xl border border-border bg-card">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={stats.languageBreakdown} dataKey="count" nameKey="language" cx="50%" cy="50%" innerRadius={35} outerRadius={55}>
                        {stats.languageBreakdown.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {stats.languageBreakdown.slice(0, 4).map((l, i) => (
                      <div key={l.language} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="capitalize">{l.language}</span>
                        </div>
                        <span className="text-muted-foreground">{l.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* All projects */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <span className="text-sm text-muted-foreground">{projectsData?.total ?? 0} projects</span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-20">
                <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No projects yet</h3>
                <p className="text-sm text-muted-foreground mb-6">Create your first project to start coding in the cloud.</p>
                <Link href="/projects/new">
                  <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />New project</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {projects.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all"
                    data-testid={`card-project-${p.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0" style={{ background: (LANG_COLORS[p.language] ?? "#888") + "22", color: LANG_COLORS[p.language] ?? "#888" }}>
                          {LANG_ICONS[p.language] ?? "??"}
                        </div>
                        <div>
                          <p className="font-medium text-sm leading-tight">{p.name}</p>
                          <LangBadge lang={p.language} />
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-muted transition-all" data-testid={`button-menu-${p.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setLocation(`/projects/${p.id}`)}>
                            <Code2 className="w-3.5 h-3.5 mr-2" />Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation(`/projects/${p.id}/deploy`)}>
                            <Rocket className="w-3.5 h-3.5 mr-2" />Deploy
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-muted-foreground">
                            <Archive className="w-3.5 h-3.5 mr-2" />Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(p.id)}
                            data-testid={`button-delete-${p.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {p.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {p.lastOpenedAt ? new Date(p.lastOpenedAt).toLocaleDateString() : new Date(p.updatedAt).toLocaleDateString()}
                      </div>
                      <Link href={`/projects/${p.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-open-${p.id}`}>
                          Open <Code2 className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
