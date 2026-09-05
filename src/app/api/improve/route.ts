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
És o sistema "Melhorar Código" do CodeHub AI.

A tua tarefa é melhorar o código fornecido pelo utilizador.

Deves:

- melhorar a qualidade do código;
- melhorar a organização;
- remover código desnecessário;
- reduzir duplicação;
- melhorar desempenho quando possível;
- melhorar legibilidade;
- corrigir pequenos problemas;
- manter todas as funcionalidades existentes;
- manter o comportamento original;
- manter compatibilidade com o restante projeto.

IMPORTANTE:

- NÃO mudes o objetivo do código.
- NÃO removas funcionalidades.
- NÃO uses Markdown.
- NÃO uses blocos de código.
- NÃO expliques as alterações.
- NÃO uses "...".
- NÃO omitas código.
- DEVOLVE O FICHEIRO COMPLETO.
`,
        },
        {
          role: "user",
          content: `
Ficheiro: ${filename}

Código atual:

${code}

Melhora este código cuidadosamente e devolve o ficheiro completo melhorado.
`,
        },
      ],
    });

    return NextResponse.json({
      code: result.message.content,
    });
  } catch (error) {
    console.error("Erro ao melhorar código:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível melhorar o código. Verifica se o Ollama está a funcionar.",
      },
      { status: 500 }
    );
  }
}