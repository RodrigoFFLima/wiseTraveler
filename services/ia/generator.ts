import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";

interface TravelScheduleParams {
  destination: string;
  days: number;
  interests?: string; // NOVO: Campo opcional
  travelDate?: string; // NOVO CAMPO
}

export interface DaySchedule {
  day: string;
  weatherTip: string; // NOVO: Dica de clima/roupa
  morning: string;
  afternoon: string;
  night: string;
}

export type TravelSchedule = DaySchedule[];

export async function generateTravelSchedule({
  destination,
  days,
  interests,
  travelDate
}: TravelScheduleParams): Promise<TravelSchedule | string> {
  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || "");

  const schema: Schema = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        day: { type: SchemaType.STRING, nullable: false },
        weatherTip: { 
          type: SchemaType.STRING, 
          description: "Breve dica de clima ou roupa para este dia. Ex: 'Leve guarda-chuva' ou 'Muito sol, use protetor'.",
          nullable: false 
        },
        morning: { type: SchemaType.STRING, nullable: false },
        afternoon: { type: SchemaType.STRING, nullable: false },
        night: { type: SchemaType.STRING, nullable: false },
      },
      required: ["day", "weatherTip", "morning", "afternoon", "night"],
    },
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json", responseSchema: schema },
  });

  // Prompt mais inteligente com DATA
  const whenPrompt = travelDate 
    ? `A viagem será em: ${travelDate}. Considere o clima histórico desta época para gerar as 'weatherTips'.` 
    : "Considere o clima médio anual.";

  const prompt = `
    Crie um roteiro de ${days} dias para ${destination}.
    O usuário gosta de: ${interests || "pontos turísticos clássicos"}.
    ${whenPrompt}
    
    Para cada dia, inclua uma "weatherTip" com previsão de temperatura MÉDIA (ex: Max 30° Min 24°) para essa época do ano e dicas de roupa.
  `;

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text()) as TravelSchedule;
  } catch (error) {
    throw error;
  }
}