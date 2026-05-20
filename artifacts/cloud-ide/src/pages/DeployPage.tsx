import { useState } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Rocket, CheckCircle, XCircle, Clock, Globe,
  RefreshCw, Plus, ChevronDown, Terminal, Code2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useGetProject, useListDeployments, useCreateDeployment,
  getListDeploymentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_CONFIG = {
  pending:  { icon: Clock,       color: "text-yellow-500",  bg: "bg-yellow-500/10",  label: "Pending"  },
  building: { icon: RefreshCw,   color: "text-blue-500",    bg: "bg-blue-500/10",    label: "Building" },
  running:  { icon: CheckCircle, color: "text-green-500",   bg: "bg-green-500/10",   label: "Live"     },
  failed:   { icon: XCircle,     color: "text-red-500",     bg: "bg-red-500/10",     label: "Failed"   },
  stopped:  { icon: Clock,       color: "text-muted-foreground", bg: "bg-muted",      label: "Stopped"  },
};

export default function DeployPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const queryClient = useQueryClient();
  const [env, setEnv] = useState<"production" | "staging" | "preview">("production");
  const [selectedDeploy, setSelectedDeploy] = useState<number | null>(null);

  const { data: project } = useGetProject(projectId, { query: { enabled: !!projectId, queryKey: ["getProject", projectId] } });
  const { data: deployments, isLoading } = useListDeployments(projectId, { query: { enabled: !!projectId, queryKey: getListDeploymentsQueryKey(projectId) } });
  const createMutation = useCreateDeployment();

  const handleDeploy = () => {
    createMutation.mutate(
      { id: projectId, data: { environment: env } },
      {
        onSuccess: (d) => {
          queryClient.invalidateQueries({ queryKey: getListDeploymentsQueryKey(projectId) });
          setSelectedDeploy(d.id);
        },
      }
    );
  };

  const selected = deployments?.find((d) => d.id === selectedDeploy) ?? deployments?.[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href={`/projects/${projectId}`}>
            <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{project?.name ?? "..."}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">Deployments</span>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Deployments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Ship {project?.name} to production in one click</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={env} onValueChange={(v) => setEnv(v as typeof env)}>
              <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="preview">Preview</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleDeploy} disabled={createMutation.isPending} className="gap-1.5 h-9" data-testid="button-deploy">
              <Rocket className="w-4 h-4" />
              {createMutation.isPending ? "Deploying..." : "Deploy now"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deployment list */}
          <div className="lg:col-span-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">History</h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : !deployments || deployments.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <Rocket className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No deployments yet</p>
                <Button size="sm" className="mt-3 gap-1.5" onClick={handleDeploy} data-testid="button-first-deploy">
                  <Plus className="w-3.5 h-3.5" />First deploy
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {deployments.map((d) => {
                  const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDeploy(d.id)}
                      data-testid={`button-deployment-${d.id}`}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === d.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-xs text-muted-foreground capitalize">{d.environment}</span>
                        </div>
                        <Icon className={`w-4 h-4 ${cfg.color} ${d.status === "building" ? "animate-spin" : ""}`} />
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</p>
                      {d.url && (
                        <p className="text-xs text-primary mt-1 truncate">{d.url}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deployment details */}
          <div className="lg:col-span-2">
            {selected ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Details</h2>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Info */}
                  <div className="p-5 border-b border-border">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Status", value: STATUS_CONFIG[selected.status]?.label ?? selected.status },
                        { label: "Environment", value: selected.environment },
                        { label: "Deployed", value: new Date(selected.createdAt).toLocaleTimeString() },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                          <p className="text-sm font-medium capitalize">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {selected.url && (
                      <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <Globe className="w-4 h-4 text-green-500" />
                        <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline font-mono">
                          {selected.url}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Build log */}
                  <div>
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
                      <Terminal className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Build log</span>
                    </div>
                    <ScrollArea className="h-64">
                      <div className="p-4 font-mono text-xs space-y-1">
                        {selected.buildLog ? (
                          selected.buildLog.split("\n").map((line, i) => (
                            <div key={i} className={`leading-relaxed ${line.includes("error") || line.includes("Error") ? "text-red-400" : line.includes("✓") || line.includes("success") || line.includes("complete") ? "text-green-400" : "text-muted-foreground"}`}>
                              {line}
                            </div>
                          ))
                        ) : selected.status === "pending" ? (
                          <p className="text-muted-foreground">Waiting to start build...</p>
                        ) : selected.status === "building" ? (
                          <div className="space-y-1">
                            <p className="text-blue-400">Building your project...</p>
                            <div className="flex gap-1 mt-2">
                              {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No build log available.</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl">
                <div className="text-center">
                  <Rocket className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a deployment to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
