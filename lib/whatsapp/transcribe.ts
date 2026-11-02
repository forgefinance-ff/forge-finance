/** Transcreve áudio em português com a API de transcrição da OpenAI (Whisper). */
export async function transcribeAudio(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error("OPENAI_API_KEY ausente.");

  const extension = mimeType.includes("mpeg")
    ? "mp3"
    : mimeType.includes("mp4") || mimeType.includes("aac")
      ? "m4a"
      : mimeType.includes("amr")
        ? "amr"
        : "ogg";

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), `audio.${extension}`);
  form.append("model", process.env.WHISPER_MODEL ?? "whisper-1");
  form.append("language", "pt");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(40_000),
  });

  if (!response.ok) {
    throw new Error(`whisper ${response.status}`);
  }

  const payload = (await response.json()) as { text?: string };

  return (payload.text ?? "").trim();
}
