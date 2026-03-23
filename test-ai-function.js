// Teste simples da Cloud Function
const testAI = async () => {
  const functionUrl = "https://us-central1-speakup-system.cloudfunctions.net/chatWithAI";
  
  const payload = {
    systemPrompt: "Você é um assistente útil.",
    messages: [
      { role: "user", content: "Diga apenas 'olá'." }
    ]
  };

  console.log("🧪 Testando Cloud Function...");
  console.log("URL:", functionUrl);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("\n📡 Status:", response.status, response.statusText);
    
    const data = await response.json();
    console.log("\n📦 Resposta:");
    console.log(JSON.stringify(data, null, 2));
    
    if (data.content) {
      console.log("\n✅ IA respondeu:", data.content[0]?.text);
    }
  } catch (error) {
    console.error("\n❌ Erro:", error.message);
    console.error("Stack:", error.stack);
  }
};

testAI();
