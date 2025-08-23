/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server } from "socket.io";
import { createServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";

let io: Server;
export function initSocket(req: NextApiRequest, res: NextApiResponse) {
  if (!io) {
    const httpServer = createServer();
    io = new Server(httpServer, {
      path: "/api/socket",
    });
    console.log("Socket.IO server initialized");
  }
  (res.socket as any).server.io = io;
}

export { io };
