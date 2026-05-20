import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import {
  Panel, PanelGroup, PanelResizeHandle
} from "react-resizable-panels";
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus,
  X, Save, Play, Rocket, Code2, Terminal, Bot, Settings,
  FileText, Search, GitBranch, RefreshCw, MoreHorizontal, Loader2,
  ArrowLeft, Send, Sun, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetProject, useGetFileTree, useGetFile, useUpdateFile,
  useCreateFile, useDeleteFile, useGetAiHistory, useSendAiMessage,
  getGetFileQueryKey, getGetFileTreeQueryKey, getGetAiHistoryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/api-config";
import { useTheme } from "@/components/ThemeProvider";

type FileNode = {
  id: number; name: string; path: string; type: "file" | "directory";
  projectId: number; parentId: number | null; language: string | null;
  children?: FileNode[];
};

type OpenTab = { fileId: number; name: string; path: string; dirty: boolean; language: string | null };

const LANG_COLORS: Record<string, string> = {
  javascript: "#f7df1e", typescript: "#3178c6", python: "#3572A5",
  go: "#00ADD8", rust: "#ce422b", html: "#e34c26", css: "#1572B6",
  json: "#fbc02d", markdown: "#083fa1", bash: "#89e051",
};

const FILE_ICONS: Record<string, string> = {
  js: "📄", ts: "📘", py: "🐍", go: "🔵", rs: "🦀",
  html: "🌐", css: "🎨", json: "📋", md: "📝", sh: "⚡",
  tsx: "⚛", jsx: "⚛", toml: "⚙", yaml: "⚙", yml: "⚙",
};

function getFileExt(name: string) { return name.split(".").pop()?.toLowerCase() ?? ""; }
function getFileIcon(name: string) { return FILE_ICONS[getFileExt(name)] ?? "📄"; }

function langFromExt(name: string): string {
  const ext = getFileExt(name);
  const map: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", go: "go", rs: "rust", html: "html", css: "css",
    json: "json", md: "markdown", sh: "bash", toml: "toml", yaml: "yaml", yml: "yaml",
  };
  return map[ext] ?? "plaintext";
}

function syntaxHighlight(code: string, lang: string): string {
  if (!code) return "";
  let result = code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  if (lang === "json") {
    result = result
      .replace(/"([^"]+)":/g, '<span class="token-keyword">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="token-string">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="token-number">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="token-operator">$1</span>');
    return result;
  }

  result = result
    .replace(/(\/\/[^\n]*)/g, '<span class="token-comment">$1</span>')
    .replace(/(#[^\n]*)/g, '<span class="token-comment">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="token-string">$1</span>')
    .replace(/\b(const|let|var|function|class|interface|type|import|export|from|return|if|else|for|while|async|await|try|catch|finally|new|this|super|extends|implements|package|func|fn|def|pub|use|mod|struct|enum|trait|impl)\b/g, '<span class="token-keyword">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>');
  return result;
}

function FileTreeNode({
  node, depth = 0, selectedFileId, onSelect, onNewFile, onDelete, expandedDirs, onToggleDir
}: {
  node: FileNode; depth?: number; selectedFileId: number | null;
  onSelect: (n: FileNode) => void; onNewFile: (parentId: number | null, path: string) => void;
  onDelete: (id: number) => void; expandedDirs: Set<number>; onToggleDir: (id: number) => void;
}) {
  const isExpanded = expandedDirs.has(node.id);
  const isSelected = node.id === selectedFileId && node.type === "file";

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer text-sm transition-colors ${isSelected ? "bg-primary/15 text-primary" : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => node.type === "directory" ? onToggleDir(node.id) : onSelect(node)}
        data-testid={`file-${node.id}`}
      >
        {node.type === "directory" ? (
          <>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            {isExpanded ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 shrink-0 text-yellow-500/70" />}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <span className="text-xs shrink-0">{getFileIcon(node.name)}</span>
          </>
        )}
        <span className="truncate text-xs leading-5 flex-1">{node.name}</span>
        {node.type === "directory" && (
          <button
            onClick={(e) => { e.stopPropagation(); onNewFile(node.id, node.path); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-primary/20 transition-all"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
      {node.type === "directory" && isExpanded && node.children?.map((child) => (
        <FileTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedFileId={selectedFileId}
          onSelect={onSelect}
          onNewFile={onNewFile}
          onDelete={onDelete}
          expandedDirs={expandedDirs}
          onToggleDir={onToggleDir}
        />
      ))}
    </div>
  );
}

const AI_MODELS = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o mini" },
  { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
];

export default function IdePage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [expandedDirs, setExpandedDirs] = useState<Set<number>>(new Set());
  const [sidebarView, setSidebarView] = useState<"files" | "search" | "git">("files");
  const [aiOpen, setAiOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [aiMessage, setAiMessage] = useState("");
  const [aiModel, setAiModel] = useState("gpt-4o-mini");
  const [savingFileId, setSavingFileId] = useState<number | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [newFileParent, setNewFileParent] = useState<{ id: number | null; path: string } | null>(null);
  const [wsRef] = useState<{ current: WebSocket | null }>({ current: null });

  const terminalRef = useRef<HTMLDivElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const { data: project } = useGetProject(projectId, { query: { enabled: !!projectId, queryKey: ["getProject", projectId] } });
  const { data: fileTree, isLoading: treeLoading } = useGetFileTree(projectId, { query: { enabled: !!projectId, queryKey: getGetFileTreeQueryKey(projectId) } });
  const { data: fileContent, isLoading: fileLoading } = useGetFile(projectId, activeTabId ?? 0, {
    query: { enabled: !!activeTabId, queryKey: getGetFileQueryKey(projectId, activeTabId ?? 0) }
  });
  const { data: aiHistory } = useGetAiHistory(projectId, { query: { enabled: !!projectId, queryKey: getGetAiHistoryQueryKey(projectId) } });

  const updateFileMutation = useUpdateFile();
  const createFileMutation = useCreateFile();
  const deleteFileMutation = useDeleteFile();
  const sendAiMutation = useSendAiMessage();

  // Load file content when tab changes
  useEffect(() => {
    if (fileContent && fileContent.id === activeTabId) {
      setEditorContent(fileContent.content ?? "");
      setOpenTabs((tabs) => tabs.map((t) => t.fileId === fileContent.id ? { ...t, dirty: false } : t));
    }
  }, [fileContent, activeTabId]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // Auto-scroll AI
  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiHistory]);

  // WebSocket terminal
  useEffect(() => {
    const token = getToken();
    if (!token || !projectId) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/terminal?token=${encodeURIComponent(token)}&projectId=${projectId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as { type: string; data: string };
        if (msg.type === "output" || msg.type === "prompt") {
          setTerminalLines((prev) => [...prev, msg.data]);
        }
      } catch {}
    };
    ws.onerror = () => setTerminalLines((prev) => [...prev, "\r\n\x1b[31mTerminal connection failed. Reconnecting...\x1b[0m\r\n"]);

    return () => ws.close();
  }, [projectId]);

  const openFile = useCallback((node: FileNode) => {
    if (node.type !== "file") return;
    if (!openTabs.find((t) => t.fileId === node.id)) {
      setOpenTabs((tabs) => [...tabs, {
        fileId: node.id,
        name: node.name,
        path: node.path,
        dirty: false,
        language: node.language,
      }]);
    }
    setActiveTabId(node.id);
  }, [openTabs]);

  const closeTab = useCallback((fileId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs((tabs) => {
      const newTabs = tabs.filter((t) => t.fileId !== fileId);
      if (activeTabId === fileId) {
        setActiveTabId(newTabs[newTabs.length - 1]?.fileId ?? null);
      }
      return newTabs;
    });
  }, [activeTabId]);

  const saveFile = useCallback(() => {
    if (!activeTabId) return;
    setSavingFileId(activeTabId);
    updateFileMutation.mutate(
      { id: projectId, fileId: activeTabId, data: { content: editorContent } },
      {
        onSuccess: () => {
          setOpenTabs((tabs) => tabs.map((t) => t.fileId === activeTabId ? { ...t, dirty: false } : t));
          queryClient.invalidateQueries({ queryKey: getGetFileQueryKey(projectId, activeTabId) });
          setSavingFileId(null);
        },
        onError: () => setSavingFileId(null),
      }
    );
  }, [activeTabId, editorContent, projectId, updateFileMutation, queryClient]);

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveFile(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveFile]);

  const sendTerminalCommand = () => {
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalHistory((h) => [...h, cmd]);
    setHistoryIdx(-1);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "input", data: cmd }));
    }
    setTerminalInput("");
  };

  const handleTerminalKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { sendTerminalCommand(); }
    else if (e.key === "ArrowUp") {
      const idx = Math.min(historyIdx + 1, terminalHistory.length - 1);
      setHistoryIdx(idx);
      setTerminalInput(terminalHistory[terminalHistory.length - 1 - idx] ?? "");
    } else if (e.key === "ArrowDown") {
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setTerminalInput(idx === -1 ? "" : (terminalHistory[terminalHistory.length - 1 - idx] ?? ""));
    }
  };

  const sendAiMessage = () => {
    if (!aiMessage.trim() || sendAiMutation.isPending) return;
    const msg = aiMessage.trim();
    setAiMessage("");
    sendAiMutation.mutate(
      { id: projectId, data: { message: msg, model: aiModel, context: fileContent?.content?.slice(0, 2000) ?? "" } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAiHistoryQueryKey(projectId) }) }
    );
  };

  const createNewFile = () => {
    if (!newFileName.trim() || !newFileParent) return;
    const name = newFileName.trim();
    const path = `${newFileParent.path}/${name}`.replace(/\/\//g, "/");
    createFileMutation.mutate(
      { id: projectId, data: { name, path, type: "file", content: "", parentId: newFileParent.id } },
      {
        onSuccess: (file) => {
          queryClient.invalidateQueries({ queryKey: getGetFileTreeQueryKey(projectId) });
          setNewFileName("");
          setNewFileParent(null);
          openFile({ ...file, children: undefined } as FileNode);
        },
      }
    );
  };

  const activeTab = openTabs.find((t) => t.fileId === activeTabId);
  const activeLang = activeTab ? langFromExt(activeTab.name) : "plaintext";
  const lines = editorContent.split("\n");

  const SIDEBAR_ICONS = [
    { id: "files" as const, icon: FileText, tip: "Explorer" },
    { id: "search" as const, icon: Search, tip: "Search" },
    { id: "git" as const, icon: GitBranch, tip: "Source Control" },
  ];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="h-10 border-b border-border bg-card/70 flex items-center justify-between px-3 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </Link>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <Code2 className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">NovaDev</span>
          </div>
          <span className="text-muted-foreground text-xs">—</span>
          <span className="text-xs font-medium">{project?.name ?? "Loading..."}</span>
          {project?.language && (
            <Badge variant="secondary" className="text-xs h-4 px-1.5 py-0 font-mono">{project.language}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setTerminalOpen((v) => !v)} className={`p-1.5 rounded text-xs transition-colors ${terminalOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <Terminal className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Terminal</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setAiOpen((v) => !v)} className={`p-1.5 rounded transition-colors ${aiOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <Bot className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>AI Assistant</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={saveFile} disabled={!activeTabId || savingFileId === activeTabId} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                {savingFileId === activeTabId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>Save (Ctrl+S)</TooltipContent>
          </Tooltip>
          <Link href={`/projects/${projectId}/deploy`}>
            <Button size="sm" className="h-7 text-xs gap-1 ml-1" data-testid="button-deploy">
              <Rocket className="w-3 h-3" />Deploy
            </Button>
          </Link>
          <button onClick={toggleTheme} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1">
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity bar */}
        <div className="w-11 border-r border-border bg-sidebar flex flex-col items-center py-1 gap-0.5 shrink-0">
          {SIDEBAR_ICONS.map(({ id, icon: Icon, tip }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSidebarView(id)}
                  className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${sidebarView === id ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"}`}
                  data-testid={`button-sidebar-${id}`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{tip}</TooltipContent>
            </Tooltip>
          ))}
          <div className="flex-1" />
          <Link href="/settings">
            <button className="w-9 h-9 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* File explorer */}
        <div className="w-52 border-r border-border bg-sidebar flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {sidebarView === "files" ? "Explorer" : sidebarView === "search" ? "Search" : "Source Control"}
            </span>
            {sidebarView === "files" && (
              <button
                onClick={() => setNewFileParent({ id: null, path: "" })}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-new-file-root"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* New file input */}
          {newFileParent !== null && (
            <div className="px-2 py-1.5 border-b border-border">
              <Input
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createNewFile(); if (e.key === "Escape") { setNewFileParent(null); setNewFileName(""); } }}
                placeholder="filename.ts"
                className="h-6 text-xs font-mono"
                data-testid="input-new-file"
              />
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="py-1">
              {sidebarView === "files" ? (
                treeLoading ? (
                  <div className="px-3 space-y-1.5">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-5 rounded" />)}
                  </div>
                ) : fileTree && fileTree.length > 0 ? (
                  (fileTree as FileNode[]).map((node) => (
                    <FileTreeNode
                      key={node.id}
                      node={node}
                      selectedFileId={activeTabId}
                      onSelect={openFile}
                      onNewFile={(parentId, path) => { setNewFileParent({ id: parentId, path }); setNewFileName(""); }}
                      onDelete={(fid) => {
                        deleteFileMutation.mutate({ id: projectId, fileId: fid }, {
                          onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFileTreeQueryKey(projectId) }),
                        });
                      }}
                      expandedDirs={expandedDirs}
                      onToggleDir={(nid) => setExpandedDirs((s) => { const n = new Set(s); n.has(nid) ? n.delete(nid) : n.add(nid); return n; })}
                    />
                  ))
                ) : (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-muted-foreground">No files yet</p>
                    <button onClick={() => setNewFileParent({ id: null, path: "" })} className="text-xs text-primary hover:underline mt-1">Create file</button>
                  </div>
                )
              ) : sidebarView === "search" ? (
                <div className="px-2 py-2">
                  <Input placeholder="Search files..." className="h-7 text-xs" data-testid="input-search-files" />
                  <p className="text-xs text-muted-foreground mt-2 px-1">Type to search across all files</p>
                </div>
              ) : (
                <div className="px-3 py-3 space-y-2">
                  <p className="text-xs text-muted-foreground">No changes</p>
                  <div className="space-y-1">
                    {[{ label: "main branch", icon: GitBranch }].map((b) => (
                      <div key={b.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <b.icon className="w-3 h-3" />{b.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Editor + terminal + AI */}
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Editor + terminal */}
          <Panel defaultSize={aiOpen ? 65 : 100} minSize={30}>
            <PanelGroup direction="vertical">
              {/* Editor area */}
              <Panel defaultSize={terminalOpen ? 70 : 100} minSize={20}>
                <div className="h-full flex flex-col">
                  {/* Tabs */}
                  <div className="flex items-center border-b border-border bg-card/40 overflow-x-auto scrollbar-none shrink-0 h-9">
                    {openTabs.length === 0 ? (
                      <div className="flex items-center gap-1.5 px-4 text-xs text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" />
                        Select a file to start editing
                      </div>
                    ) : (
                      openTabs.map((tab) => (
                        <button
                          key={tab.fileId}
                          onClick={() => setActiveTabId(tab.fileId)}
                          data-testid={`tab-${tab.fileId}`}
                          className={`group flex items-center gap-1.5 px-3 py-0 h-full border-r border-border text-xs whitespace-nowrap shrink-0 transition-colors ${activeTabId === tab.fileId ? "bg-background text-foreground border-b-2 border-b-primary -mb-px" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                        >
                          <span>{getFileIcon(tab.name)}</span>
                          <span>{tab.name}</span>
                          {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          <span
                            onClick={(e) => closeTab(tab.fileId, e)}
                            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                          >
                            <X className="w-3 h-3" />
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Editor */}
                  <div className="flex-1 overflow-hidden flex">
                    {activeTabId && !fileLoading ? (
                      <div className="flex-1 flex overflow-hidden editor-container">
                        {/* Line numbers */}
                        <div className="editor-line-numbers select-none py-2 px-2 min-w-[2.5rem] text-right overflow-hidden" style={{ fontSize: "13px", lineHeight: "1.6" }}>
                          {lines.map((_, i) => (
                            <div key={i} className="leading-relaxed">{i + 1}</div>
                          ))}
                        </div>
                        {/* Code area */}
                        <div className="flex-1 relative overflow-hidden">
                          <Textarea
                            ref={editorRef}
                            value={editorContent}
                            onChange={(e) => {
                              setEditorContent(e.target.value);
                              setOpenTabs((tabs) => tabs.map((t) => t.fileId === activeTabId ? { ...t, dirty: true } : t));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Tab") {
                                e.preventDefault();
                                const start = e.currentTarget.selectionStart;
                                const end = e.currentTarget.selectionEnd;
                                const newVal = editorContent.slice(0, start) + "  " + editorContent.slice(end);
                                setEditorContent(newVal);
                                requestAnimationFrame(() => {
                                  if (editorRef.current) {
                                    editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2;
                                  }
                                });
                              }
                            }}
                            className="absolute inset-0 w-full h-full resize-none border-0 rounded-none bg-transparent text-foreground font-mono text-[13px] leading-relaxed p-2 pl-3 focus:ring-0 focus:outline-none focus-visible:ring-0 scrollbar-thin"
                            spellCheck={false}
                            data-testid="editor-textarea"
                            style={{ fontSize: "13px", lineHeight: "1.6", caretColor: "hsl(var(--primary))" }}
                          />
                        </div>
                      </div>
                    ) : activeTabId && fileLoading ? (
                      <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <Code2 className="w-16 h-16 text-muted-foreground/20" />
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">No file open</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Select a file from the explorer</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status bar */}
                  <div className="h-5 border-t border-border bg-primary/10 flex items-center px-3 gap-4 text-xs text-muted-foreground shrink-0">
                    {activeTab && (
                      <>
                        <span className="text-primary font-mono">{activeLang}</span>
                        <span>{activeTab.path}</span>
                        <span>{lines.length} lines</span>
                        {activeTab.dirty && <span className="text-yellow-500">unsaved</span>}
                        {savingFileId === activeTab.fileId && <span className="text-primary flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5 animate-spin" />saving...</span>}
                      </>
                    )}
                    <div className="flex-1" />
                    <span className="text-primary">NovaDev IDE</span>
                    <span>{project?.language}</span>
                  </div>
                </div>
              </Panel>

              {/* Terminal */}
              {terminalOpen && (
                <>
                  <PanelResizeHandle className="h-1 bg-border hover:bg-primary/30 transition-colors cursor-row-resize" />
                  <Panel defaultSize={30} minSize={15}>
                    <div className="h-full flex flex-col bg-[hsl(224,30%,6%)]">
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/30 shrink-0">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-xs font-medium text-muted-foreground">Terminal</span>
                          <span className="text-xs text-green-400/60 font-mono">bash</span>
                        </div>
                        <button onClick={() => setTerminalOpen(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div ref={terminalRef} className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
                        <div className="terminal-output text-[12px]">
                          {terminalLines.map((line, i) => (
                            <span key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\x1b\[(\d+)m/g, (_, code) => {
                              const colorMap: Record<string, string> = {
                                "32": 'style="color:#4caf50"', "33": 'style="color:#ffc107"', "34": 'style="color:#2196f3"',
                                "35": 'style="color:#9c27b0"', "36": 'style="color:#00bcd4"', "31": 'style="color:#f44336"',
                                "1": 'style="font-weight:bold"', "0": "", "2J": "",
                              };
                              return colorMap[code] ? `<span ${colorMap[code]}>` : '</span>';
                            }) }} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 border-t border-border/30 shrink-0">
                        <span className="text-green-400 font-mono text-xs shrink-0">$</span>
                        <Input
                          value={terminalInput}
                          onChange={(e) => setTerminalInput(e.target.value)}
                          onKeyDown={handleTerminalKey}
                          placeholder="Enter command..."
                          className="flex-1 h-6 text-xs font-mono bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-green-300 placeholder:text-muted-foreground/40 p-0"
                          data-testid="input-terminal"
                        />
                        <button onClick={sendTerminalCommand} className="text-muted-foreground hover:text-foreground">
                          <Play className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {/* AI Chat */}
          {aiOpen && (
            <>
              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/30 transition-colors cursor-col-resize" />
              <Panel defaultSize={35} minSize={20} maxSize={50}>
                <div className="h-full flex flex-col border-l border-border">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/40 shrink-0">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold">AI Assistant</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="text-xs bg-muted border-0 rounded px-1.5 py-0.5 text-muted-foreground focus:ring-0 focus:outline-none"
                        data-testid="select-ai-model"
                      >
                        {AI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                      <button onClick={() => setAiOpen(false)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div ref={aiScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                    {(!aiHistory || aiHistory.length === 0) ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                        <Bot className="w-10 h-10 text-primary/30" />
                        <div>
                          <p className="text-sm font-medium">NovaDev AI</p>
                          <p className="text-xs text-muted-foreground mt-1">Ask me anything about your code. I can help debug, refactor, explain, and generate.</p>
                        </div>
                        <div className="flex flex-col gap-1.5 w-full">
                          {["Explain this file", "Find bugs in my code", "Refactor this function", "Generate unit tests"].map((s) => (
                            <button key={s} onClick={() => setAiMessage(s)} className="text-xs text-left px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-muted-foreground">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      aiHistory.map((msg) => (
                        <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`} data-testid={`msg-${msg.id}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                            {msg.role === "user" ? "U" : <Bot className="w-3.5 h-3.5" />}
                          </div>
                          <div className={`max-w-[85%] text-xs rounded-xl px-3 py-2 leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                            <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                          </div>
                        </div>
                      ))
                    )}
                    {sendAiMutation.isPending && (
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-1">
                          {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border p-3 shrink-0">
                    <div className="flex gap-2">
                      <Textarea
                        value={aiMessage}
                        onChange={(e) => setAiMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                        placeholder="Ask about your code... (Enter to send)"
                        rows={2}
                        className="flex-1 text-xs resize-none min-h-0"
                        data-testid="input-ai-message"
                      />
                      <Button size="sm" onClick={sendAiMessage} disabled={sendAiMutation.isPending || !aiMessage.trim()} className="self-end h-8 w-8 p-0" data-testid="button-ai-send">
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}
