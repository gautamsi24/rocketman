import { generateText } from "ai";
import { NextResponse } from "next/server";
import { transcriptionModel } from "@/lib/agents/shared/model";
import { requireLearnerId } from "@/lib/api/guards";

export const maxDuration = 30;

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const TRANSCRIBE_INSTRUCTION =
  "Transcribe the spoken audio into plain text exactly as spoken. " +
  "Output only the transcript with no quotes, labels, or commentary. " +
  "If there is no discernible speech, output nothing.";

export async function POST(req: Request) {
  const learnerId = await requireLearnerId();
  if (learnerId instanceof NextResponse) return learnerId;

  const formData = await req.formData();
  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Invalid audio size" }, { status: 400 });
  }

  const bytes = new Uint8Array(await audio.arrayBuffer());
  const mediaType = audio.type.split(";")[0] || "audio/webm";

  const { text } = await generateText({
    model: transcriptionModel,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: TRANSCRIBE_INSTRUCTION },
          { type: "file", data: bytes, mediaType },
        ],
      },
    ],
  });

  return NextResponse.json({ transcript: text.trim() });
}
