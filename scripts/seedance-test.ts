import { config as loadEnv } from "dotenv";
import { config, higgsfield } from "@higgsfield/client/v2";

loadEnv({ path: ".env.local", quiet: true });
const credentials = process.env.HF_CREDENTIALS;
if (!credentials || !/^[^:]+:[^:]+$/.test(credentials)) {
  console.error("Missing or invalid HF_CREDENTIALS in .env.local.");
  process.exit(2);
}
config({ credentials });

async function main() {
  try {
    const result = await higgsfield.subscribe(
      "bytedance/seedance-2.5/text-to-video",
      {
        input: {
          prompt: "A cinematic scene at sunset",
          duration: 5,
          resolution: "720p",
          aspect_ratio: "16:9",
          output_format: "mp4",
          generate_audio: true,
        },
        withPolling: true,
      },
    );
    if (!result.isCompleted) {
      throw new Error("Generation did not complete (failed, canceled, or moderated).");
    }
    const videoUrl = result.jobs?.[0]?.results?.raw?.url;
    if (typeof videoUrl !== "string" || !videoUrl.startsWith("https://")) {
      throw new Error("Completed without a valid video URL.");
    }
    console.log(videoUrl);
  } catch (error) {
    console.error("Seedance generation unsuccessful:", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  }
}
void main();
