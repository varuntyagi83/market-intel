import { NextRequest } from "next/server";
import { buildDeepDivePrompt, createAnalysisStream } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { symbol, priceData } = await req.json();

  if (!symbol) {
    return new Response("Missing symbol", { status: 400 });
  }

  const { prompt, system } = buildDeepDivePrompt(symbol, priceData);
  const stream = await createAnalysisStream(prompt, system, true);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
