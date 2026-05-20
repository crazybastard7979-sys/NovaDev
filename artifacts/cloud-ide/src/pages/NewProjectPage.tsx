import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Code2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateProject, useListTemplates, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const LANGUAGES = [
  { id: "javascript", label: "JavaScript", color: "#f7df1e", abbr: "JS" },
  { id: "typescript", label: "TypeScript", color: "#3178c6", abbr: "TS" },
  { id: "python", label: "Python", color: "#3572A5", abbr: "PY" },
  { id: "go", label: "Go", color: "#00ADD8", abbr: "GO" },
  { id: "rust", label: "Rust", color: "#ce422b", abbr: "RS" },
  { id: "html", label: "HTML/CSS/JS", color: "#e34c26", abbr: "HT" },
  { id: "java", label: "Java", color: "#b07219", abbr: "JV" },
  { id: "cpp", label: "C++", color: "#f34b7d", abbr: "C+" },
];

export default function NewProjectPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isPublic, setIsPublic] = useState(false);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const createMutation = useCreateProject();
  const { data: templates } = useListTemplates();

  const handleCreate = () => {
    if (!name.trim()) { setError("Project name is required"); return; }
    setError("");
    createMutation.mutate(
      { data: { name: name.trim(), description, language, isPublic, templateId } },
      {
        onSuccess: (project) => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setLocation(`/projects/${project.id}`);
        },
        onError: (err: any) => setError(err?.data?.error ?? "Failed to create project"),
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/dashboard">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to dashboard
          </button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">New project</h1>
          <p className="text-muted-foreground text-sm mb-8">Choose a language and get coding in seconds.</p>

          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                placeholder="my-awesome-project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-project-name"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="desc">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="desc"
                placeholder="What is this project about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                data-testid="input-description"
              />
            </div>

            {/* Language */}
            <div className="space-y-3">
              <Label>Language</Label>
              <div className="grid grid-cols-4 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setLanguage(lang.id)}
                    data-testid={`button-lang-${lang.id}`}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${language === lang.id ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                  >
                    {language === lang.id && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm" style={{ background: lang.color + "22", color: lang.color }}>
                      {lang.abbr}
                    </div>
                    <span className="text-xs leading-tight text-center">{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Templates */}
            {templates && templates.length > 0 && (
              <div className="space-y-3">
                <Label>Start from a template <span className="text-muted-foreground">(optional)</span></Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {templates.filter((t) => !language || t.language === language).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTemplateId(templateId === t.id ? null : t.id); setLanguage(t.language); }}
                      className={`text-left p-3 rounded-lg border text-sm transition-all ${templateId === t.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}
                      data-testid={`button-template-${t.id}`}
                    >
                      <div className="font-medium text-xs mb-0.5">{t.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Visibility */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div>
                <p className="text-sm font-medium">Public project</p>
                <p className="text-xs text-muted-foreground">Anyone can view this project</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} data-testid="switch-public" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="flex-1" data-testid="button-create">
                {createMutation.isPending ? "Creating..." : "Create project"}
              </Button>
              <Link href="/dashboard">
                <Button variant="outline">Cancel</Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
