export const k4kLessons=[
  {
    "id": "k4k-v3-realism",
    "slug": "reality-engine",
    "number": "01",
    "stage": "IMAGE FOUNDATION",
    "title": "THE REALITY ENGINE",
    "subtitle": "Make AI images feel photographed.",
    "image": 0,
    "duration": "30 MIN",
    "focus": "Same identity, controlled realism",
    "intro": "Begin with the masked K4K creator in a moving city crowd. Learn which details make an image feel truly photographed instead of merely high-resolution.",
    "objective": "Deliver a believable portrait while keeping the person's black balaclava, glasses, eye region and proportions consistent.",
    "gates": [
      {
        "letter": "I",
        "title": "INVESTIGATE",
        "description": "Choose an approved identity photo and one separate visual mood reference. Record the precise camera height, image aspect ratio, light source and what makes this subject recognisable.",
        "steps": [
          "Reference one: masked creator identity, eyes, glasses and silhouette.",
          "Reference two: photographic treatment, not a second person.",
          "Write KEEP (identity) and CHANGE (style, framing, light) before prompting."
        ]
      },
      {
        "letter": "D",
        "title": "DIRECT",
        "description": "Choose either a candid street frame or an editorial portrait. Describe direction of light, focus, subtle camera grain and blur on moving passersby only.",
        "steps": [
          "Face, mask and glasses stay sharp and consistent.",
          "Choose a plausible street-camera distance and lens feel.",
          "Keep visual imperfections restrained: realistic noise, not fake degradation."
        ]
      },
      {
        "letter": "E",
        "title": "EXECUTE",
        "description": "Test three modest variations from the same identity source. Note the model used, version of the prompt, credits and most obvious discrepancy.",
        "steps": [
          "Upload the approved identity first and mood reference second.",
          "Avoid upscaling until the facial details and anatomy are acceptable.",
          "Choose based on the identity match—not on a dramatic background alone."
        ]
      },
      {
        "letter": "A",
        "title": "AUDIT",
        "description": "Compare image regions systematically. If the glasses change shape, mask seams distort or the crowd creates ghost limbs, revise only the necessary instruction.",
        "steps": [
          "Verify eye spacing, mask contour, frame of glasses and jacket zipper.",
          "Check daylight direction and contact shadows agree.",
          "Keep sharp main character and motion blur only for moving people."
        ]
      }
    ],
    "prompt": "K4K IDEA — PHOTOGRAPHIC REALISM\n@Image1 is the approved masked-creator identity. @Image2 is an optional photographic atmosphere reference, not a second person.\nKEEP: exact visible eyes, black balaclava silhouette, rectangular glasses, original body proportions and age appearance.\nCREATE: one believable [STREET / EDITORIAL] photo with [EYE LEVEL / LOW ANGLE] camera, [35MM / 85MM] lens feel, [SOFT DAYLIGHT / STUDIO SOFTBOX] light, credible shadows and natural fabric texture.\nBACKGROUND: [DESCRIBE]. Keep the subject sharp; blur only people actually moving in the distance.\nSTYLE: understated sensor grain and natural colour response, without airbrushed skin or excessive HDR.\nCHANGE ONLY: environment style, chosen camera treatment and lighting. Do not invent the hidden face.\nAUDIT: eyes, glasses, mask, hands, lighting and background physics. One 4:5 still, no text.",
    "assignment": "Submit one 4:5 final portrait, the KEEP/CHANGE brief, three candidates and a short record of which correction improved realism.",
    "faults": [
      "Plastic skin and over-sharpened details",
      "Eyewear or eye shape drifting",
      "Subject blurred together with the moving crowd"
    ]
  },
  {
    "id": "k4k-v3-wardrobe",
    "slug": "wardrobe-lock",
    "number": "02",
    "stage": "WARDROBE DIRECTION",
    "title": "THE WARDROBE LOCK",
    "subtitle": "Change the clothes. Keep the person.",
    "image": 1,
    "duration": "35 MIN",
    "focus": "One character, one wardrobe change",
    "intro": "Use the same masked creator from your black-jacket reference to practise a single intentional clothing change.",
    "objective": "Replace the outfit while keeping the same facial identity, pose, background, camera and natural lighting.",
    "gates": [
      {
        "letter": "I",
        "title": "INVESTIGATE",
        "description": "Start with an accurate base photo. Prepare a flat-lay of the target clothing; keep shoes or accessories on a separate reference when necessary.",
        "steps": [
          "Image 1: person and pose to preserve.",
          "Image 2: outfit and fabric details to apply.",
          "Image 3 optional: one accessory group—no new face or body."
        ]
      },
      {
        "letter": "D",
        "title": "DIRECT",
        "description": "Describe only the new garment: collar, fit, colour, fabric, seams, sleeves and any explicitly approved mark. The base photo controls everything else.",
        "steps": [
          "Write one clear change request; don't redesign the shot.",
          "Keep glasses, balaclava, hands, body size and camera fixed.",
          "Use a separate iteration if you later need a new location."
        ]
      },
      {
        "letter": "E",
        "title": "EXECUTE",
        "description": "Compare a short and a precise clothing prompt. Reject any variant that borrows someone else's anatomy from the garment reference.",
        "steps": [
          "Maintain the same input order across renders.",
          "Choose natural fabric folds and accurate shadow contact.",
          "Do not spend credits improving a candidate with a changed identity."
        ]
      },
      {
        "letter": "A",
        "title": "AUDIT",
        "description": "Line up the before and after images. Check that only clothing changed; the background, body shape, hands and camera must still match.",
        "steps": [
          "Compare eye region, glasses and mask edge.",
          "Check sleeves and shoes match the new wardrobe brief.",
          "Remove invented badges, duplicated chains and implausible fabric."
        ]
      }
    ],
    "prompt": "K4K IDEA — WARDROBE CONTROL\n@Image1 = the approved masked creator and original composition. @Image2 = the NEW clothes. @Image3 = optional accessories.\nCHANGE: replace ONLY the chosen garments in @Image1 with the outfit in @Image2. Copy garment cut, fabric, stitching, fit and approved colour accurately.\nPRESERVE: identical person's visible eyes, balaclava, glasses, body proportions, pose, hands, camera angle, framing, background and illumination from @Image1.\nDo not copy a model, face, pose or background from @Image2. Use @Image3 only for named accessories, not new identity.\nREALISM: fabric folds must match body posture, correct highlights and shadows, no extra fingers, no unapproved logos.\nAUDIT: compare matching image regions. Final deliverable: one controlled before/after, 4:5 aspect ratio.",
    "assignment": "Submit a before/after pair and identify every item that was intentionally replaced. Nothing else should change.",
    "faults": [
      "Unwanted changes to scene or framing",
      "Copying the outfit model's physique",
      "New accessories, logos or anatomy glitches"
    ]
  },
  {
    "id": "k4k-v3-scene",
    "slug": "scene-transfer",
    "number": "03",
    "stage": "ENVIRONMENT DESIGN",
    "title": "THE SCENE TRANSFER",
    "subtitle": "New location. Same creative identity.",
    "image": 2,
    "duration": "35 MIN",
    "focus": "Environment without identity drift",
    "intro": "Study a cinematic locker-room setting. Learn to move an existing masked character between spaces while controlling geometry, shadows and body scale.",
    "objective": "Replace only the location while protecting the person, clothing and overall visual identity.",
    "gates": [
      {
        "letter": "I",
        "title": "INVESTIGATE",
        "description": "Choose the creator identity base and a separately approved environmental reference. Identify walls, light sources, benches, camera horizon and ground plane.",
        "steps": [
          "Image 1: masked creator in the exact clothes to keep.",
          "Image 2: room or new environment only.",
          "Record the light direction, scale and points of contact."
        ]
      },
      {
        "letter": "D",
        "title": "DIRECT",
        "description": "Design the new placement with physically plausible seating, feet, hand-object contact and foreground occlusion. Changing costume is a separate wardrobe task.",
        "steps": [
          "Lock eyes, glasses, mask, stance and outfit.",
          "Specify how the setting should affect natural light and shadows.",
          "If the reference shows another outfit, do not copy it inadvertently."
        ]
      },
      {
        "letter": "E",
        "title": "EXECUTE",
        "description": "Generate a few location-only passes. Match architecture first, then choose the result with convincing body scale and shadows.",
        "steps": [
          "Set unambiguous reference roles in the prompt.",
          "Render location only before attempting any other change.",
          "Keep a written record of scene geometry errors."
        ]
      },
      {
        "letter": "A",
        "title": "AUDIT",
        "description": "Inspect subject-to-object contact, shadows, body proportions and identity. The locker-room photo is a visual example, not proof that clothes were preserved from a different base image.",
        "steps": [
          "Person remains recognisable at every crop.",
          "No floating ball, hands or feet; plausible bench proportions.",
          "If clothing changed, reject and simplify the instructions."
        ]
      }
    ],
    "prompt": "K4K IDEA — ENVIRONMENT TRANSFER\n@Image1 is the original masked person AND the clothing to preserve. @Image2 defines only the destination space.\nGOAL: Place the same subject into [LOCKER ROOM / NEW ENVIRONMENT] with a credible camera perspective and integration.\nLOCK: original balaclava, glasses, eyes, body scale, clothing, approved accessories and posture intent from @Image1.\nENVIRONMENT: use layout, materials, perspective and practical lights described by @Image2; integrate shadows and physical contact naturally.\nCHANGE ONLY: location, environmental light and necessary contact shadows.\nDO NOT: borrow another person's body or wardrobe from @Image2, morph face, add props unrequested or float the subject.\nAUDIT: proportions, face, clothes, surface contact, room scale and lighting. Output one realistic 4:5 image.",
    "assignment": "Submit one environment-transfer attempt and a side-by-side audit showing the subject stayed identical while the setting changed.",
    "faults": [
      "Copying clothing from environmental reference",
      "Floating props or missing shadows",
      "Background perspective mismatch"
    ]
  },
  {
    "id": "k4k-v3-control",
    "slug": "prompt-control",
    "number": "04",
    "stage": "CONTROLLED GENERATION",
    "title": "THE PROMPT CONTROL ROOM",
    "subtitle": "One variable at a time.",
    "image": 0,
    "duration": "30 MIN",
    "focus": "Small edits, repeatable results",
    "intro": "Build an original prompt vault for camera angle, lighting, expression, cropping and precise removals, based on your K4K IDEA production record.",
    "objective": "Write a prompt system that changes one chosen detail while keeping every unrelated part fixed.",
    "gates": [
      {
        "letter": "I",
        "title": "INVESTIGATE",
        "description": "Pick one base photo and write a testable goal. Identify the sole variable you intend to change—lighting, crop, expression or small removal.",
        "steps": [
          "Define success in one sentence.",
          "Separate image identity from styling instructions.",
          "Write a lock list for everything outside the chosen variable."
        ]
      },
      {
        "letter": "D",
        "title": "DIRECT",
        "description": "Write the prompt using a repeatable structure: reference, lock, change, camera, quality and audit. Avoid conflicting lighting directions or unnecessary adjectives.",
        "steps": [
          "Specify one lighting condition per variation.",
          "Reference exactly the image that controls identity.",
          "Give direct, observable instructions."
        ]
      },
      {
        "letter": "E",
        "title": "EXECUTE",
        "description": "Run three inexpensive tests. Change one prompt instruction at a time and record the model and cost.",
        "steps": [
          "Label versions 01, 02 and 03.",
          "Save each prompt beside its generated result.",
          "Prefer controlled reliability over impressive but inconsistent effects."
        ]
      },
      {
        "letter": "A",
        "title": "AUDIT",
        "description": "Compare results against the reference, not only against one another. Keep reliable prompts with notes about their limits.",
        "steps": [
          "Confirm requested change occurred.",
          "Confirm identity, outfit and camera remained locked.",
          "Keep only prompts you have evaluated and can explain."
        ]
      }
    ],
    "prompt": "K4K IDEA — UNIVERSAL CONTROLLED EDIT\nBASE: @Image1 is the single approved masked-creator photograph.\nPRESERVE: person, eyes, glasses, balaclava, age appearance, clothing, body scale, pose, scene, objects, camera and crop—except the one named field below.\nCHANGE ONLY: [ONE VARIABLE: LIGHT / CROP / EXPRESSION / REMOVE OBJECT].\nINSTRUCTION: [PRECISE, SHORT DIRECTION THAT CAN BE VERIFIED].\nQUALITY: natural photographic detail and plausible shadows. Do not invent new items or people.\nAUDIT: explain whether the one requested edit happened and identify any unwanted differences. Reject outputs that drift from the base.",
    "assignment": "Create your own mini prompt vault: one cropping edit, one lighting edit and one controlled removal, each with a review note.",
    "faults": [
      "Changing multiple variables and not knowing why results differ",
      "Overlong prompts that accidentally rewrite the scene",
      "No evidence that other elements stayed fixed"
    ]
  },
  {
    "id": "k4k-v3-audit",
    "slug": "final-quality-gate",
    "number": "05",
    "stage": "IDEA CAPSTONE",
    "title": "THE FINAL QUALITY GATE",
    "subtitle": "From a good image to a defensible process.",
    "image": 2,
    "duration": "45 MIN",
    "focus": "Bring every IDEA stage together",
    "intro": "Make a three-image editorial sequence featuring your own character, with camera decisions, a controlled clothing or scene change and a documented quality check.",
    "objective": "Deliver a short, repeatable AI production exercise and explain how each visual decision was made.",
    "gates": [
      {
        "letter": "I",
        "title": "INVESTIGATE",
        "description": "Write the creative aim, audience, source rights, visual references and success criteria before generating.",
        "steps": [
          "Select three approved source references.",
          "Set format and target platform.",
          "Budget for test variants; no promises of view counts."
        ]
      },
      {
        "letter": "D",
        "title": "DIRECT",
        "description": "Create a continuity brief for eyes, mask, glasses and proportions. Storyboard the three frames: establishing, variation and close-up.",
        "steps": [
          "Keep the identity bible and controlled variable separate.",
          "Identify the camera and light for each frame.",
          "Plan physical contact with any prop or ball."
        ]
      },
      {
        "letter": "E",
        "title": "EXECUTE",
        "description": "Render short and affordable passes, keep the chosen seed/settings if available, and document the prompt versions.",
        "steps": [
          "Run three consistent image tests.",
          "Only move into animation after the stills pass quality control.",
          "Record model, aspect ratio and external credit cost."
        ]
      },
      {
        "letter": "A",
        "title": "AUDIT",
        "description": "Examine the start, centre and final frame. Check physics, identity, outfit, scene, rights, disclosure and export quality. Revise the weakest fault first.",
        "steps": [
          "Make one documented correction based on observation.",
          "Export final 4:5 stills or authorised short footage.",
          "Archive your prompts, references and a brief honest evaluation."
        ]
      }
    ],
    "prompt": "K4K IDEA — FINAL CREATOR PRODUCTION\nI — INVESTIGATE: Goal [WHAT], audience [WHO], licensed references [SOURCES], target platform [WHERE] and success condition [CHECK].\nD — DIRECT: @Image1 anchors the masked character's eye region, black balaclava, rectangular eyewear and scale. @Image2 may control clothes; @Image3 may control a scene. Keep image roles separate. Specify camera, light, physical action and immutable elements.\nE — EXECUTE: make three controlled variants with recorded model, prompt version, settings and credit budget. Avoid long unpredictable generations.\nA — AUDIT: compare identity, clothing, hands, objects, lighting, perspective, source permission and clarity. Repair one observable failure. Disclose synthetic content when appropriate.\nDELIVER: three connected visuals plus your IDEA production log. Do not guarantee viral success.",
    "assignment": "Submit three linked images, your IDEA production log, your strongest revision and a short account of what did not work.",
    "faults": [
      "No continuity between shots",
      "No production or cost record",
      "Missing source permission or unrealistic claims"
    ]
  }
];

export const k4kToolkit=[
  {
    "tag": "IDENTITY",
    "title": "Lock the character",
    "prompt": "@Image1 is the only identity source. Keep the exact black balaclava, rectangular glasses, visible eyes, facial proportions, natural scale and approved outfit. Change ONLY [ONE ELEMENT]. Do not invent the hidden face. Audit each element against the original."
  },
  {
    "tag": "CAMERA",
    "title": "Control the crop",
    "prompt": "Use @Image1 unchanged except for the framing. Recompose as [HEADSHOT / WAIST UP / FULL BODY] with a physically plausible lens. Keep the same person, wardrobe, lighting, background, posture intent and all existing props."
  },
  {
    "tag": "LIGHTING",
    "title": "One light adjustment",
    "prompt": "Relight @Image1 using [OVERCAST DAYLIGHT / SOFT WINDOW / WARM LAMP / COOL LED / DIRECT FLASH]. Change ONLY lighting and physically necessary reflections and shadows. Lock the person, outfit, camera, background and composition."
  },
  {
    "tag": "REALISM",
    "title": "Street-photography texture",
    "prompt": "Maintain @Image1 identity while creating a realistic street-camera photograph: natural exposure, restrained sensor grain, no heavy HDR, accurate clothing texture and moving background people with subtle motion blur. Keep the masked creator sharp."
  },
  {
    "tag": "WARDROBE",
    "title": "Costume-only remix",
    "prompt": "@Image1 is the identity and pose reference. @Image2 is clothing only. Replace the named outfit, preserving the person, eyewear, balaclava, hands, scene, light and perspective. No new body, logos or jewellery."
  },
  {
    "tag": "SCENE",
    "title": "Location-only change",
    "prompt": "@Image1 is the character including clothing. @Image2 defines only the destination scene. Retain exact identity and outfit while matching new scene geometry, realistic lighting and contact shadows. No extra people or floating props."
  },
  {
    "tag": "RETOUCH",
    "title": "Precise object removal",
    "prompt": "Remove only [NAMED OBJECT] from @Image1. Restore the underlying area naturally. Leave the subject, glasses, mask, clothes, lighting, objects, shadows, camera and composition unchanged."
  },
  {
    "tag": "AUDIT",
    "title": "Quality-control review",
    "prompt": "Compare the original image with the generated result. List verified matches, specific failures by image region and one actionable correction. Review identity, pose, clothes, hands, background, physics and image rights. Do not invent details that cannot be seen."
  }
];
