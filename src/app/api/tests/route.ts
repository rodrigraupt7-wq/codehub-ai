import { NextResponse } from "next/server";
import ollama from "ollama";

const MODEL = "qwen2.5-coder:7b";

export async function POST(request: Request) {
  try {
    const { code, filename } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Código inválido." },
        { status: 400 }
      );
    }

    const result = await ollama.chat({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `
És o sistema de testes do CodeHub AI.

Analisa o código fornecido.

Cria uma análise profissional contendo:

1. Resumo do que deve ser testado.
2. Possíveis bugs.
3. Casos de teste importantes.
4. Casos limite.
5. Testes recomendados.
6. Se for JavaScript ou TypeScript, cria um ficheiro de testes completo usando Vitest.
7. Se for HTML/CSS, cria testes funcionais que possam ser verificados no navegador.

Não inventes funcionalidades.

Responde em português de Portugal.

Não uses "..." para esconder código.
`,
        },
        {
          role: "user",
          content: `
Ficheiro: ${filename}

Código:

${code}

Analisa este código e cria uma estratégia completa de testes.
`,
        },
      ],
    });

    return NextResponse.json({
      response: result.message.content,
    });
  } catch (error) {
    console.error("Erro nos testes:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível gerar os testes. Verifica se o Ollama está ligado.",
      },
      { status: 500 }
    );
  }
}