require("dotenv").config();
const express = require("express");
const cors = require("cors");
const retrieve = require("./rag");

// Safe fetch for Node.js (CommonJS)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

// MCP-style context
let context = {
  user: "Student",
  memory: []
};

const API_KEY = process.env.OPENAI_API_KEY;
const LLM_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      return res.json({ response: "Please ask a question." });
    }

    // 🔍 RAG retrieval
    const docs = retrieve(userMessage);

    // 🧠 MCP memory
    context.memory.push({ role: "user", content: userMessage });

    let prompt = "";

if (docs.length > 0) {
  // RAG mode
  prompt = `
You are an AI assistant.
Use the information below to answer the question.
If the information is sufficient, give a clear answer.

Information:
${docs.join("\n")}

Question:
${userMessage}
`;
} else {
  // Fallback to general knowledge
  prompt = `
You are an AI assistant.
Answer the following question using your general knowledge.
Keep the answer clear and concise.

Question:
${userMessage}
`;
}


    const llmRes = await fetch(LLM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const llmData = await llmRes.json();

    // 🔍 DEBUG LOG (VERY IMPORTANT FOR YOU)
    console.log("LLM RAW RESPONSE:", llmData);

    // ✅ SAFE EXTRACTION
    let aiResponse = "I don't know.";
    if (
        llmData?.choices?.[0]?.message?.content
    ) {
        aiResponse = llmData.choices[0].message.content.trim();
    }

    console.log("AI FINAL RESPONSE:", aiResponse);

    context.memory.push({ role: "assistant", content: aiResponse });

    res.json({
      response: aiResponse,
      retrievedDocs: docs,
      context
    });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({
      response: "I don't know."
    });
  }
});

app.get("/context", (req, res) => {
  res.json(context);
});

app.listen(5000, () => {
  console.log("🤖 RAG + MCP server running on port 5000");
});
