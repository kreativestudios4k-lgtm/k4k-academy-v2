# Preliminary MP4 header guard (preview only)

This independent preview branch builds on PR #36 and adds bounded `ftyp` parsing for MP4 upload preflight. It rejects malformed box sizes, unsupported brands, and oversized declared files. It does **not** prove the full file is an MP4, that the video decodes, or that the media is safe.

Before enabling generation: integrate with authenticated owned-object verification; fetch a bounded byte range from trusted storage (do not load an untrusted 250 MB file into a serverless function); verify full container and streams with a sandboxed media probe; enforce duration, dimensions, codec, frame and decompression limits; strip unsafe metadata; verify the actual stored bytes, and fail closed. Do not create provider calls or credit reservations until these gates pass.

Run: `node --test tests/generation-video-container.test.mjs`.
