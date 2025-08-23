import { NextApiRequest, NextApiResponse } from "next";
import { initSocket } from "@/lib/socket";

export async function GET(req: NextApiRequest, res: NextApiResponse) {
  initSocket(req, res);
  res.status(200).end();
}
