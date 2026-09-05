import { NextResponse } from "next/server";
import ollama from "ollama";

const MODEL = "qwen2.5-coder:7b";

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Mensagem inválida." },
        { status: 400 }
      );
    }

    const messages = [
      {
        role: "system" as const,
        content: `
És o AI Chat do CodeHub AI.

És um assistente de programação.
Responde em português de Portugal.

Podes ajudar com:
- programação;
- debugging;
- HTML;
- CSS;
- JavaScript;
- TypeScript;
- Python;
- React;
- Next.js;
- criação de projetos;
- explicação de código;
- otimização;
- arquitetura de software.

Sê claro e útil.
Quando o utilizador pedir código, fornece código completo.
Não inventes funcionalidades que não foram pedidas.
`,
      },
      ...(Array.isArray(history) ? history : []),
      {
        role: "user" as const,
        content: message,
      },
    ];

    const result = await ollama.chat({
      model: MODEL,
      messages,
    });

    return NextResponse.json({
      response: result.message.content,
    });
  } catch (error) {
    console.error("Erro no AI Chat:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível contactar a IA. Verifica se o Ollama está ligado.",
      },
      { status: 500 }
    );
  }
}