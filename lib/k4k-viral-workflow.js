export const viralCharacterSwapLesson = {
  "id": "k4k-genjutsu-viral-swap",
  "slug": "viral-character-swap",
  "number": "01",
  "stage": "VIRAL VIDEO WORKFLOW",
  "title": "THE VIRAL CHARACTER SWAP",
  "subtitle": "Reference video → character sheet → prompt → Higgsfield Genjutsu.",
  "image": 0,
  "duration": "35–50 MIN",
  "focus": "Higgsfield Genjutsu: Object Swap / Motion Transfer",
  "intro": "Recreate an engaging moment with your own character. This is the step-by-step K4K workflow: choose a short video, prepare your character sheet, map each person, write the swap prompt, and render using Genjutsu.",
  "objective": "Create one authorised character-swapped video that keeps the intended motion and scene while your new character remains recognisable and correctly dressed.",
  "reference": "K4K CREATOR REFERENCE / IDENTITY & WARDROBE LOCK",
  "videoSteps": [
    {
      "number": "01",
      "phase": "FIND THE IDEA",
      "title": "Choose the reference video",
      "summary": "The original video provides movement and story, not the new face.",
      "tasks": [
        "Choose a 5–15 second clip you shot, created, licensed or have permission to transform. Genjutsu currently lists roughly 4–30 seconds in its generator.",
        "Pick a clear hook in the first 1–2 seconds: a surprise, funny reaction, football action or dance.",
        "Avoid many rapid cuts, strong blur or people blocking the character to replace."
      ],
      "output": "One approved video reference."
    },
    {
      "number": "02",
      "phase": "PREPARE THE CLIP",
      "title": "Trim and identify everyone",
      "summary": "Make an upload-ready source and a simple person-by-person map.",
      "tasks": [
        "Trim the strongest moment in your video editor and save an MP4 or another accepted file type; prepare a vertical 9:16 version for TikTok if you have the rights.",
        "Watch the beginning, middle and end; identify the exact person you want to change.",
        "Write a mapping: Person A = LEFT in @Video1; Person B = RIGHT in @Video1. Keep the original version saved."
      ],
      "output": "@Video1 + a LEFT/RIGHT character map."
    },
    {
      "number": "03",
      "phase": "CHOOSE THE CAST",
      "title": "Pick new characters and their clothes",
      "summary": "Collect your own or authorised identity images.",
      "tasks": [
        "For one replacement character, start with one clear photo showing face and clothes; for two, find two distinct reference images.",
        "Decide the exact kit or outfit, hair, shoes, glasses, height and proportions that must stay consistent.",
        "Use different reference files for each person, so Genjutsu does not borrow the other character's face or jersey."
      ],
      "output": "Identity image for each replacement."
    },
    {
      "number": "04",
      "phase": "MAKE THE SHEETS",
      "title": "Create a consistent character sheet",
      "summary": "Generate a multi-view identity guide before the video render.",
      "tasks": [
        "Upload an authorised identity photo to your image-creation tool and paste the character-sheet prompt from this lesson.",
        "Request full-body front, side, 3/4 and back views plus a clear face detail where needed. Use the SAME clothes and proportions in every view.",
        "Inspect the sheet for different faces, drifting hair, wrong kit, shoes or extra limbs. Save Character Sheet 01 (and 02 if needed)."
      ],
      "output": "@Image1 and optional @Image2 character-sheet images."
    },
    {
      "number": "05",
      "phase": "WRITE THE PROMPT",
      "title": "Map who changes and who stays",
      "summary": "Be exact about the swap so the AI cannot guess.",
      "tasks": [
        "Write: LEFT original person → @Image1; RIGHT original person → @Image2, if two people are changing.",
        "Explicitly lock movement, gestures, camera, scene, all unaffected characters and outfit.",
        "Use the single-person or two-person prompt from this lesson, and replace all [bracketed] placeholders."
      ],
      "output": "One final copyable Genjutsu prompt."
    },
    {
      "number": "06",
      "phase": "OPEN HIGGSFIELD",
      "title": "Go to Genjutsu and choose the mode",
      "summary": "The right mode depends on whether you want to preserve the scene.",
      "tasks": [
        "Open https://higgsfield.ai/genjutsu and select the Genjutsu video workflow.",
        "Choose Object Swap when only selected people must be replaced and the rest of the shot should remain unchanged.",
        "Choose Motion Transfer when you want new character(s) to reproduce the driving video's motion, camera and timing while more of the scene may be rebuilt."
      ],
      "output": "Object Swap (default for selective meme edits) or Motion Transfer."
    },
    {
      "number": "07",
      "phase": "UPLOAD AND GENERATE",
      "title": "Add the video, sheets and prompt",
      "summary": "Verify the inputs before spending generation credits.",
      "tasks": [
        "Upload your trimmed source clip in the Reference/Source Video slot (@Video1).",
        "Upload Character Sheet 01 in the reference-images slot (@Image1). Add Sheet 02 as a separate image (@Image2) if replacing another person.",
        "Paste the prompt and check the reference mapping. Select an available quality (720p is a practical first test where offered), review the on-screen credit cost, then click Generate once."
      ],
      "output": "One rendered test video; save its prompt and settings."
    },
    {
      "number": "08",
      "phase": "AUDIT AND PUBLISH",
      "title": "Check the entire result before posting",
      "summary": "Repair one observed issue at a time.",
      "tasks": [
        "Watch the opening, middle and final frames for swapped positions, drifting faces or kits, floating hands or doubled bodies.",
        "If both faces mix, separate the character sheets and specify left and right more clearly. If background changes unexpectedly, try Object Swap with stronger KEEP instructions.",
        "Confirm rights for footage, characters and audio, make appropriate AI-content disclosures, and export a clean 9:16 clip when suitable for TikTok or Reels."
      ],
      "output": "One checked final video plus a correction note."
    }
  ],
  "characterSheetPrompt": "K4K ACADEMY — CHARACTER SHEET PROMPT\nUse @Image1 as the ONE authorised identity reference. Create one photorealistic character sheet, not several different people.\nViews: full-body FRONT, 3/4, SIDE, BACK, plus a clear face close-up where appropriate. Plain background and even neutral light.\nLOCK across all views: exactly the same face/eyes, glasses, hair, skin tone, natural body proportions and age appearance.\nOUTFIT: exactly [DESCRIBE JERSEY / T-SHIRT], [SHORTS / TROUSERS], [SHOES] and accessories, consistent in every view.\nDo not mix identities or clothing, invent logos, produce extra fingers, or vary body size.\nOutput: one crisp, clearly organised character-sheet image, no captions or watermarks.",
  "prompt": "K4K ACADEMY — HIGGSFIELD GENJUTSU SINGLE CHARACTER SWAP\n@Video1: the source clip that controls movement, timing, scene, camera, framing and remaining characters.\n@Image1: the replacement character and exact outfit.\nREPLACE: only [identify target by original position, clothing and action, e.g. person on LEFT] in @Video1 with the character from @Image1.\nLOCK: the exact face, hairstyle, glasses, skin tone, body proportions and full outfit/shoes from @Image1 in every frame.\nKEEP: all other people, audio where supported, scene, props, lighting, camera path and every original action, gesture and interaction from @Video1.\nFOLLOW: the original target person's precise motion and screen position with natural anatomy and contact shadows.\nAVOID: mixed faces/outfits, double heads, extra limbs, morphing, flickering, new subjects or background changes.\nFINAL: one photorealistic, consistent recast. Only the named person is replaced; no text or watermark.",
  "multipleCharactersPrompt": "K4K ACADEMY — GENJUTSU TWO-PERSON CHARACTER SWAP\n@Video1 = source video controlling all movement and camera.\n@Image1 = new character sheet for the original person on LEFT.\n@Image2 = new character sheet for the original person on RIGHT.\n1. Replace only the LEFT original character with @Image1.\n2. Replace only the RIGHT original character with @Image2.\n3. Keep any third person and all backgrounds unchanged.\nLOCK: faces, hairstyles, glasses, natural physiques, jerseys, shorts, footwear and accessories each match their assigned reference throughout.\nPRESERVE: video actions and gestures, pacing, camera tracking, location, contact shadows, props and original audio where supported.\nDO NOT mix the two faces or outfits, change places, merge bodies, duplicate hands/heads or alter unaffected people.\nMake one realistic, continuous two-character recast of @Video1.",
  "gates": [
    {
      "letter": "I",
      "title": "INVESTIGATE — THE HOOK",
      "description": "Select a compelling, rights-cleared reference and determine exactly who will change.",
      "steps": [
        "Choose 5–15 seconds with clear action and an opening hook.",
        "Map LEFT/RIGHT positions of characters in the original.",
        "Define output, target audience and permissions."
      ]
    },
    {
      "letter": "D",
      "title": "DIRECT — CHARACTER & PROMPT",
      "description": "Create consistent sheets and a one-to-one map of replacement characters.",
      "steps": [
        "Lock the correct face, body and outfit in the sheet.",
        "Use the single- or two-character prompt with correct @Image references.",
        "Keep the scene untouched in Object Swap; use Motion Transfer when recasting motion more broadly."
      ]
    },
    {
      "letter": "E",
      "title": "EXECUTE — GENJUTSU",
      "description": "Upload the video first, character sheets next, then paste the prompt and generate.",
      "steps": [
        "Open Higgsfield → Video → Genjutsu.",
        "Upload @Video1, @Image1 and optional @Image2 in their respective slots.",
        "Check credit price, mode, source/video roles, then Generate one test."
      ]
    },
    {
      "letter": "A",
      "title": "AUDIT — FIX & PUBLISH",
      "description": "Check for obvious glitches, inaccurate clothing, faces or timing.",
      "steps": [
        "Inspect first/middle/last frames and all character interactions.",
        "Fix just the issue discovered, avoiding contradictory prompt changes.",
        "Export and share only with suitable rights and AI disclosure."
      ]
    }
  ],
  "assignment": "Produce one 5–15 second character-swap edit with the approved source clip, at least one character sheet, final Genjutsu prompt and an IDEA review note.",
  "faults": [
    "Incorrect LEFT/RIGHT reference mapping",
    "Face and clothing changes mid-video",
    "Double faces, extra limbs or merged bodies",
    "Background changes after selecting the wrong mode",
    "Footage rights, audio rights or missing AI disclosure"
  ]
};
