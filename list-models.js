// Listar modelos disponíveis do Gemini
const listModels = async () => {
  const apiKey = "AIzaSyDHj_W2AJQEMjYWqYTcEaVs6Ttv3wQvaJA";
  
  console.log("🔍 Listando modelos disponíveis do Gemini...\n");
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error("❌ Erro:", data);
      return;
    }

    console.log("✅ Modelos disponíveis:");
    data.models?.forEach(model => {
      const methods = model.supportedGenerationMethods || [];
      if (methods.includes("generateContent")) {
        console.log(`\n📦 ${model.name}`);
        console.log(`   Suporta: ${methods.join(", ")}`);
      }
    });
  } catch (error) {
    console.error("\n❌ Erro:", error.message);
  }
};

listModels();
