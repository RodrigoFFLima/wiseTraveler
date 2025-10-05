// services/ia/generator.ts

import { GoogleGenAI } from "@google/genai";

interface TravelScheduleParams {
  destination: string;
  days: number;
}

// 1. NOVO: Definimos a estrutura que esperamos do JSON
interface DaySchedule {
  day: string; // Ex: "Dia 1 - Coração Histórico"
  morning: string;
  afternoon: string;
  night: string;
}

// 2. NOVO: A resposta final será um array dessa estrutura
type TravelSchedule = DaySchedule[];

export async function generateTravelSchedule({
  destination,
  days,
}: TravelScheduleParams): Promise<TravelSchedule | string> {
  const ai = new GoogleGenAI({
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
  });

  // A instrução do sistema será muito focada em JSON e na estrutura de cards.
  const systemInstruction = {
    text: `Você é um assistente de viagem experiente e localmente informado. Sua tarefa é criar um cronograma de viagem completo para ${destination} em ${days} dias.

**Regras de Geração (CRÍTICAS):**
1. O resultado DEVE ser um array de objetos JSON que representa o cronograma.
2. NUNCA use NENHUM TIPO de formatação Markdown ou HTML (ex: **negrito**, *itálico*, links, hashtags). O texto deve ser plano.
3. Não inclua NENHUMA INTRODUÇÃO, resumo, ou texto fora do objeto JSON.
4. Mantenha as descrições de manhã, tarde e noite sucintas (máximo 2 frases).
5. Onde for apropriado, inclua o nome real e popular de um local, mas SEM formatá-lo. Ex: "Visite o Forte de Copacabana" (e não **Forte de Copacabana**).
6. Siga estritamente a estrutura JSON fornecida no esquema de resposta.`,
  };

  // 3. NOVO: Definimos o Schema do JSON que o Gemini deve retornar
  const responseSchema = {
    type: "array" as const,
    items: {
      type: "object" as const,
      properties: {
        day: {
          type: "string" as const,
          description:
            "O número do dia e o título do dia. Ex: 'Dia 1 - Chegada e Aclimação'",
        },
        morning: {
          type: "string" as const,
          description:
            "Atividade/local sugerido para a manhã. Inclua uma breve descrição da atividade.",
        },
        afternoon: {
          type: "string" as const,
          description:
            "Atividade/local sugerido para a tarde. Inclua uma breve descrição da atividade.",
        },
        night: {
          type: "string" as const,
          description: "Sugestão de jantar e/ou atividade noturna.",
        },
      },
      required: ["day", "morning", "afternoon", "night"],
    },
  };

  const config = {
    systemInstruction: systemInstruction.text,
    temperature: 0.5,
    maxOutputTokens: 2048, // Aumentamos os tokens pois JSON é mais verboso

    // 4. NOVO: Configurações para forçar a saída JSON
    responseMimeType: "application/json" as const,
    responseSchema: responseSchema,
  };

  const userPrompt = `Gere o cronograma de ${days} dias para ${destination} no formato JSON estrito.`;

  const contents = [
    {
      role: "user",
      parts: [
        {
          text: userPrompt,
        },
      ],
    },
  ];

  const model = "gemini-2.5-flash";

  try {
    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });

    const jsonText = response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (jsonText) {
      // Tenta parsear o JSON
      const schedule = JSON.parse(jsonText) as TravelSchedule;
      return schedule;
    }
    return "Erro de formato da IA: Resposta não é um JSON válido.";
  } catch (error) {
    console.error("Erro ao gerar o cronograma de viagem:", error);
    // Em caso de falha na API ou no parse, retornamos uma string de erro
    return "Desculpe, não consegui planejar a viagem agora. Tente novamente mais tarde!";
  }
}
