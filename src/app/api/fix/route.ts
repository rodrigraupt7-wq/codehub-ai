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

Ficheiro: ${filename}

Código:

${code}

Analisa cuidadosamente este código, corrige todos os problemas encontrados e devolve o ficheiro completo corrigido.
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

    const fixedCode = result.text;

    if (!fixedCode) {
      throw new Error("A IA não devolveu código corrigido.");
    }

    return NextResponse.json({
      code: fixedCode,
    });
  } catch (error) {
    console.error("Erro ao corrigir código:", error);

    return NextResponse.json(
      {
        error: "Não foi possível corrigir o código com a IA.",
      },
      { status: 500 }
    );
  }
}