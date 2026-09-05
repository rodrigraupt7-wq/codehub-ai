import { NextResponse } from "next/server";
import ollama from "ollama";

const MODEL = "qwen2.5-coder:7b";

export async function POST(request: Request) {
  try {
    const { code, filename, targetLanguage } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Código inválido." },
        { status: 400 }
      );
    }

    if (!targetLanguage || typeof targetLanguage !== "string") {
      return NextResponse.json(
        { error: "Escolhe uma linguagem de destino." },
        { status: 400 }
      );
    }

    const result = await ollama.chat({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `
És o sistema "Converter Código" do CodeHub AI.

Converte código de uma linguagem para outra.

REGRAS:

- Mantém a funcionalidade original.
- Mantém a lógica original sempre que possível.
- Adapta a sintaxe corretamente à nova linguagem.
- Usa boas práticas da linguagem de destino.
- Não inventes funcionalidades.
- Corrige problemas necessários durante a conversão.
- Devolve código completo.
- NÃO uses Markdown.
- NÃO uses blocos de código.
- NÃO expliques a conversão.
- NÃO uses "...".
- NÃO omitas nenhuma parte do código.

Devolve APENAS o código final.
`,
        },
        {
          role: "user",
          content: `
Ficheiro original: ${filename}

LINGUAGEM DE DESTINO:
${targetLanguage}

CÓDIGO ORIGINAL:

${code}

Converte este código completamente para ${targetLanguage}.
`,
        },
      ],
    });

    return NextResponse.json({
      code: result.message.content,
    });
  } catch (error) {
    console.error("Erro ao converter código:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível converter o código. Verifica se o Ollama está a funcionar.",
      },
      { status: 500 }
    );
  }
}