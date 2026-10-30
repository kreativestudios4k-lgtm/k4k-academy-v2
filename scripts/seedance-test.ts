import { config, higgsfield } from "@higgsfield/client/v2";
const credentials = process.env.HF_CREDENTIALS;
if (!credentials || !/^[^:]+:[^:]+$/.test(credentials)) {
  console.error("HF_CREDENTIALS missing or invalid. Configure locally in ignored .env.local.");
  process.exitCode = 2;
} else {
  config({ credentials });
  try {
    const result = await higgsfield.subscribe("bytedance/seedance-2.5/text-to-video", {
      input: {
        prompt: "A cinematic scene at sunset",
        duration: 5,
        resolution: "720p",
        aspect_ratio: "16:9",
        output_format: "mp4",
        generate_audio: true
      },
      withPolling: true
    });
    if (result.status !== "completed") {
      console.error("Generation not completed. Status:", result.status ?? "unknown");
      process.exitCode = 1;
    } else {
      const video = result.video;
      const url = typeof video === "string" ? video : video?.url;
      if (typeof url === "string" && url.startsWith("https://")) {
        console.log("Generated video URL:", url);
      } else {
        console.error("Completed but no valid video URL returned.");
        process.exitCode = 1;
      }
    }
  } catch (error) {
    console.error("Generation failed, canceled, moderated, or API unavailable:", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  }
}
