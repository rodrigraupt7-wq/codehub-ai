import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

const SYSTEM_INSTRUCTION = `
És o AI Chat do CodeHub AI.

És um assistente de programação.
Responde em português de Portugal.

Podes ajudar com programação, debugging, HTML, CSS, JavaScript,
TypeScript, Python, React, Next.js, criação de projetos,
explicação de código, otimização e arquitetura de software.

Sê claro e útil. Quando o utilizador pedir código, fornece código completo.
`;

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Mensagem inválida." },
        { status: 400 }
      );
    }

    const contents: Array<{
      role: "user" | "model";
      parts: { text: string }[];
    }> = [
      ...(Array.isArray(history) ? history : [])
        .filter(
          (item) =>
            item &&
            typeof item.content === "string" &&
            (item.role === "user" || item.role === "assistant")
        )
        .map((item) => ({
          role: item.role === "assistant" ? ("model" as const) : ("user" as const),
          parts: [{ text: item.content }],
        })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const result = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return NextResponse.json({
      response: result.text,
    });
  } catch (error) {
    console.error("Erro no AI Chat:", error);

    return NextResponse.json(
      { error: "Não foi possível contactar a IA." },
      { status: 500 }
    );
  }
}