// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

// ---- middlewares FIRST (order matters) ----
app.use(cors({
  origin: ["http://localhost:4200"], // Angular SSR dev
  credentials: true,
}));
app.use(express.json()); // must be before routes

// ---- in-memory cache for SSR ----
  // <— the cache lives here (RAM)
let productsCache = [];

async function reloadProductsCache() {
  productsCache = await prisma.product.findMany({
    orderBy: { createdAt: "desc" }, // adjust if your column is different
  });
  // console.log("[cache] reloaded:", productsCache.length);
}

// expose cache for SSR (no DB hit)
app.get("/api/products/cache", (_req, res) => {
  res.json(productsCache ?? []);
});

// normal list (DB read)
app.get("/api/products", async (_req, res) => {
  const rows = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(rows);
});

// --------------------------------- CRUD SOCKET IO -----------------------------
// CREATE -> write DB, refresh cache once, broadcast
app.post("/api/products", async (req, res) => {
  const { name, price } = req.body ?? {};
  if (!name || price == null) {
    return res.status(400).json({ error: "Name and price are required" });
  }
  const created = await prisma.product.create({ data: { name, price } });
  await reloadProductsCache();
  io.emit("product:created", created);
  res.status(201).json(created);
});

// UPDATE
app.put("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, price } = req.body ?? {};
  const updated = await prisma.product.update({
    where: { id },
    data: { name, price },
  });
  await reloadProductsCache();
  io.emit("product:updated", updated);
  res.json(updated);
});

// DELETE
app.delete("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await prisma.product.delete({ where: { id } });
  await reloadProductsCache();
  io.emit("product:deleted", deleted);
  res.json({ ok: true });
});

// ---- socket.io ----
const server = http.createServer(app);
const io = new Server(server, {
  path: "/socket.io",
  cors: { origin: ["http://localhost:4200"], credentials: true },
});

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.emit("hello", { msg: "Welcome!" });

  socket.on("ping", (data) => socket.emit("pong", { at: Date.now(), data }));
  socket.on("disconnect", () => console.log("socket disconnected:", socket.id));
});

// graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// ---- start server & warm cache once ----
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`API + Socket server on :${PORT}`);
  try {
    await reloadProductsCache(); // warm SSR cache on boot
    console.log(`[cache] warmed with ${productsCache.length} products`);
  } catch (e) {
    console.error("Failed to warm cache:", e);
  }
});
