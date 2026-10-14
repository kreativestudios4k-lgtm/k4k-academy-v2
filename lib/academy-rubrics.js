// Practical quality standards added to existing Academy lessons.
// Students are not told they have completed a skill simply for reading a page.
export const topicStandards={
 'truth-behind-ai':{
   stage:'F / R', outcome:'Make a truthful project plan before generating anything.',
   task:'Choose one video or image you own. Mark which parts are source material and which parts you would generate. Describe one realistic limitation and one copyright/consent consideration.',
   outputs:['One-page reference and rights note','A three-frame screenshot comparison plan','One written AI limitation you will actively test'],
   criteria:['The original and AI-generated material are clearly labelled','The proposed source material has an appropriate licence or permission','The desired result is small enough to review carefully'],
   faults:['Claiming tools can guarantee an identical output','Using a recognisable person without appropriate permissions','Assuming an AI result is an accurate record of an event'],
   related:'/academy/method#step-01'
 },
 'first-ai-video':{
   stage:'A / M', outcome:'Produce a short, reviewable test rather than an ambitious uncheckable sequence.',
   task:'Create one still image featuring a fictional or consenting subject. Animate a single, clearly described 4–8 second action. Keep a copy of the still, the exact prompt and your first result.',
   outputs:['Source image or four-view reference','One short exported test video','Saved prompt and two notes about the result'],
   criteria:['The action is visible from beginning to end','The face, body size and clothing remain consistent','You can describe exactly which input produced this result'],
   faults:['An unexpected cut interrupts the shot','Hands or feet become distorted','A face or background changes partway through'],
   related:'/academy/gallery#fictional'
 },
 'ai-creator-toolkit':{
   stage:'M', outcome:'Select a model for an actual task using evidence rather than hype.',
   task:'Compare image-to-video and video-to-video on one limited goal. Record what files each tool requires, the available duration and your estimated cost before generating.',
   outputs:['Two-column tool decision table','Your chosen model and justification','A written cost and usage-rights check'],
   criteria:['Tool input requirements fit the material you have','You have acknowledged limits, duration and available credits','Your choice matches the task (new motion vs preserved motion)'],
   faults:['Buying credits before checking a model supports the needed inputs','Confusing an image-generation model with motion transfer','Selecting a model only because its marketing promises realism'],
   related:'/academy/gallery'
 },
 'build-ai-video-from-scratch':{
   stage:'F / R / A / M',outcome:'Develop one original 6–10 second story with a repeatable visual identity.',
   task:'Write a single-shot scene brief for an original fictional character, create the character reference, generate a test and mark at least one change you would make.',
   outputs:['Scene brief with subject, location, action and camera','Consistent character or first-frame reference','Test result + revision notes'],
   criteria:['One clear visual action is described','The character identity and costume match their references','Lighting, motion and location stay logically consistent'],
   faults:['Unrequested extra people or camera cuts','Different costumes or scale across shots','Prompts contain contradictory actions'],
   related:'/academy/gallery#fictional'
 },
 'signature-k4k-method':{
   stage:'F / R / A / M / E',outcome:'Complete one authorised reference-to-recreation project.',
   task:'Using footage you own or have permission to reuse, isolate a clear segment, build a multi-angle character sheet, perform a motion-transfer test and compare source and result at matching frames.',
   outputs:['Authorised reference segment and shot map','Multi-angle identity sheet and exact prompt','AI recreation, quality notes and final export'],
   criteria:['Camera action and timing match the planned segment','The same character, height and clothes survive changes of angle','You reviewed hand contact, occlusion and final audio'],
   faults:['Background people unexpectedly replaced','Body size changes, floating feet or morphing hands','The output is longer or different from the segment you analysed'],
   related:'/academy/workflows/viral-character-swap'
 },
 'professional-ai-creator':{
   stage:'E',outcome:'Package one responsible, client-reviewable video deliverable.',
   task:'Create a professional handover with the final video, one thumbnail, the key references and prompt version, proof of rights, and a short note describing what AI contributed.',
   outputs:['Final export sized for its real destination','Original references, prompt log and QC notes','Rights statement, AI disclosure and handover message'],
   criteria:['Audio is licensed and spoken words are reviewed if generated','There are no obvious distortions at start, mid-frame or end','Your claims describe only what you can demonstrate'],
   faults:['Unlicensed commercial music or client logos','Promising views or revenue as a deliverable','Handing over an unchecked or low-quality render'],
   related:'/academy/gallery'
 }
};
