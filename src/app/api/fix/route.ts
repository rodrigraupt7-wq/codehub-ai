import { NextResponse } from "next/server";
import ollama from "ollama";

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
      model: "qwen2.5-coder:7b",
      messages: [
        {
          role: "system",
          content: `
És o sistema de debugging do CodeHub AI.

Analisa código fornecido pelo utilizador.

A tua tarefa é:
- encontrar erros;
- encontrar bugs;
- encontrar funções que não funcionam;
- encontrar eventos incorretos;
- encontrar referências inexistentes;
- corrigir problemas;
- manter a funcionalidade original;
- melhorar a estabilidade quando necessário.

IMPORTANTE:
- Devolve APENAS o código corrigido.
- Não uses Markdown.
- Não uses blocos de código.
- Não expliques o que fizeste.
- Não uses "...".
- Não omitas nenhuma parte do código.
- Devolve o ficheiro COMPLETO.
`,
        },
        {
          role: "user",
          content: `
Ficheiro: ${filename}

Código:

${code}

Analisa cuidadosamente este código, corrige todos os problemas encontrados e devolve o ficheiro completo corrigido.
`,
        },
      ],
    });

    return NextResponse.json({
      code: result.message.content,
    });
  } catch (error) {
    console.error("Erro ao corrigir código:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível corrigir o código. Verifica se o Ollama está a funcionar.",
      },
      { status: 500 }
    );
  }
}