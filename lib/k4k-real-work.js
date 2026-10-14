// Curated examples from K4K's existing Academy lessons and completed creative jobs.
// Do not turn production examples into earnings, view-count or quality guarantees.
// The project previews are teaching references, not evidence of student outcomes.
export const frameMethod=[
 {letter:'F',number:'01',title:'FIND THE FRAME',tag:'Reference & rights',description:'Choose an original idea or footage you are authorised to reuse. Identify one clear action and what the viewer needs to understand.',actions:['Save the reference or a storyboard of the idea.','Mark the exact 5–15 second segment you will produce.','Write down the permitted use of the footage and audio.'],output:'Reference clip or storyboard + usage notes',check:'One obvious subject and action; clear source rights.'},
 {letter:'R',number:'02',title:'READ THE MOTION',tag:'Shot breakdown',description:'Study camera distance, framing, timing, environment and occlusions. A long prompt cannot fix an unclear reference.',actions:['Make three screenshots: start, midpoint and final frame.','Describe the main movement, camera position and any background people.','Mark the shots most likely to break: turns, hands and contact.'],output:'Three-frame shot map + timing notes',check:'Every cut, camera move and key interaction identified.'},
 {letter:'A',number:'03',title:'ANCHOR THE IDENTITY',tag:'Character & image lab',description:'Build a clean reference sheet or keyframe that keeps the same face, wardrobe, body scale, footwear and lighting logic.',actions:['Prepare front, side, full-body and facial close-up views.','Write a short identity-and-wardrobe lock in the prompt.','Check face, hands, clothes and proportions across all panels.'],output:'One usable character sheet + identity lock',check:'Same identity and body scale across all references.'},
 {letter:'M',number:'04',title:'MAKE, MEASURE, REPEAT',tag:'Generation & iteration',description:'Select the right tool for the job. Run a short test, compare it with the reference and revise one problem at a time.',actions:['Choose image-to-video or video-to-video based on what matters most.','Create a short test before paying for a longer render.','Log the tool, input, prompt version, output and visible failures.'],output:'Test render + saved prompt and iteration log',check:'Camera, character, motion and background stay coherent.'},
 {letter:'E',number:'05',title:'EDIT & EARN THE FINISH',tag:'Quality & delivery',description:'Make the final edit readable and responsible. Fix the weak frames, confirm source permissions, and export for the actual platform.',actions:['Check the opening, middle, ending and fast movement frame-by-frame.','Trim or redo glitches; restore properly licensed audio.','Export in the target format and clearly identify AI-generated work as needed.'],output:'Final export + honest before/after and project record',check:'A finished, reviewable file—not a promise of viral reach.'}
];

const cloud='https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/';
const gen='https://d8j0ntlcm91z4.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/';

export const realProjects=[
 {id:'dembow',no:'01',title:'Dembow Party',subtitle:'One performer, consistent motion',track:'MOTION TRANSFER',type:'video',featured:true,
  cover:cloud+'06017105-11b5-47e6-aafd-f942478ead64.jpg',
  video:cloud+'94c04cc0-e9f1-48cf-a4fd-a8c271ba069d.mp4',
  source:cloud+'b5e27d9d-a109-4525-8306-ea3f70e4dcc9.mp4',
  href:'/academy/workflows/viral-character-swap',tool:'Higgsfield Genjutsu · character replacement',
  evidence:'46-second source and 16-second AI excerpt available side by side',
  lesson:'Identify the matching 16-second moment, lock the replacement outfit and inspect crowd interactions.',
  challenge:'Replace one consenting actor in your own 8-second clip; keep background extras untouched.',
  failures:['Face or outfit changes on camera turns','Hands and people intersect unnaturally','The AI result no longer matches source timing'],
  status:'Full documented lesson'},
 {id:'puskas',no:'02',title:'Football Motion Study',subtitle:'Ball contact, scale and tracking',track:'FOOTBALL RECREATION',type:'video',featured:true,
  cover:cloud+'4b7dae04-8bad-475f-b0d7-fe4a884a46a0.jpg',
  video:cloud+'a052972a-6037-4938-8800-c39b8446074b.mp4',
  source:cloud+'b9fefbf2-47b1-495d-8ede-a66bd3841a60.mp4',
  href:'/academy/workflows/puskas-character-swap',tool:'Reference-driven character replacement',
  evidence:'Existing Academy lesson includes original and AI result, character reference and prompt',
  lesson:'The replacement character must keep their natural height while interacting with the ball.',
  challenge:'Record or license a simple moving-ball clip; compare foot contact frame-by-frame.',
  failures:['Floating or enlarged feet','Ball moves without physical contact','Camera changes when the character turns'],
  status:'Full documented lesson'},
 {id:'portrait',no:'03',title:'The Character Sheet',subtitle:'A face that survives every angle',track:'IMAGE CREATION',type:'image',featured:true,
  cover:cloud+'32d483de-7d94-4b63-89c2-454821b2c4d9.png',href:'/prompts',
  tool:'AI image editing · multi-angle reference',evidence:'Real four-panel black-suit character reference uploaded for an Academy production',
  lesson:'Identity consistency comes from front and profile body views plus detailed facial references—not from adjectives alone.',
  challenge:'Make a four-view original character sheet and compare glasses, hairline, footwear and silhouette.',
  failures:['Different nose, glasses or haircut between panels','Body shape changes between front and side','Accessories disappear in one view'],
  status:'Visual reference + prompt resources'},
 {id:'avatar',no:'04',title:'Founder Avatar in Three Languages',subtitle:'British English · Spanish · Portuguese',track:'SPEAKING AVATAR',type:'video',featured:true,
  cover:cloud+'6843d58a-5ae4-4763-9994-ed4e26c0310f.jpg',
  video:gen+'hf_20261012_104537_a5c9dbff-fb67-4430-8919-1bf9d7ba65a9.mp4',
  extras:[{title:'Spanish',video:gen+'hf_20261012_104538_c845469e-1d32-49e0-b59c-a1f3aa2e1c3b.mp4'},{title:'Portuguese',video:gen+'hf_20261012_104537_5acead43-3ad0-4e8e-9038-fc22a6149e4d.mp4'}],
  href:'/academy/method#step-04',tool:'Grok Video · portrait-to-talking-video',
  evidence:'Three separate completed 8-second avatar generations, each from the same portrait reference',
  lesson:'Adapt the words, accent and pacing for each language; always check lip synchronisation and pronunciation.',
  challenge:'Create one natural 8-second introduction in a language you speak. Review spoken words before publishing.',
  failures:['Mouth movement and audio disagree','Identity changes during expression','Words get omitted or sound unnatural'],
  status:'Completed examples · independent quality check required'},
 {id:'squad',no:'05',title:'Multi-Character Cast',subtitle:'Protect the background and every role',track:'ADVANCED RECAST',type:'video',featured:false,
  cover:cloud+'653df9b1-a441-4807-9faa-bd9635c51ffc.webp',
  video:gen+'hf_20261011_171350_fa8a848a-6e5f-498d-af5d-f3082ae07b8e.mp4',
  href:'/academy/method#step-04',tool:'Higgsfield Genjutsu · multiple image references',
  evidence:'Completed multi-reference football-squad experiment recorded in the creation gallery',
  lesson:'Recasting a whole ensemble is harder than replacing one subject; assign and review identities separately.',
  challenge:'Start with two consenting participants before attempting a larger cast.',
  failures:['Faces swap roles between cuts','Background people are changed accidentally','Motion or singing is no longer synchronised'],
  status:'Experiment · not a step-by-step course'},
 {id:'fictional',no:'06',title:'The Fictional Goalkeeper',subtitle:'Start with your own invented scene',track:'ORIGINAL STORY',type:'video',featured:false,
  cover:gen+'hf_20261010_142008_1855800e-3795-470a-ac0c-83764c8a48fd.png',
  video:gen+'hf_20261010_142158_b958aed2-fe16-4860-9085-00df757f54e2.mp4',
  href:'/academy/topics/build-ai-video-from-scratch',tool:'Image references → Seedance 2.5',
  evidence:'Completed original-character scene generation; concept and image-reference inputs available',
  lesson:'A fictional subject avoids misleading viewers into believing a real sporting event happened.',
  challenge:'Invent an original 6-second dramatic sports moment and produce one coherent shot.',
  failures:['Costume changes mid-scene','Unwanted camera cuts','Physical motion lacks weight'],
  status:'Completed example · production study'}
];

export const honestPromise=[
 'You learn repeatable production decisions and can practise with real references.',
 'Results depend on your inputs, the model and the time spent testing and editing.',
 'External AI tools can require separate accounts and paid credits.',
 'Membership does not promise viral views, followers, jobs, earnings or flawless outputs.',
 'Only use footage, people, trademarks and music when you have appropriate rights or permission.'
];
