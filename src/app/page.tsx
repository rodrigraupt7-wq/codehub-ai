"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProjectFile = {
  name: string;
  language: string;
  code: string;
};

type Tool =
  | "generator"
  | "chat"
  | "debugger"
  | "improve"
  | "convert"
  | "tests"
  | "projects"
  | "history";

type SavedProject = {
  id: string;
  name: string;
  files: ProjectFile[];
  updatedAt: string;
};

type HistoryItem = {
  id: string;
  type: string;
  details: string;
  date: string;
};

type UserPlan = "free" | "pro" | "promax";

function getLanguage(name: string) {
  if (name.endsWith(".html")) return "html";
  if (name.endsWith(".css")) return "css";
  if (name.endsWith(".js")) return "javascript";
  if (name.endsWith(".tsx")) return "typescript";
  if (name.endsWith(".ts")) return "typescript";
  if (name.endsWith(".jsx")) return "javascript";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".py")) return "python";
  if (name.endsWith(".java")) return "java";
  if (name.endsWith(".cs")) return "csharp";
  if (name.endsWith(".cpp")) return "cpp";
  return "text";
}

function parseFiles(text: string): ProjectFile[] {
  const files: ProjectFile[] = [];

  const regex =
    /###\s*(?:Ficheiro|Arquivo|File)\s*:\s*([^\n]+)\n```([^\n]*)\n([\s\S]*?)```/gi;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    files.push({
      name: match[1].trim(),
      language: getLanguage(match[1].trim()),
      code: match[3].trim(),
    });
  }

  return files;
}

function CodeEditor({
  file,
  onChange,
}: {
  file: ProjectFile;
  onChange: (code: string) => void;
}) {
  return (
    <textarea
      value={file.code}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      className="code-editor"
      aria-label={`Editor de ${file.name}`}
    />
  );
}

export default function Home() {
  const supabase = createClient();

  const [activeTool, setActiveTool] = useState<Tool>("generator");

  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [projectName, setProjectName] = useState("Novo projeto");
  const [copied, setCopied] = useState(false);

  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [toolCode, setToolCode] = useState("");
  const [toolFilename, setToolFilename] = useState("script.js");
  const [toolResult, setToolResult] = useState("");
  const [toolLoading, setToolLoading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("TypeScript");

  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // CONTA SUPABASE
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan>("free");
  const [userCredits, setUserCredits] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);

  const currentFile = useMemo(
    () => files.find((file) => file.name === selectedFile) ?? null,
    [files, selectedFile]
  );

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        setUserEmail(user.email ?? null);

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("plan, credits")
          .eq("id", user.id)
          .single();

        if (!error && profile) {
          const plan =
            profile.plan === "pro" ||
            profile.plan === "promax" ||
            profile.plan === "free"
              ? profile.plan
              : "free";

          setUserPlan(plan);
          setUserCredits(profile.credits ?? 0);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setProfileLoading(false);
      }
    }

    loadUser();

    try {
      const savedProjects = localStorage.getItem("codehub_projects");
      const savedHistory = localStorage.getItem("codehub_history");

      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }

      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch {
      console.log("Não foi possível carregar os dados locais.");
    }
  }, []);

  function getPlanName() {
    if (userPlan === "pro") return "⭐ Pro";
    if (userPlan === "promax") return "🚀 Pro Max";
    return "🆓 Free";
  }

  function getPlanClass() {
    if (userPlan === "pro") return "plan-pro";
    if (userPlan === "promax") return "plan-promax";
    return "plan-free";
  }

  function addHistory(type: string, details: string) {
    const item: HistoryItem = {
      id: Date.now().toString(),
      type,
      details,
      date: new Date().toLocaleString("pt-PT"),
    };

    setHistory((old) => {
      const updated = [item, ...old].slice(0, 100);
      localStorage.setItem("codehub_history", JSON.stringify(updated));
      return updated;
    });
  }

  function updateCurrentFile(code: string) {
    if (!selectedFile) return;

    setFiles((old) =>
      old.map((file) =>
        file.name === selectedFile ? { ...file, code } : file
      )
    );
  }

  function selectTool(tool: Tool) {
    setActiveTool(tool);
    setPreview(false);
    setToolResult("");

    if (currentFile) {
      setToolCode(currentFile.code);
      setToolFilename(currentFile.name);
    }
  }

  async function generateCode() {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResponse("");
    setPreview(false);

    try {
      const result = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || "Erro ao gerar projeto.");
      }

      const generatedFiles = parseFiles(data.response || "");

      if (generatedFiles.length > 0) {
        setFiles(generatedFiles);
        setSelectedFile(generatedFiles[0].name);

        const name =
          prompt
            .replace(
              /cria|crie|um|uma|site|website|aplicação|aplicacao/gi,
              ""
            )
            .trim()
            .slice(0, 40) || "Novo projeto";

        setProjectName(name);
        addHistory("Gerador", `Projeto criado: ${name}`);
      } else {
        setResponse(data.response || "A IA não devolveu código.");
      }
    } catch (error) {
      setResponse(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao gerar o projeto."
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return;

    const message = chatInput.trim();

    const updated = [
      ...chatMessages,
      { role: "user" as const, content: message },
    ];

    setChatMessages(updated);
    setChatInput("");
    setChatLoading(true);

    try {
      const result = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: chatMessages,
        }),
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || "Erro no AI Chat.");
      }

      setChatMessages([
        ...updated,
        {
          role: "assistant",
          content: data.response,
        },
      ]);

      addHistory("AI Chat", message.slice(0, 60));
    } catch (error) {
      setChatMessages([
        ...updated,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Não foi possível obter resposta.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function runCodeTool(tool: "debugger" | "improve" | "convert") {
    const code = currentFile?.code || toolCode;

    if (!code.trim() || toolLoading) return;

    setToolLoading(true);
    setToolResult("");

    const endpoint =
      tool === "debugger"
        ? "/api/fix"
        : tool === "improve"
          ? "/api/improve"
          : "/api/convert";

    try {
      const body: Record<string, string> = {
        code,
        filename: currentFile?.name || toolFilename,
      };

      if (tool === "convert") {
        body.targetLanguage = targetLanguage;
      }

      const result = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || "Erro na operação.");
      }

      const newCode = data.code || "";

      setToolCode(newCode);
      setToolResult(newCode);

      if (currentFile) {
        updateCurrentFile(newCode);
      }

      addHistory(
        tool === "debugger"
          ? "Debugger"
          : tool === "improve"
            ? "Melhorar código"
            : "Converter código",
        currentFile?.name || toolFilename
      );
    } catch (error) {
      setToolResult(
        error instanceof Error ? error.message : "Ocorreu um erro."
      );
    } finally {
      setToolLoading(false);
    }
  }

  async function runTests() {
    const code = currentFile?.code || toolCode;

    if (!code.trim() || toolLoading) return;

    setToolLoading(true);
    setToolResult("");

    try {
      const result = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          filename: currentFile?.name || toolFilename,
        }),
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || "Erro ao gerar testes.");
      }

      setToolResult(data.response || "");

      addHistory(
        "Testes",
        `Testes analisados para ${currentFile?.name || toolFilename}`
      );
    } catch (error) {
      setToolResult(
        error instanceof Error ? error.message : "Ocorreu um erro."
      );
    } finally {
      setToolLoading(false);
    }
  }

  function saveProject() {
    if (files.length === 0) {
      alert("Não tens nenhum projeto para guardar.");
      return;
    }

    const existing = projects.find(
      (project) => project.name === projectName
    );

    const project: SavedProject = {
      id: existing?.id || Date.now().toString(),
      name: projectName || "Novo projeto",
      files,
      updatedAt: new Date().toISOString(),
    };

    const updated = [
      project,
      ...projects.filter((item) => item.id !== project.id),
    ];

    setProjects(updated);
    localStorage.setItem("codehub_projects", JSON.stringify(updated));

    addHistory("Projetos", `Projeto guardado: ${project.name}`);
    alert("Projeto guardado localmente.");
  }

  function openProject(project: SavedProject) {
    setFiles(project.files);
    setProjectName(project.name);
    setSelectedFile(project.files[0]?.name || null);
    setActiveTool("generator");
    setPreview(false);

    addHistory("Projetos", `Projeto aberto: ${project.name}`);
  }

  function deleteProject(id: string) {
    const updated = projects.filter((project) => project.id !== id);

    setProjects(updated);
    localStorage.setItem("codehub_projects", JSON.stringify(updated));
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("codehub_history");
  }

  function newProject() {
    setFiles([]);
    setSelectedFile(null);
    setResponse("");
    setPrompt("");
    setPreview(false);
    setProjectName("Novo projeto");
    setToolCode("");
    setToolResult("");
    setActiveTool("generator");
  }

  async function copyCode() {
    if (!currentFile) return;

    await navigator.clipboard.writeText(currentFile.code);
    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  }

  function downloadFile(file: ProjectFile) {
    const blob = new Blob([file.code], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = file.name;
    link.click();

    URL.revokeObjectURL(url);
  }

  function downloadProject() {
    files.forEach((file, index) => {
      setTimeout(() => downloadFile(file), index * 200);
    });
  }

  function buildPreview() {
    const htmlFile = files.find((file) => file.name === "index.html");
    const cssFile = files.find((file) => file.name === "styles.css");
    const jsFile = files.find((file) => file.name === "script.js");

    if (!htmlFile) {
      return "<h1>index.html não encontrado</h1>";
    }

    let html = htmlFile.code;

    if (cssFile) {
      const css = `<style>${cssFile.code}</style>`;

      if (html.includes("</head>")) {
        html = html.replace("</head>", `${css}</head>`);
      } else {
        html = css + html;
      }
    }

    if (jsFile) {
      const js = `<script>${jsFile.code}</script>`;

      if (html.includes("</body>")) {
        html = html.replace("</body>", `${js}</body>`);
      } else {
        html += js;
      }
    }

    return html;
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function renderChat() {
    return (
      <div className="tool-page">
        <div className="tool-header">
          <div>
            <h1>✦ AI Chat</h1>
            <p>Fala diretamente com o CodeHub AI.</p>
          </div>

          <button
            className="secondary-button"
            onClick={() => setChatMessages([])}
          >
            Limpar chat
          </button>
        </div>

        <div className="chat-container">
          <div className="chat-messages">
            {chatMessages.length === 0 && (
              <div className="empty-tool">
                <div className="big-icon">✦</div>
                <h2>Como posso ajudar?</h2>
                <p>
                  Pergunta sobre programação, debugging, projetos ou código.
                </p>
              </div>
            )}

            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`chat-message ${message.role}`}
              >
                <div className="message-role">
                  {message.role === "user" ? "Tu" : "CodeHub AI"}
                </div>

                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="chat-message assistant">
                <div className="message-role">CodeHub AI</div>
                <div className="message-content">A pensar...</div>
              </div>
            )}
          </div>

          <div className="chat-input">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              placeholder="Pergunta alguma coisa..."
            />

            <button
              className="generate-button"
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
            >
              Enviar ✦
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderCodeTool(
    title: string,
    description: string,
    tool: "debugger" | "improve" | "convert"
  ) {
    return (
      <div className="tool-page">
        <div className="tool-header">
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>

        <div className="tool-grid">
          <div className="tool-card">
            <div className="field-row">
              <input
                value={toolFilename}
                onChange={(e) => setToolFilename(e.target.value)}
                placeholder="Nome do ficheiro"
              />

              {tool === "convert" && (
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                >
                  <option>TypeScript</option>
                  <option>JavaScript</option>
                  <option>Python</option>
                  <option>Java</option>
                  <option>C#</option>
                  <option>C++</option>
                  <option>HTML</option>
                  <option>CSS</option>
                </select>
              )}
            </div>

            <textarea
              className="tool-code"
              value={toolCode}
              onChange={(e) => setToolCode(e.target.value)}
              placeholder="Cola aqui o teu código..."
              spellCheck={false}
            />

            <button
              className="generate-button wide"
              onClick={() => runCodeTool(tool)}
              disabled={toolLoading || !toolCode.trim()}
            >
              {toolLoading
                ? "🔄 A trabalhar..."
                : tool === "debugger"
                  ? "🐞 Corrigir código"
                  : tool === "improve"
                    ? "✦ Melhorar código"
                    : "↔ Converter código"}
            </button>
          </div>

          <div className="tool-card result-card">
            <div className="result-title">Resultado</div>

            {toolResult ? (
              <pre>{toolResult}</pre>
            ) : (
              <div className="empty-result">
                O resultado aparecerá aqui.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderTests() {
    return (
      <div className="tool-page">
        <div className="tool-header">
          <div>
            <h1>✓ Testes</h1>
            <p>Analisa o código e gera testes e casos de teste.</p>
          </div>
        </div>

        <div className="tool-card tests-card">
          <textarea
            className="tool-code"
            value={toolCode}
            onChange={(e) => setToolCode(e.target.value)}
            placeholder="Cola aqui o código que queres testar..."
            spellCheck={false}
          />

          <button
            className="generate-button wide"
            onClick={runTests}
            disabled={toolLoading || !toolCode.trim()}
          >
            {toolLoading ? "🔄 A analisar..." : "✓ Gerar testes"}
          </button>

          {toolResult && (
            <pre className="test-result">{toolResult}</pre>
          )}
        </div>
      </div>
    );
  }

  function renderProjects() {
    return (
      <div className="tool-page">
        <div className="tool-header">
          <div>
            <h1>📁 Projetos</h1>
            <p>Os teus projetos ficam guardados neste navegador.</p>
          </div>

          <button
            className="generate-button"
            onClick={saveProject}
            disabled={files.length === 0}
          >
            💾 Guardar atual
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="empty-tool">
            <div className="big-icon">📁</div>
            <h2>Nenhum projeto guardado</h2>
            <p>Cria um projeto e guarda-o para aparecer aqui.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <div className="project-card" key={project.id}>
                <div className="project-icon">📁</div>

                <div className="project-info">
                  <strong>{project.name}</strong>
                  <span>{project.files.length} ficheiros</span>

                  <small>
                    {new Date(project.updatedAt).toLocaleString("pt-PT")}
                  </small>
                </div>

                <div className="project-actions">
                  <button
                    className="small-button"
                    onClick={() => openProject(project)}
                  >
                    Abrir
                  </button>

                  <button
                    className="small-button danger"
                    onClick={() => deleteProject(project.id)}
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderHistory() {
    return (
      <div className="tool-page">
        <div className="tool-header">
          <div>
            <h1>◷ Histórico</h1>
            <p>Vê o que fizeste recentemente no CodeHub AI.</p>
          </div>

          {history.length > 0 && (
            <button className="secondary-button" onClick={clearHistory}>
              Limpar histórico
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="empty-tool">
            <div className="big-icon">◷</div>
            <h2>Histórico vazio</h2>
            <p>As tuas ações aparecerão aqui.</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div className="history-item" key={item.id}>
                <div className="history-icon">✦</div>

                <div>
                  <strong>{item.type}</strong>
                  <p>{item.details}</p>
                </div>

                <time>{item.date}</time>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderGenerator() {
    if (files.length > 0) {
      return (
        <div className="editor-page">
          <header className="editor-header">
            <div className="brand">
              <div className="brand-logo">C</div>

              <div>
                <div className="brand-name">CodeHub AI</div>
                <div className="project-title">{projectName}</div>
              </div>
            </div>

            <div className="header-actions">
              <button
                className="secondary-button"
                onClick={() => setPreview(!preview)}
              >
                {preview ? "⌨️ Editor" : "▶️ Pré-visualizar"}
              </button>

              <button
                className="secondary-button"
                onClick={saveProject}
              >
                💾 Guardar projeto
              </button>

              <button
                className="secondary-button"
                onClick={downloadProject}
              >
                ⬇️ Descarregar
              </button>

              <button className="new-button" onClick={newProject}>
                + Novo
              </button>
            </div>
          </header>

          <div className="editor-layout">
            <aside className="file-sidebar">
              <div className="sidebar-title">
                <span>Ficheiros</span>
                <span className="file-count">{files.length}</span>
              </div>

              <div className="file-list">
                {files.map((file) => (
                  <button
                    key={file.name}
                    onClick={() => {
                      setSelectedFile(file.name);
                      setPreview(false);
                    }}
                    className={`file-item ${
                      file.name === selectedFile ? "active" : ""
                    }`}
                  >
                    <span>
                      {file.name.endsWith(".html")
                        ? "🌐"
                        : file.name.endsWith(".css")
                          ? "🎨"
                          : file.name.endsWith(".js")
                            ? "⚡"
                            : "📄"}
                    </span>

                    <span>{file.name}</span>
                  </button>
                ))}
              </div>

              <button
                className="back-button"
                onClick={() => setFiles([])}
              >
                ← Voltar ao início
              </button>
            </aside>

            <main className="workspace">
              {!preview ? (
                <>
                  <div className="workspace-header">
                    <strong>{currentFile?.name}</strong>

                    {currentFile && (
                      <div className="editor-actions">
                        <span className="language">
                          {currentFile.language}
                        </span>

                        <button
                          className="small-button"
                          onClick={() => {
                            setToolCode(currentFile.code);
                            setToolFilename(currentFile.name);
                            setActiveTool("debugger");
                          }}
                        >
                          🐞 Corrigir
                        </button>

                        <button
                          className="small-button"
                          onClick={() => {
                            setToolCode(currentFile.code);
                            setToolFilename(currentFile.name);
                            setActiveTool("improve");
                          }}
                        >
                          ✦ Melhorar
                        </button>

                        <button
                          className="small-button"
                          onClick={() => {
                            setToolCode(currentFile.code);
                            setToolFilename(currentFile.name);
                            setActiveTool("convert");
                          }}
                        >
                          ↔ Converter
                        </button>

                        <button
                          className="small-button"
                          onClick={copyCode}
                        >
                          {copied ? "✓ Copiado" : "📋 Copiar"}
                        </button>

                        <button
                          className="small-button"
                          onClick={() =>
                            currentFile && downloadFile(currentFile)
                          }
                        >
                          ⬇️ Guardar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="editor-container">
                    {currentFile ? (
                      <CodeEditor
                        file={currentFile}
                        onChange={updateCurrentFile}
                      />
                    ) : (
                      <div className="empty-editor">
                        <div>📁</div>
                        <h2>Seleciona um ficheiro</h2>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="preview-container">
                  <div className="preview-header">
                    <strong>▶️ Pré-visualização</strong>

                    <button
                      className="small-button"
                      onClick={() => setPreview(false)}
                    >
                      ✕ Fechar
                    </button>
                  </div>

                  <iframe
                    title="Pré-visualização"
                    srcDoc={buildPreview()}
                    sandbox="allow-scripts"
                    className="preview-frame"
                  />
                </div>
              )}
            </main>
          </div>
        </div>
      );
    }

    return (
      <div className="generator-page">
        <div className="hero">
          <div className="hero-icon">✦</div>

          <h1>
            O que vamos <span>criar?</span>
          </h1>

          <p>
            Descreve o que queres construir e o CodeHub AI cria o projeto.
          </p>

          <div className="prompt-box">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generateCode();
                }
              }}
              placeholder="Ex: Cria uma loja de roupa moderna chamada Kivaro..."
            />

            <div className="prompt-footer">
              <span>
                Enter para gerar • Shift + Enter para nova linha
              </span>

              <button
                className="generate-button"
                onClick={generateCode}
                disabled={loading || !prompt.trim()}
              >
                {loading ? "A gerar..." : "✦ Gerar projeto"}
              </button>
            </div>
          </div>

          <div className="suggestions">
            <button
              onClick={() =>
                setPrompt(
                  "Cria uma loja de roupa moderna chamada Kivaro, com pesquisa, categorias, carrinho funcional, preços em euros e design responsivo."
                )
              }
            >
              🛍️ Loja online
            </button>

            <button
              onClick={() =>
                setPrompt(
                  "Cria um jogo web moderno com HTML, CSS e JavaScript, incluindo pontuação, níveis e sistema de reinício."
                )
              }
            >
              🎮 Jogo
            </button>

            <button
              onClick={() =>
                setPrompt(
                  "Cria um website profissional moderno e responsivo para uma empresa tecnológica."
                )
              }
            >
              🌐 Website
            </button>
          </div>

          {loading && (
            <div className="loading-box">
              <div className="loading-spinner" />
              <strong>O CodeHub AI está a criar...</strong>
              <span>A escrever e verificar o código.</span>
            </div>
          )}

          {response && !loading && (
            <div className="response-box">
              <strong>Resposta da IA</strong>
              <pre>{response}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderContent() {
    switch (activeTool) {
      case "chat":
        return renderChat();

      case "debugger":
        return renderCodeTool(
          "🐞 Debugger",
          "Encontra e corrige problemas no teu código.",
          "debugger"
        );

      case "improve":
        return renderCodeTool(
          "✦ Melhorar código",
          "Torna o código mais limpo, organizado e eficiente.",
          "improve"
        );

      case "convert":
        return renderCodeTool(
          "↔ Converter código",
          "Converte o teu código para outra linguagem.",
          "convert"
        );

      case "tests":
        return renderTests();

      case "projects":
        return renderProjects();

      case "history":
        return renderHistory();

      default:
        return renderGenerator();
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="home-brand">
          <div className="home-logo">C</div>
          <strong>CodeHub AI</strong>
        </div>

        <button className="create-button" onClick={newProject}>
          + Novo projeto
        </button>

        <nav>
          <button
            className={`nav-item ${
              activeTool === "chat" ? "active" : ""
            }`}
            onClick={() => selectTool("chat")}
          >
            ✦ AI Chat
          </button>

          <button
            className={`nav-item ${
              activeTool === "generator" ? "active" : ""
            }`}
            onClick={() => selectTool("generator")}
          >
            ⌘ Gerador de código
          </button>

          <button
            className={`nav-item ${
              activeTool === "debugger" ? "active" : ""
            }`}
            onClick={() => selectTool("debugger")}
          >
            🐞 Debugger
          </button>

          <button
            className={`nav-item ${
              activeTool === "improve" ? "active" : ""
            }`}
            onClick={() => selectTool("improve")}
          >
            ✦ Melhorar código
          </button>

          <button
            className={`nav-item ${
              activeTool === "convert" ? "active" : ""
            }`}
            onClick={() => selectTool("convert")}
          >
            ↔ Converter código
          </button>

          <button
            className={`nav-item ${
              activeTool === "tests" ? "active" : ""
            }`}
            onClick={() => selectTool("tests")}
          >
            ✓ Testes
          </button>

          <button
            className={`nav-item ${
              activeTool === "projects" ? "active" : ""
            }`}
            onClick={() => selectTool("projects")}
          >
            📁 Projetos
          </button>

          <button
            className={`nav-item ${
              activeTool === "history" ? "active" : ""
            }`}
            onClick={() => selectTool("history")}
          >
            ◷ Histórico
          </button>
        </nav>

        <div className="sidebar-bottom">

          {/* CONTA */}
          <div className="account-box">
            <div className="account-label">Conta</div>

            <div className="account-email">
              {userEmail || "A carregar..."}
            </div>

            <button
              className="account-logout"
              onClick={logout}
            >
              Sair
            </button>
          </div>

          {/* PLANO */}
          <div className={`plan-box ${getPlanClass()}`}>
            <div className="plan-box-header">
              <div>
                <span className="plan-label">PLANO ATUAL</span>

                <strong className="plan-name">
                  {profileLoading ? "A carregar..." : getPlanName()}
                </strong>
              </div>

              <div className="plan-icon">
                {userPlan === "free"
                  ? "🆓"
                  : userPlan === "pro"
                    ? "⭐"
                    : "🚀"}
              </div>
            </div>

            <div className="credits-row">
              <span>Créditos</span>

              <strong>
                {profileLoading ? "..." : userCredits}
              </strong>
            </div>

            <button
              className="upgrade-button"
              onClick={() => {
                window.location.href = "/pricing";
              }}
            >
              {userPlan === "free"
                ? "⭐ Ver planos"
                : "⚡ Gerir plano"}
            </button>
          </div>

          {/* GEMINI */}
          <div className="credits">
            <span>IA</span>
            <strong>Gemini Online</strong>
          </div>

          <div className="gemini-status">
            <span />
            Gemini AI online
          </div>
        </div>
      </aside>

      <main className="main">{renderContent()}</main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #08090c;
          color: #f5f5f5;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        button,
        textarea,
        input,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .app {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(
              circle at 55% 10%,
              rgba(99,102,241,.09),
              transparent 35%
            ),
            #08090c;
        }

        .sidebar {
          width: 250px;
          min-height: 100vh;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          padding: 18px 12px;
          border-right: 1px solid #202229;
          background: #0b0c10;
        }

        .home-brand,
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .home-brand {
          padding: 4px 8px 20px;
        }

        .home-logo,
        .brand-logo {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            #7c3aed,
            #4f46e5
          );
          font-weight: 800;
        }

        .create-button {
          border: 1px solid #292d36;
          border-radius: 9px;
          padding: 10px;
          color: white;
          background: #15171d;
          text-align: left;
          margin-bottom: 15px;
        }

        .create-button:hover {
          background: #1b1e25;
        }

        nav {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .nav-item {
          width: 100%;
          border: 0;
          border-radius: 8px;
          padding: 10px;
          background: transparent;
          color: #8e949f;
          text-align: left;
          font-size: 13px;
        }

        .nav-item:hover,
        .nav-item.active {
          background: #171920;
          color: white;
        }

        .sidebar-bottom {
          margin-top: auto;
        }

        /* CONTA */

        .account-box {
          padding: 10px 8px;
          margin-bottom: 8px;
          border: 1px solid #292d36;
          border-radius: 9px;
          background: #111318;
        }

        .account-label {
          font-size: 11px;
          color: #777d88;
          margin-bottom: 5px;
        }

        .account-email {
          color: #e9eaf0;
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .account-logout {
          width: 100%;
          margin-top: 8px;
          padding: 7px 10px;
          border: 1px solid #292d36;
          border-radius: 7px;
          background: #181a20;
          color: #cfd2da;
          font-size: 11px;
        }

        .account-logout:hover {
          background: #242730;
          color: white;
        }

        /* PLANO */

        .plan-box {
          margin-bottom: 8px;
          padding: 11px 9px;
          border: 1px solid #292d36;
          border-radius: 10px;
          background: #111318;
        }

        .plan-box-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 11px;
        }

        .plan-box-header > div:first-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .plan-label {
          color: #777d88;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .plan-name {
          color: #f1f1f5;
          font-size: 12px;
          font-weight: 750;
        }

        .plan-icon {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: #181a21;
          font-size: 15px;
        }

        .plan-free {
          border-color: #292d36;
        }

        .plan-pro {
          border-color: rgba(99, 91, 255, .45);
          background:
            linear-gradient(
              135deg,
              rgba(99,91,255,.10),
              #111318
            );
        }

        .plan-promax {
          border-color: rgba(168, 85, 247, .55);
          background:
            linear-gradient(
              135deg,
              rgba(168,85,247,.12),
              #111318
            );
        }

        .credits-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 9px;
          padding-top: 8px;
          border-top: 1px solid #22252d;
        }

        .credits-row span {
          color: #777d88;
          font-size: 10px;
        }

        .credits-row strong {
          color: #a78bfa;
          font-size: 12px;
        }

        .upgrade-button {
          width: 100%;
          border: 0;
          border-radius: 7px;
          padding: 8px;
          background: #635bff;
          color: white;
          font-size: 11px;
          font-weight: 700;
          transition: .15s;
        }

        .upgrade-button:hover {
          background: #716aff;
          transform: translateY(-1px);
        }

        .credits {
          display: flex;
          justify-content: space-between;
          padding: 10px 8px;
          color: #777d88;
          font-size: 12px;
        }

        .credits strong {
          color: #b4b8c1;
        }

        .gemini-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px;
          color: #777d88;
          font-size: 11px;
        }

        .gemini-status span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 10px #4ade80;
        }

        .main {
          flex: 1;
          min-width: 0;
          min-height: 100vh;
        }

        .generator-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          padding: 70px 24px;
        }

        .hero {
          width: min(850px,100%);
          text-align: center;
        }

        .hero-icon,
        .big-icon {
          width: 50px;
          height: 50px;
          margin: 30px auto 18px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: #15131f;
          color: #9b8cff;
          font-size: 22px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(34px,5vw,54px);
          letter-spacing: -.04em;
        }

        .hero h1 span {
          background: linear-gradient(90deg,#a78bfa,#6366f1);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }

        .hero > p {
          color: #858b96;
          margin: 15px auto 35px;
        }

        .prompt-box {
          overflow: hidden;
          border: 1px solid #292d36;
          border-radius: 15px;
          background: #101116;
          text-align: left;
        }

        .prompt-box textarea {
          width: 100%;
          height: 145px;
          resize: none;
          border: 0;
          outline: 0;
          padding: 18px;
          background: transparent;
          color: white;
          line-height: 1.6;
        }

        .prompt-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-top: 1px solid #202229;
          color: #656b76;
          font-size: 11px;
        }

        .generate-button {
          border: 0;
          border-radius: 9px;
          padding: 9px 15px;
          background: #635bff;
          color: white;
          font-weight: 650;
        }

        .generate-button:hover:not(:disabled) {
          background: #716aff;
        }

        .generate-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .wide {
          width: 100%;
          margin-top: 12px;
        }

        .suggestions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 15px;
        }

        .suggestions button {
          border: 1px solid #242730;
          border-radius: 999px;
          padding: 8px 12px;
          background: #0e0f13;
          color: #8e949f;
        }

        .loading-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-top: 35px;
          color: #c4c7cf;
        }

        .loading-spinner {
          width: 26px;
          height: 26px;
          border: 3px solid #292d36;
          border-top-color: #8178ff;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .response-box,
        .tool-card {
          margin-top: 30px;
          border: 1px solid #252831;
          border-radius: 13px;
          background: #0d0e12;
          overflow: hidden;
        }

        .response-box {
          text-align: left;
        }

        .response-box strong,
        .result-title {
          display: block;
          padding: 12px 15px;
          border-bottom: 1px solid #252831;
          font-size: 12px;
        }

        pre {
          white-space: pre-wrap;
          word-break: break-word;
          font-family: Consolas, monospace;
          line-height: 1.6;
        }

        .response-box pre {
          max-height: 600px;
          overflow: auto;
          margin: 0;
          padding: 18px;
          color: #cdd1d9;
          font-size: 12px;
        }

        .tool-page {
          min-height: 100vh;
          padding: 35px;
        }

        .tool-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .tool-header h1 {
          margin: 0 0 5px;
          font-size: 25px;
        }

        .tool-header p {
          margin: 0;
          color: #777d88;
          font-size: 13px;
        }

        .secondary-button,
        .small-button,
        .back-button {
          border: 1px solid #292d36;
          background: #111318;
          color: #e9eaf0;
          border-radius: 9px;
          padding: 9px 13px;
        }

        .secondary-button:hover,
        .small-button:hover,
        .back-button:hover {
          background: #191c23;
        }

        .tool-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .tool-card {
          margin: 0;
          padding: 15px;
        }

        .field-row {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }

        .field-row input,
        .field-row select {
          min-width: 0;
          flex: 1;
          border: 1px solid #292d36;
          border-radius: 8px;
          padding: 9px;
          background: #111318;
          color: white;
          outline: none;
        }

        .tool-code {
          width: 100%;
          height: 480px;
          resize: vertical;
          border: 1px solid #292d36;
          border-radius: 9px;
          outline: none;
          padding: 15px;
          background: #090a0d;
          color: #e6e8ed;
          font-family: Consolas, monospace;
          font-size: 13px;
          line-height: 1.6;
        }

        .result-card {
          padding: 0;
        }

        .result-card pre {
          height: 530px;
          overflow: auto;
          margin: 0;
          padding: 15px;
          color: #d5d8df;
          font-size: 12px;
        }

        .empty-result,
        .empty-tool {
          display: grid;
          place-items: center;
          text-align: center;
          min-height: 300px;
          color: #6f7580;
          padding: 30px;
        }

        .empty-tool h2 {
          color: #e6e8ed;
          margin: 0 0 6px;
        }

        .empty-tool p {
          margin: 0;
        }

        .big-icon {
          margin: 0 auto 15px;
        }

        .chat-container {
          max-width: 950px;
          margin: auto;
        }

        .chat-messages {
          min-height: 500px;
          max-height: 65vh;
          overflow: auto;
          padding: 15px;
          border: 1px solid #252831;
          border-radius: 13px 13px 0 0;
          background: #0d0e12;
        }

        .chat-message {
          max-width: 85%;
          margin-bottom: 18px;
          padding: 13px;
          border-radius: 11px;
        }

        .chat-message.user {
          margin-left: auto;
          background: #1c1b31;
        }

        .chat-message.assistant {
          background: #15171d;
        }

        .message-role {
          margin-bottom: 7px;
          color: #9992ff;
          font-size: 11px;
          font-weight: 700;
        }

        .message-content {
          white-space: pre-wrap;
          color: #d8dbe2;
          font-size: 13px;
          line-height: 1.6;
        }

        .chat-input {
          display: flex;
          gap: 10px;
          padding: 12px;
          border: 1px solid #252831;
          border-top: 0;
          background: #101116;
          border-radius: 0 0 13px 13px;
        }

        .chat-input textarea {
          flex: 1;
          min-height: 55px;
          resize: none;
          border: 0;
          outline: 0;
          background: transparent;
          color: white;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(280px,1fr)
          );
          gap: 12px;
        }

        .project-card {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 15px;
          border: 1px solid #252831;
          border-radius: 12px;
          background: #0d0e12;
        }

        .project-icon {
          font-size: 28px;
        }

        .project-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .project-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .project-info span,
        .project-info small {
          color: #777d88;
          font-size: 11px;
        }

        .project-actions {
          display: flex;
          gap: 5px;
        }

        .danger:hover {
          border-color: #7f3030;
          color: #ff8a8a;
        }

        .history-list {
          max-width: 900px;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          border-bottom: 1px solid #202229;
          background: #0d0e12;
        }

        .history-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: #17152a;
          color: #9b8cff;
        }

        .history-item div:nth-child(2) {
          flex: 1;
        }

        .history-item p {
          margin: 4px 0 0;
          color: #777d88;
          font-size: 12px;
        }

        .history-item time {
          color: #666b75;
          font-size: 10px;
        }

        .editor-page {
          min-height: 100vh;
          background: #08090c;
        }

        .editor-header {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          border-bottom: 1px solid #202229;
          background: #0b0c10;
        }

        .brand-name {
          font-weight: 750;
        }

        .project-title {
          color: #777d88;
          font-size: 11px;
          margin-top: 2px;
        }

        .header-actions,
        .editor-actions {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .new-button {
          border: 0;
          border-radius: 9px;
          padding: 9px 13px;
          background: #635bff;
          color: white;
          font-weight: 650;
        }

        .editor-layout {
          display: flex;
          height: calc(100vh - 72px);
        }

        .file-sidebar {
          width: 230px;
          flex-shrink: 0;
          padding: 15px 10px;
          border-right: 1px solid #202229;
          background: #0c0d11;
        }

        .sidebar-title {
          display: flex;
          justify-content: space-between;
          padding: 0 9px 12px;
          color: #858b96;
          font-size: 11px;
          text-transform: uppercase;
        }

        .file-count {
          padding: 3px 7px;
          border-radius: 5px;
          background: #181b22;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .file-item {
          width: 100%;
          display: flex;
          gap: 9px;
          align-items: center;
          border: 0;
          border-radius: 8px;
          padding: 10px;
          background: transparent;
          color: #aeb3be;
          text-align: left;
        }

        .file-item:hover,
        .file-item.active {
          background: #1c1f29;
          color: white;
        }

        .back-button {
          width: 100%;
          margin-top: 20px;
          text-align: left;
        }

        .workspace {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .workspace-header {
          min-height: 53px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 14px;
          border-bottom: 1px solid #202229;
          background: #0d0e12;
        }

        .language {
          color: #6f7580;
          font-size: 11px;
        }

        .editor-container {
          flex: 1;
          min-height: 0;
        }

        .code-editor {
          width: 100%;
          height: 100%;
          min-height: 500px;
          resize: none;
          border: 0;
          outline: 0;
          padding: 22px;
          background: #090a0d;
          color: #e6e8ed;
          font-family: Consolas, monospace;
          font-size: 13px;
          line-height: 1.65;
        }

        .preview-container {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid #202229;
        }

        .preview-frame {
          flex: 1;
          width: 100%;
          border: 0;
          background: white;
        }

        @media (max-width: 900px) {
          .tool-grid {
            grid-template-columns: 1fr;
          }

          .sidebar {
            width: 210px;
          }
        }

        @media (max-width: 650px) {
          .sidebar {
            width: 65px;
            padding: 12px 7px;
          }

          .home-brand strong,
          .create-button,
          .nav-item,
          .credits,
          .gemini-status,
          .account-box,
          .plan-box {
            font-size: 0;
          }

          .home-brand {
            justify-content: center;
          }

          .home-logo {
            width: 38px;
          }

          .nav-item {
            text-align: center;
            padding: 12px 3px;
          }

          .tool-page {
            padding: 20px 12px;
          }

          .tool-header {
            align-items: flex-start;
          }

          .editor-header {
            padding: 0 10px;
          }

          .file-sidebar {
            width: 150px;
          }

          .header-actions .secondary-button {
            display: none;
          }

          .plan-box {
            padding: 5px;
          }

          .plan-box-header {
            justify-content: center;
          }

          .plan-box-header > div:first-child {
            display: none;
          }

          .plan-icon {
            width: 34px;
            height: 34px;
          }

          .credits-row,
          .upgrade-button {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}