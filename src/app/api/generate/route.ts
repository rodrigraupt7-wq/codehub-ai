import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.6-flash";

const SYSTEM_INSTRUCTION = `
És o CodeHub AI.
Cria projetos web funcionais, modernos e responsivos.
Responde em português de Portugal.
`;

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Pedido inválido." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada.");
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const generationPrompt = `
Cria um projeto web completo e funcional.

PEDIDO:
${prompt}

REGRAS:
- Usa HTML, CSS e JavaScript.
- Design moderno e responsivo.
- Todas as funcionalidades pedidas devem funcionar.
- Botões devem ter eventos reais.
- Pesquisa e filtros funcionam quando pedidos.
- Carrinho funciona quando pedido.
- Não uses APIs externas sem necessidade.
- Não uses código desnecessário.
- Não repitas código.
- Não uses "...".
- Não omitas partes do código.
- Não cries ficheiros desnecessários.
- Mantém o projeto compacto.
- Não ultrapasses aproximadamente 1000 linhas no total, salvo necessidade real.

DEVOLVE APENAS OS FICHEIROS.

Formato obrigatório:

### Ficheiro: index.html
\`\`\`html
código completo
\`\`\`

### Ficheiro: styles.css
\`\`\`css
código completo
\`\`\`

### Ficheiro: script.js
\`\`\`javascript
código completo
\`\`\`

Cria ficheiros adicionais apenas se forem absolutamente necessários.
`;

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: generationPrompt }],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 6000,
      },
    });

    const generatedProject = result.text;

    if (!generatedProject) {
      throw new Error("A IA não devolveu nenhum projeto.");
    }

    return NextResponse.json({
      response: generatedProject,
    });
  } catch (error) {
    console.error("Erro CodeHub AI:", error);

    return NextResponse.json(
      {
        error: "Não foi possível gerar o projeto com a IA.",
      },
      { status: 500 }
    );
  }
}