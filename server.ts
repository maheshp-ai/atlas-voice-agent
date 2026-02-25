import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("knowledge.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/knowledge", (req, res) => {
    const items = db.prepare("SELECT * FROM knowledge ORDER BY created_at DESC").all();
    res.json(items);
  });

  app.post("/api/knowledge", (req, res) => {
    const { topic, content } = req.body;
    if (!topic || !content) {
      return res.status(400).json({ error: "Topic and content are required" });
    }
    const info = db.prepare("INSERT INTO knowledge (topic, content) VALUES (?, ?)").run(topic, content);
    res.json({ id: info.lastInsertRowid, topic, content });
  });

  app.delete("/api/knowledge/:id", (req, res) => {
    db.prepare("DELETE FROM knowledge WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
