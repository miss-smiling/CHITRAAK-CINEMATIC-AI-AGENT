import express from "express";
import {
  getAllShots,
  getEntity,
  getEntitiesForShot,
  getStateHistory,
  getDriftHistory,
} from "./clickhouse/queries.ts";

const app = express();
const PORT = 4000;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "cinematic-ai-backend",
  });
});

app.get("/api/shots", async (_req, res) => {
  try {
    const shots = await getAllShots();
    res.json(shots);
  } catch (error) {
    console.error("Failed to fetch shots:", error);
    res.status(500).json({ error: "Failed to fetch shots" });
  }
});

app.get("/api/entities/:id", async (req, res) => {
  try {
    const entity = await getEntity(req.params.id);

    if (!entity) {
      return res.status(404).json({ error: "Entity not found" });
    }

    res.json(entity);
  } catch (error) {
    console.error("Failed to fetch entity:", error);
    res.status(500).json({ error: "Failed to fetch entity" });
  }
});

app.get("/api/shots/:id/entities", async (req, res) => {
  try {
    const entities = await getEntitiesForShot(req.params.id);
    res.json(entities);
  } catch (error) {
    console.error("Failed to fetch shot entities:", error);
    res.status(500).json({ error: "Failed to fetch shot entities" });
  }
});

app.get("/api/entities/:id/history", async (req, res) => {
  try {
    const history = await getStateHistory(req.params.id);
    res.json(history);
  } catch (error) {
    console.error("Failed to fetch state history:", error);
    res.status(500).json({ error: "Failed to fetch state history" });
  }
});

app.get("/api/shots/:id/drift", async (req, res) => {
  try {
    const drift = await getDriftHistory(req.params.id);
    res.json(drift);
  } catch (error) {
    console.error("Failed to fetch drift history:", error);
    res.status(500).json({ error: "Failed to fetch drift history" });
  }
});

app.listen(PORT, () => {
  console.log(`Cinematic AI backend running on http://localhost:${PORT}`);
});