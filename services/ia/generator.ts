import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";

interface TravelScheduleParams {
  destination: string;
  days: number;
  interests?: string;
  travelStyle?: string;
  budget?: string;
  travelDate?: string;
}

export interface DaySchedule {
  day: string;
  weatherTip: string;
  estimatedCost?: string;
  morning: string;
  morningPlace?: string;
  afternoon: string;
  afternoonPlace?: string;
  night: string;
  nightPlace?: string;
}

export type TravelSchedule = DaySchedule[];

const PRIMARY_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";
const MODELS = [PRIMARY_MODEL, FALLBACK_MODEL].filter(
  (model, index, list) => list.indexOf(model) === index
);

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2500;

const dayScheduleSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    day: { type: SchemaType.STRING, nullable: false },
      weatherTip: {
      type: SchemaType.STRING,
      description:
        "Breve dica de clima ou roupa para este dia. Ex: 'Leve guarda-chuva' ou 'Muito sol, use protetor'.",
      nullable: false,
      },
      estimatedCost: {
        type: SchemaType.STRING,
        description: "Estimativa aproximada de gastos do dia em reais, sem incluir hospedagem e passagens. Ex: R$ 180–250.",
        nullable: false,
      },
      morning: { type: SchemaType.STRING, nullable: false },
      morningPlace: { type: SchemaType.STRING, nullable: false },
      afternoon: { type: SchemaType.STRING, nullable: false },
      afternoonPlace: { type: SchemaType.STRING, nullable: false },
      night: { type: SchemaType.STRING, nullable: false },
      nightPlace: { type: SchemaType.STRING, nullable: false },
  },
  required: ["day", "weatherTip", "estimatedCost", "morning", "morningPlace", "afternoon", "afternoonPlace", "night", "nightPlace"],
};

const scheduleSchema: Schema = {
  type: SchemaType.ARRAY,
  items: dayScheduleSchema,
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isRetryableError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return /503|429|500|502|504|high demand|overloaded|unavailable|temporarily|resource exhausted/i.test(
    message
  );
}

export function getGeminiErrorMessage(error: unknown): { title: string; message: string } {
  const msg = getErrorMessage(error);

  if (/503|high demand|overloaded|temporarily/i.test(msg)) {
    return {
      title: "IA sobrecarregada",
      message: "O serviço de IA está com alta demanda. Tente novamente em alguns instantes.",
    };
  }

  if (/429|quota|rate limit|resource exhausted/i.test(msg)) {
    return {
      title: "Limite atingido",
      message: "Muitas requisições em sequência. Aguarde um momento e tente de novo.",
    };
  }

  if (/401|403|API key|invalid.*key/i.test(msg)) {
    return {
      title: "Configuração",
      message: "Problema na chave da API. Verifique as configurações do app.",
    };
  }

  if (/404|not found/i.test(msg)) {
    return {
      title: "Modelo indisponível",
      message: "O modelo de IA não está disponível. Atualize o app ou tente mais tarde.",
    };
  }

  return {
    title: "Erro",
    message: "Não foi possível gerar o roteiro. Verifique sua conexão e tente novamente.",
  };
}

function buildPrompt({ destination, days, interests, travelStyle, budget, travelDate }: TravelScheduleParams) {
  const whenPrompt = travelDate
    ? `A viagem será em: ${travelDate}. Considere o clima histórico desta época para gerar as 'weatherTips'.`
    : "Considere o clima médio anual.";

  return `
    Crie um roteiro de ${days} dias para ${destination}.
    O usuário gosta de: ${interests || "pontos turísticos clássicos"}.
    O estilo de viagem é: ${travelStyle || "viajante geral"}. Adapte o ritmo e as sugestões a esse estilo.
    O orçamento é: ${budget || "moderado"}. Sugira opções compatíveis e indique quando uma atividade pode ter custo elevado.
    ${whenPrompt}
    
    Para cada dia, inclua uma "weatherTip" com previsão de temperatura MÉDIA (ex: Max 30° Min 24°) para essa época do ano e dicas de roupa.
    Para cada período, retorne também o nome exato do principal local ou atração em "morningPlace", "afternoonPlace" e "nightPlace". Se não houver um local específico, use o nome do bairro ou região.
    Inclua também "estimatedCost" com uma faixa aproximada de gastos do dia em reais, sem incluir hospedagem e passagens, respeitando o orçamento informado.
  `;
}

async function generateWithModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  prompt: string
): Promise<TravelSchedule> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: scheduleSchema,
    },
  });

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text()) as TravelSchedule;
}

async function regenerateWithModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  prompt: string
): Promise<DaySchedule> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: dayScheduleSchema,
    },
  });

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text()) as DaySchedule;
}

export async function generateTravelSchedule(
  params: TravelScheduleParams
): Promise<TravelSchedule | string> {
  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || "");
  const prompt = buildPrompt(params);
  let lastError: unknown;

  for (const modelName of MODELS) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await generateWithModel(genAI, modelName, prompt);
      } catch (error) {
        lastError = error;
        const shouldRetry = isRetryableError(error) && attempt < MAX_RETRIES;

        console.warn(
          `[Gemini] ${modelName} tentativa ${attempt}/${MAX_RETRIES} falhou:`,
          getErrorMessage(error)
        );

        if (shouldRetry) {
          await delay(RETRY_DELAY_MS * attempt);
          continue;
        }

        break;
      }
    }
  }

  throw lastError ?? new Error("Não foi possível gerar o roteiro.");
}

export async function regenerateTravelDay(params: {
  destination: string;
  day: DaySchedule;
  interests?: string;
  travelStyle?: string;
  budget?: string;
  travelDate?: string;
}): Promise<DaySchedule> {
  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || "");
  const prompt = `
    Crie uma nova versão para este dia de viagem em ${params.destination}.
    Mantenha o mesmo número e identificação do dia (${params.day.day}), mas sugira atividades diferentes.
    O usuário gosta de: ${params.interests || "pontos turísticos clássicos"}.
    O estilo de viagem é: ${params.travelStyle || "viajante geral"}. Adapte as novas atividades a esse estilo.
    O orçamento é: ${params.budget || "moderado"}. Mantenha as sugestões compatíveis com esse orçamento.
    ${params.travelDate ? `A viagem será em ${params.travelDate}; considere o clima dessa época.` : "Considere o clima médio anual."}
    Retorne uma manhã, uma tarde, uma noite, os locais correspondentes em morningPlace, afternoonPlace e nightPlace, uma dica de clima/roupa e a estimativa de custo do dia em estimatedCost.
  `;
  let lastError: unknown;

  for (const modelName of MODELS) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await regenerateWithModel(genAI, modelName, prompt);
      } catch (error) {
        lastError = error;
        if (isRetryableError(error) && attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY_MS * attempt);
          continue;
        }
        break;
      }
    }
  }

  throw lastError ?? new Error("Não foi possível regenerar o dia.");
}
