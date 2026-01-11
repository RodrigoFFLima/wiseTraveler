const { GoogleGenerativeAI } = require("@google/generative-ai");

// COLE SUA CHAVE NOVA (A QUE COMEÇA COM AIza...)
const genAI = new GoogleGenerativeAI("AIzaSyD4c10YBiqI3uqGyZwcHzR-VGnWzY9FLm8");

async function listModels() {
  try {
    console.log("Consultando modelos disponíveis para esta chave...");
    // Isso lista tudo que sua chave tem permissão para ver
    const result = await genAI.getGenerativeModel({ model: "gemini-pro" }).apiKey; 
    // A SDK tem um método específico para isso, vamos usar o fetch direto para garantir
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${genAI.apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log("\n=== MODELOS DISPONÍVEIS ===");
    if (data.models) {
      data.models.forEach(m => {
        // Filtramos apenas os que servem para 'generateContent'
        if (m.supportedGenerationMethods.includes("generateContent")) {
          console.log(`- ${m.name.replace("models/", "")}`);
        }
      });
    } else {
      console.log("Nenhum modelo encontrado. A lista veio vazia.");
    }

  } catch (e) {
    console.error("ERRO FATAL:", e.message);
  }
}

listModels();