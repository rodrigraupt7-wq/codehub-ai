import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.6-flash";

export async function POST(request: Request) {
  try {
    const { code, filename } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Código inválido." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `
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

Ficheiro: ${filename}

Código atual:

${code}

Melhora este código cuidadosamente e devolve o ficheiro completo melhorado.
`;

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const improvedCode = result.text;

    if (!improvedCode) {
      throw new Error("A IA não devolveu código.");
    }

    return NextResponse.json({
      code: improvedCode,
    });
  } catch (error) {
    console.error("Erro ao melhorar código:", error);

    return NextResponse.json(
      {
        error: "Não foi possível melhorar o código com a IA.",
      },
      { status: 500 }
    );
  }
}