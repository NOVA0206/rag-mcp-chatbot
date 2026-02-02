// ❌ dotenv removed completely
// require("dotenv").config();

const express = require("express");
const cors = require("cors");
const retrieve = require("./rag");

// Safe fetch for Node.js (CommonJS)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();

app.use(cors());
app.use(express.json());

/* ======================================================
   🔑 WRITE YOUR API KEY DIRECTLY HERE
   ====================================================== */

const API_KEY = "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";   // 👈 put your key here

/* ====================================================== */

const LLM_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// MCP-style context memory
let context = {
  user: "Student",
  memory: []
};


/* ======================================================
   🚀 CHAT ROUTE
   ====================================================== */

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      return res.json({ response: "Please ask a question." });
    }

    // 🔍 RAG retrieval
    const docs = retrieve(userMessage);

    // 🧠 Save memory
    context.memory.push({
      role: "user",
      content: userMessage
    });

    let prompt = "";

    /* =========================
       Prompt building (RAG/MCP)
       ========================= */

    if (docs.length > 0) {
      prompt = `
You are an AI assistant.
Use the information below to answer the question.

Information:
${docs.join("\n")}

Question:
${userMessage}
`;
    } else {
      prompt = `
You are an AI assistant.
Answer using general knowledge.

Question:
${userMessage}
`;
    }

    /* =========================
       Call LLM API
       ========================= */

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

    console.log("LLM RAW RESPONSE:", llmData);

    /* =========================
       Safe extraction
       ========================= */

    let aiResponse = "I don't know.";

    if (llmData?.choices?.[0]?.message?.content) {
      aiResponse = llmData.choices[0].message.content.trim();
    }

    console.log("AI FINAL RESPONSE:", aiResponse);

    // Save assistant response
    context.memory.push({
      role: "assistant",
      content: aiResponse
    });

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


/* ======================================================
   📚 GET MEMORY CONTEXT
   ====================================================== */

app.get("/context", (req, res) => {
  res.json(context);
});


/* ======================================================
   ▶ START SERVER
   ====================================================== */

app.listen(5000, () => {
  console.log("🤖 RAG + MCP server running on port 5000");
});
