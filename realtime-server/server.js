import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(
  cors({
    origin: "http://localhost:4200", // Angular SSR origin
    credentials: true,
  })
);
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

app.use(express.json());

//GET LIST API
app.get("/api/products", async (req, res) => {
  const row = await prisma.product.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
  res.json(row);
});

//CREATE PRODUCTS API
app.post("/api/products", async (req, res) => {
  const { name, price } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: "Name and price are required" });
  }
  const row = await prisma.product.create({
    data: { name, price },
  });
  io.emit("product:created", row);
  res.status(201).json(row);
});

//UPDATE PRODUCTS API
app.put("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, price } = req.body;
  {
  }
  const updated = await prisma.product.update({
    where: { id },
    data: { name, price },
  });
  io.emit("product:updated", updated);
  res.json(updated);
});

//DELETE PRODUCTS API
app.delete("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await prisma.product.delete({
    where: { id },
  });
  io.emit("product:deleted", deleted);
  res.json({ ok: true });
});

//PARA NICE ANG SHUTDOWN
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Example namespace/room-free broadcast
io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.emit("hello", { msg: "Welcome!" });

  socket.on("ping", (data) => {
    // echo back
    socket.emit("pong", { at: Date.now(), data });
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Socket server on :${PORT}`));
