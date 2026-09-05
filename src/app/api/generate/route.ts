import { NextResponse } from "next/server";
import ollama from "ollama";

const MODEL = "qwen2.5-coder:7b";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Pedido inválido." },
        { status: 400 }
      );
    }

    // =====================================================
    // ETAPA 1 — GERAR O PROJETO
    // =====================================================

    const generationPrompt = `
És o CodeHub AI, um engenheiro de software sénior.

Cria um projeto REAL, funcional, moderno e profissional.

PEDIDO DO UTILIZADOR:
${prompt}

REGRAS:

- Responde em português de Portugal.
- Cria todos os ficheiros necessários.
- O código deve estar completo.
- Nunca uses "...".
- Nunca deixes funcionalidades incompletas.
- Nunca cries botões que não fazem nada.
- HTML, CSS e JavaScript devem funcionar juntos.
- Usa JavaScript real para funcionalidades interativas.
- Pesquisa deve funcionar.
- Filtros devem funcionar.
- Carrinho deve funcionar se for pedido.
- Botões devem ter eventos funcionais.
- O design deve ser moderno e responsivo.
- Não uses imagens inexistentes.
- Não uses datas antigas.
- Usa EUR (€) quando fizer sentido.
- Evita código duplicado.
- Usa nomes de ficheiros coerentes.

FORMATO OBRIGATÓRIO:

### Ficheiro: index.html
\`\`\`html
CÓDIGO COMPLETO
\`\`\`

### Ficheiro: styles.css
\`\`\`css
CÓDIGO COMPLETO
\`\`\`

### Ficheiro: script.js
\`\`\`javascript
CÓDIGO COMPLETO
\`\`\`

Se forem necessários outros ficheiros, cria-os também.

IMPORTANTE:
Todos os ficheiros devem funcionar em conjunto.
`;

    const generated = await ollama.chat({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "És um programador sénior especializado em criar aplicações web funcionais.",
        },
        {
          role: "user",
          content: generationPrompt,
        },
      ],
    });

    const generatedProject = generated.message.content;

    // =====================================================
    // ETAPA 2 — REVISÃO E CORREÇÃO AUTOMÁTICA
    // =====================================================

    const reviewPrompt = `
És o revisor principal do CodeHub AI.

Recebeste um projeto criado por outra IA.

A tua missão é ANALISAR TODO O PROJETO e devolver uma versão corrigida e funcional.

PROJETO ORIGINAL:

${generatedProject}

ANTES DE DEVOLVER:
1. Analisa todos os ficheiros.
2. Procura erros de HTML.
3. Procura erros de CSS.
4. Procura erros de JavaScript.
5. Procura funções que não existem.
6. Procura IDs incorretos.
7. Procura classes incorretas.
8. Procura eventos que não funcionam.
9. Procura botões sem funcionalidade.
10. Procura pesquisas que não funcionam.
11. Procura filtros que não funcionam.
12. Procura carrinhos incompletos.
13. Procura problemas de responsividade.
14. Procura links ou imagens inexistentes.
15. Procura código duplicado.
16. Corrige TODOS os problemas encontrados.
17. Mantém o objetivo original do projeto.
18. Melhora o design quando necessário.
19. Garante que todos os ficheiros funcionam juntos.
20. Faz uma revisão final antes de responder.

REGRAS IMPORTANTES:

- NÃO expliques as correções.
- NÃO faças um resumo.
- NÃO uses "...".
- NÃO omitas código.
- NÃO escrevas código parcial.
- DEVOLVE APENAS OS FICHEIROS FINAIS.

FORMATO OBRIGATÓRIO:

### Ficheiro: index.html
\`\`\`html
CÓDIGO COMPLETO
\`\`\`

### Ficheiro: styles.css
\`\`\`css
CÓDIGO COMPLETO
\`\`\`

### Ficheiro: script.js
\`\`\`javascript
CÓDIGO COMPLETO
\`\`\`

Para ficheiros adicionais:

### Ficheiro: nome.ext
\`\`\`linguagem
CÓDIGO COMPLETO
\`\`\`
`;

    const reviewed = await ollama.chat({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "És um especialista em revisão, debugging e correção de aplicações web.",
        },
        {
          role: "user",
          content: reviewPrompt,
        },
      ],
    });

    const finalProject = reviewed.message.content;

    // =====================================================
    // DEVOLVER PROJETO FINAL
    // =====================================================

    return NextResponse.json({
      response: finalProject,
    });
  } catch (error) {
    console.error("Erro CodeHub AI:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível gerar o projeto. Verifica se o Ollama está ligado.",
      },
      { status: 500 }
    );
  }
}