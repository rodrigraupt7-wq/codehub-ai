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

Ficheiro: ${filename}

Código:

${code}

Analisa este código e cria uma estratégia completa de testes.
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

    const response = result.text;

    if (!response) {
      throw new Error("A IA não devolveu uma análise.");
    }

    return NextResponse.json({
      response,
    });
  } catch (error) {
    console.error("Erro nos testes:", error);

    return NextResponse.json(
      {
        error: "Não foi possível gerar os testes com a IA.",
      },
      { status: 500 }
    );
  }
}