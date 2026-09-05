import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.6-flash";

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

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `
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

Ficheiro original: ${filename}

LINGUAGEM DE DESTINO:
${targetLanguage}

CÓDIGO ORIGINAL:

${code}

Converte este código completamente para ${targetLanguage}.
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

    const convertedCode = result.text;

    if (!convertedCode) {
      throw new Error("A IA não devolveu código convertido.");
    }

    return NextResponse.json({
      code: convertedCode,
    });
  } catch (error) {
    console.error("Erro ao converter código:", error);

    return NextResponse.json(
      {
        error: "Não foi possível converter o código com a IA.",
      },
      { status: 500 }
    );
  }
}