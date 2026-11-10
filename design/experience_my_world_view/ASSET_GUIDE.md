# World View page: Gemini asset guide

Every asset for *"The Flag Nobody Could Break"*, organised **chat by chat**.
Open one Gemini chat per section below. Paste its **first message**, then send its prompts **in order**, one at a time.

---

## Before you start (read once)

**Gemini settings**
- Use the **Pro image model** (Nano Banana Pro, or the newest model labelled Pro) and **Create images**.
- Pick the **highest resolution** (2K or 4K). If there's an aspect-ratio picker, match it to the prompt (16:9, 3:2 or 9:16).

**After each image**
- **Download the original** and save it with the file name shown, under `design/experience_my_world_view/assets/`. Don't screenshot it or paste it into chat; both shrink it.
- **Check it:**
  - background is flat white, green or magenta (no paper texture, no border);
  - nothing is cropped;
  - there's no text or fake letters;
  - the character matches the reference sheet.
  
  If it fails, regenerate. One slightly wrong frame is fine, because I can fix that.

**If something goes wrong**
- **Gemini edits the old image instead of making a new one:** make sure the prompt starts with *"New image:"*.
- **The style drifts after many images:** open a new chat, paste the same first message again, attach the reference sheet, and continue from where you stopped.
- **A prompt is refused:** soften the words. "Riot police" becomes "security officers with shields", and "barricade" becomes "pile of old tyres and broken furniture".
- **A sparkle watermark appears in the bottom-right:** fine. Keep art away from that corner and I'll crop it off.

**Never draw:** flags, cloth on poles, fire, smoke, words or speech bubbles. I make all of those in code.

---

## Your two style references (T1 and T2)

T1 and T2 are the **two test images you already made**. Save them into `assets/tests/` with these names (download the originals from Gemini). Some chats ask you to **attach** them so Gemini copies their style; you don't need to make them again.

| Name | What it is | Save as |
|---|---|---|
| **T1** | the hero test: the man in the mustard shirt with the red gamchha | `assets/tests/T1-ink.png` |
| **T2** | the street test: the Dhaka street with tangled wires, seen from below | `assets/tests/T2-street.png` |

If you lose them or want to remake them, use these prompts:

**T1 (ink style)**
```
New image: A young Bangladeshi man with warm brown skin standing confidently, full body, three-quarter view, low camera angle looking up at him. Faded mustard-yellow half-sleeve shirt, a red-and-white checked gamchha scarf around his neck, dark trousers rolled up at the ankles, rubber sandals. Clean Japanese manga ink illustration with crisp black outlines and halftone screentone shading. Single figure, centred, flat pure white background, no paper texture, no border. Square 1:1 image.
```

**T2 (painted style)**
```
New image: A busy Dhaka street seen from a very low angle looking up: tall crowded apartment buildings with balconies, laundry with a few red cloths, tangled electric wires, a cloudy sky, warm afternoon light. No people. Painterly illustration with confident ink outlines, risograph halftone texture, slight red/cyan misregistration, muted teal, ochre and brick colours. Edge to edge, no border, no text or fake letters. Wide 16:9 landscape image.
```

---

## Chat overview

| Chat | Purpose | Images |
|---|---|---|
| 1 | Hero | 7 |
| 2 | Garment worker | 2 |
| 3 | Student | 2 |
| 4 | Farmer | 2 |
| 5 | Keffiyeh woman | 2 |
| 6 | Rickshaw puller | 2 |
| 7 | Masked protester | 3 |
| 8 | Hands, rock, crowd, shields | 4 |
| 9 | Chapter 1 street | 7 |
| 10 | Chapter 3 march road | 3 |
| 11 | Chapter 4 barricade | 3 |
| 12 | Chapter 6 sky and plants | 5 |
| 13 | Chapter 6 comrades portrait | 7 |
| 14 | Chapter 7 ending | 4 |
| 15 | Textures | 4 |
| — | Music and sound (not Gemini) | — |

**Priority:** do Chats **1, 2, 8, 10 and 15** first. That's enough for me to build The March and The Flag.

---

## CHAT 1: Hero 🧍
*Tip: continue in the Gemini chat where you made the T1 hero test. If that chat is gone, start a new one and attach `assets/tests/T1-ink.png` with the first message.*

**First message**
```
For everything in this chat, use this exact style:
Clean Japanese manga ink illustration, like a classic 1980s–90s seinen manga. Crisp black ink outlines with strong line-weight variation, halftone screentone dot shading, flat colour fills. Limited palette: ink black, off-white, one strong red (#C8102E), muted earthy clothing colours, warm brown South Asian skin tones. No gradients, no 3D, no photorealism. Light from the top-left. Flat pure white background (#FFFFFF) with no paper texture, no vignette and no border. No ground shadow, no text, no signature, no watermark.
The main character in this chat is HERO: a lean young Bangladeshi man in his early 20s with warm brown skin and South Asian facial features, messy thick black hair, light stubble, faded mustard-yellow half-sleeve button shirt with sleeves rolled up, dark charcoal trousers rolled up at the ankles, worn black rubber sandals, a red-and-white checked cotton gamchha scarf around his neck, a small brown cloth satchel across his body.
Reply only with "Ready". Do not create an image yet.
```

**1.1 → `hero/H0-reference.png`**
```
New image: Character reference sheet of HERO. Show him four times side by side at the same size: front view, three-quarter view, side view facing right, back view. Neutral standing pose, arms relaxed. Full body, nothing cropped. Wide 16:9 landscape image.
```
⭐ Regenerate until this is perfect. Every later image copies it.

**1.2 → `hero/H1-walk.png`**
```
New image: Sprite sheet of HERO walking normally, head slightly down, hands empty. 8 frames, side view facing right, grid of 4 columns × 2 rows:
1. contact: right heel touches the ground in front, left leg straight behind on its toes, left arm forward, right arm back.
2. down: weight on the right leg, knee bent, body at its lowest.
3. passing: right leg straight under the body, left leg bent and passing forward, arms by the sides.
4. up: pushing off the right toes, body at its highest, left leg swinging forward.
5. contact: left heel touches the ground in front, right leg straight behind, right arm forward, left arm back.
6. down: weight on the left leg, knee bent, body lowest.
7. passing: left leg straight under the body, right leg passing forward.
8. up: pushing off the left toes, body highest, right leg swinging forward.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Feet on one shared baseline in each row. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

**1.3 → `hero/H2-pickup.png`**
```
New image: Sprite sheet of HERO, 4 frames in one row, side view facing right:
1. stopping mid-walk and turning his head up to notice something above him.
2. reaching up high with his right arm, fingers open.
3. tugging something down, a small bunched red cloth now in his fist.
4. holding the small red cloth in both hands at chest height, looking down at it, quietly thinking.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Feet on one shared baseline. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

**1.4 → `hero/H3-tie.png`**
```
New image: Sprite sheet of HERO, 3 frames in one row, three-quarter view:
1. crouching, picking up a plain bare bamboo stick from the ground.
2. standing, tying a small knot of red cloth onto the top of the bare stick with both hands, focused face.
3. standing, holding the bare stick upright at his side with one hand, looking up at its top.
The red cloth is only a small knot. Do not draw a flag.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Feet on one shared baseline. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

**1.5 → `hero/H4-raise.png`**
```
New image: Sprite sheet of HERO, 4 frames in one row, front three-quarter view, low camera angle. He holds a bare bamboo pole with NO flag and NO fabric on it:
1. pole held low across his body with both hands.
2. lifting the pole upward, determined.
3. right arm fully extended overhead holding the pole high, chin up, defiant.
4. same as frame 3 but straining: arm trembling, teeth clenched, knees slightly bent, sweat drops.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Feet on one shared baseline. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

**1.6 → `hero/H5-climb.png`**
```
New image: Sprite sheet of HERO, 5 frames in one row. Very low camera angle looking up as he climbs toward the viewer, dusty after a struggle, shirt torn at the hem. He holds a bare black pole with NO flag in his right hand:
1. hand gripping a ledge below him, body low.
2. pulling himself up, one knee lifting.
3. one foot planted on a high point, pushing up.
4. rising to standing, pole swinging up.
5. standing tall, pole planted beside him, shoulders back.
Draw only the character and the pole, no rock.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

**1.7 → `hero/H6-stand.png`**
```
New image: Sprite sheet of HERO, 3 frames in one row. Very low camera angle looking up at him standing triumphantly, one foot forward on a higher point, right fist gripping a tall bare black pole with NO flag. His gamchha scarf and shirt flap in strong wind. A fierce small grin, dusty and torn as in the climbing sheet.
1. neutral, breathing out.
2. chest slightly raised, breathing in.
3. head turned a little toward the viewer as if saying "see?".
Draw only the character and the pole.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Feet on one shared baseline. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

---

## CHAT 2: Garment worker 👩‍🏭

**First message**
```
For everything in this chat, use this exact style:
Clean Japanese manga ink illustration, like a classic 1980s–90s seinen manga. Crisp black ink outlines with strong line-weight variation, halftone screentone dot shading, flat colour fills. Limited palette: ink black, off-white, one strong red (#C8102E), muted earthy clothing colours, warm brown South Asian skin tones. No gradients, no 3D, no photorealism. Light from the top-left. Flat pure white background (#FFFFFF) with no paper texture, no vignette and no border. No ground shadow, no text, no signature, no watermark.
The main character in this chat is WORKER: a young Bangladeshi garment worker woman in her 20s, warm brown skin, faded pink salwar kameez, a dupatta tied around her waist, hair in a tight bun, a factory ID card on a lanyard, tired but determined face.
Reply only with "Ready". Do not create an image yet.
```

**2.1 → `marchers/worker-0-reference.png`**
```
New image: Character reference sheet of WORKER. Show her four times side by side at the same size: front view, three-quarter view, side view facing right, back view. Neutral standing pose. Full body, nothing cropped. Wide 16:9 landscape image.
```
⭐ Regenerate until this is perfect.

**2.2 → `marchers/worker-1-walk.png`**
```
New image: Sprite sheet of WORKER marching with determination, head held up. Her right fist is raised at shoulder height in every frame; her left arm swings opposite to her legs.
8 frames, side view facing right, grid of 4 columns × 2 rows:
1. contact: right heel touches the ground in front, left leg straight behind on its toes.
2. down: weight on the right leg, knee bent, body at its lowest.
3. passing: right leg straight under the body, left leg bent and passing forward.
4. up: pushing off the right toes, body at its highest, left leg swinging forward.
5. contact: left heel touches the ground in front, right leg straight behind.
6. down: weight on the left leg, knee bent, body lowest.
7. passing: left leg straight under the body, right leg passing forward.
8. up: pushing off the left toes, body highest, right leg swinging forward.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Feet on one shared baseline in each row. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

---

## CHAT 3: Student 🎓

**First message**
```
For everything in this chat, use this exact style:
Clean Japanese manga ink illustration, like a classic 1980s–90s seinen manga. Crisp black ink outlines with strong line-weight variation, halftone screentone dot shading, flat colour fills. Limited palette: ink black, off-white, one strong red (#C8102E), muted earthy clothing colours, warm brown South Asian skin tones. No gradients, no 3D, no photorealism. Light from the top-left. Flat pure white background (#FFFFFF) with no paper texture, no vignette and no border. No ground shadow, no text, no signature, no watermark.
The main character in this chat is STUDENT: a Bangladeshi university student in his late teens, warm brown skin, round glasses, plain dark-green t-shirt, jeans, canvas sneakers, a heavy backpack.
Reply only with "Ready". Do not create an image yet.
```

**3.1 → `marchers/student-0-reference.png`**
```
New image: Character reference sheet of STUDENT. Show him four times side by side at the same size: front view, three-quarter view, side view facing right, back view. Neutral standing pose. Full body, nothing cropped. Wide 16:9 landscape image.
```
⭐ Regenerate until this is perfect.

**3.2 → `marchers/student-1-walk.png`**
```
New image: Sprite sheet of STUDENT marching with determination, head held up. He carries a bare bamboo pole with NO flag over his right shoulder in every frame; his left arm swings opposite to his legs.
8 frames, side view facing right, grid of 4 columns × 2 rows:
1. contact: right heel touches the ground in front, left leg straight behind on its toes.
2. down: weight on the right leg, knee bent, body at its lowest.
3. passing: right leg straight under the body, left leg bent and passing forward.
4. up: pushing off the right toes, body at its highest, left leg swinging forward.
5. contact: left heel touches the ground in front, right leg straight behind.
6. down: weight on the left leg, knee bent, body lowest.
7. passing: left leg straight under the body, right leg passing forward.
8. up: pushing off the left toes, body highest, right leg swinging forward.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Feet on one shared baseline in each row. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

---

## CHAT 4: Farmer 🌾

**First message**
```
For everything in this chat, use this exact style:
Clean Japanese manga ink illustration, like a classic 1980s–90s seinen manga. Crisp black ink outlines with strong line-weight variation, halftone screentone dot shading, flat colour fills. Limited palette: ink black, off-white, one strong red (#C8102E), muted earthy clothing colours, warm brown South Asian skin tones. No gradients, no 3D, no photorealism. Light from the top-left. Flat pure white background (#FFFFFF) with no paper texture, no vignette and no border. No ground shadow, no text, no signature, no watermark.
The main character in this chat is FARMER: an older Bangladeshi farmer in his 50s, dark brown weathered skin, grey beard, checked lungi folded up to the knees, white sleeveless vest, gamchha tied around his head, barefoot, strong hands.
Reply only with "Ready". Do not create an image yet.
```

**4.1 → `marchers/farmer-0-reference.png`**
```
New image: Character reference sheet of FARMER. Show him four times side by side at the same size: front view, three-quarter view, side view facing right, back view. Neutral standing pose. Full body, nothing cropped. Wide 16:9 landscape image.
```
⭐ Regenerate until this is perfect.

**4.2 → `marchers/farmer-1-walk.png`**
```
New image: Sprite sheet of FARMER marching with determination, head held up. He holds a bare bamboo pole with NO flag upright in his left hand in every frame; his right arm swings opposite to his legs.
8 frames, side view facing right, grid of 4 columns × 2 rows:
1. contact: right heel touches the ground in front, left leg straight behind on its toes.
2. down: weight on the right leg, knee bent, body at its lowest.
3. passing: right leg straight under the body, left leg bent and passing forward.
4. up: pushing off the right toes, body at its highest, left leg swinging forward.
5. contact: left heel touches the ground in front, right leg straight behind.
6. down: weight on the left leg, knee bent, body lowest.
7. passing: left leg straight under the body, right leg passing forward.
8. up: pushing off the left toes, body highest, right leg swinging forward.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Feet on one shared baseline in each row. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

---

## CHAT 5: Keffiyeh woman 🧣

**First message**
```
For everything in this chat, use this exact style:
Clean Japanese manga ink illustration, like a classic 1980s–90s seinen manga. Crisp black ink outlines with strong line-weight variation, halftone screentone dot shading, flat colour fills. Limited palette: ink black, off-white, one strong red (#C8102E), muted earthy clothing colours, warm brown South Asian skin tones. No gradients, no 3D, no photorealism. Light from the top-left. Flat pure white background (#FFFFFF) with no paper texture, no vignette and no border. No ground shadow, no text, no signature, no watermark.
The main character in this chat is KEFFIYEH: a young woman in her 20s, olive-brown skin, a black-and-white keffiyeh draped over her shoulders, short dark hair, worn denim jacket, black trousers, boots.
Reply only with "Ready". Do not create an image yet.
```

**5.1 → `marchers/keffiyeh-0-reference.png`**
```
New image: Character reference sheet of KEFFIYEH. Show her four times side by side at the same size: front view, three-quarter view, side view facing right, back view. Neutral standing pose. Full body, nothing cropped. Wide 16:9 landscape image.
```
⭐ Regenerate until this is perfect.

**5.2 → `marchers/keffiyeh-1-walk.png`**
```
New image: Sprite sheet of KEFFIYEH marching with determination, head held up. She raises her left fist high above her head in every frame; her right arm swings opposite to her legs.
8 frames, side view facing right, grid of 4 columns × 2 rows:
1. contact: right heel touches the ground in front, left leg straight behind on its toes.
2. down: weight on the right leg, knee bent, body at its lowest.
3. passing: right leg straight under the body, left leg bent and passing forward.
4. up: pushing off the right toes, body at its highest, left leg swinging forward.
5. contact: left heel touches the ground in front, right leg straight behind.
6. down: weight on the left leg, knee bent, body lowest.
7. passing: left leg straight under the body, right leg passing forward.
8. up: pushing off the left toes, body highest, right leg swinging forward.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Feet on one shared baseline in each row. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

---

## CHAT 6: Rickshaw puller 🛺

**First message**
```
For everything in this chat, use this exact style:
Clean Japanese manga ink illustration, like a classic 1980s–90s seinen manga. Crisp black ink outlines with strong line-weight variation, halftone screentone dot shading, flat colour fills. Limited palette: ink black, off-white, one strong red (#C8102E), muted earthy clothing colours, warm brown South Asian skin tones. No gradients, no 3D, no photorealism. Light from the top-left. Flat pure white background (#FFFFFF) with no paper texture, no vignette and no border. No ground shadow, no text, no signature, no watermark.
The main character in this chat is RICKSHAW: a thin, wiry Bangladeshi rickshaw puller in his 40s, dark brown skin, blue checked lungi, sleeveless grey vest, a small towel over one shoulder, bare feet, sinewy arms, proud upright posture.
Reply only with "Ready". Do not create an image yet.
```

**6.1 → `marchers/rickshaw-0-reference.png`**
```
New image: Character reference sheet of RICKSHAW. Show him four times side by side at the same size: front view, three-quarter view, side view facing right, back view. Neutral standing pose. Full body, nothing cropped. Wide 16:9 landscape image.
```
⭐ Regenerate until this is perfect.

**6.2 → `marchers/rickshaw-1-walk.png`**
```
New image: Sprite sheet of RICKSHAW marching with determination, head held up. Both arms swing opposite to the legs, chest proud.
8 frames, side view facing right, grid of 4 columns × 2 rows:
1. contact: right heel touches the ground in front, left leg straight behind on its toes.
2. down: weight on the right leg, knee bent, body at its lowest.
3. passing: right leg straight under the body, left leg bent and passing forward.
4. up: pushing off the right toes, body at its highest, left leg swinging forward.
5. contact: left heel touches the ground in front, right leg straight behind.
6. down: weight on the left leg, knee bent, body lowest.
7. passing: left leg straight under the body, right leg passing forward.
8. up: pushing off the left toes, body highest, right leg swinging forward.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Feet on one shared baseline in each row. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

---

## CHAT 7: Masked protester 😷

**First message**
```
For everything in this chat, use this exact style:
Clean Japanese manga ink illustration, like a classic 1980s–90s seinen manga. Crisp black ink outlines with strong line-weight variation, halftone screentone dot shading, flat colour fills. Limited palette: ink black, off-white, one strong red (#C8102E), muted earthy clothing colours, warm brown South Asian skin tones. No gradients, no 3D, no photorealism. Light from the top-left. Flat pure white background (#FFFFFF) with no paper texture, no vignette and no border. No ground shadow, no text, no signature, no watermark.
The main character in this chat is MASKED: a young protester whose face is wrapped in a rust-red cotton scarf showing only fierce eyes, dark olive field jacket, black cargo trousers, worn boots, fingerless gloves.
Reply only with "Ready". Do not create an image yet.
```

**7.1 → `masked/P0-reference.png`**
```
New image: Character reference sheet of MASKED. Show them four times side by side at the same size: front view, three-quarter view, side view facing right, back view. Neutral standing pose. Full body, nothing cropped. Wide 16:9 landscape image.
```

**7.2 → `masked/P1-walk-toward.png`**
```
New image: Sprite sheet of MASKED, 6 frames in a grid of 3 columns × 2 rows, FRONT view, walking straight toward the viewer with a slow, steady, menacing walk, staring directly at the viewer:
1. left foot forward, right arm forward.
2. weight on the left foot, body lowest.
3. right foot passing, body highest.
4. right foot forward, left arm forward.
5. weight on the right foot, body lowest.
6. left foot passing, body highest.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size and outfit in every frame. Feet on one shared baseline in each row. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

**7.3 → `masked/P2-stop.png`**
```
New image: Sprite sheet of MASKED, 2 frames in one row, FRONT view:
1. stopped, standing square, arms by the sides, fists clenched, staring at the viewer.
2. the same, but right fist raised to the chest, eyes narrowed.
Sprite sheet layout: equal-sized cells, large white gaps, frames never touch. Same character, same size. Feet on one shared baseline. Full body, nothing cropped. No grid lines, no numbers, no text. Wide 3:2 landscape image.
```

---

## CHAT 8: Hands, rock, crowd and shields ✊

**First message**
```
For everything in this chat, use this exact style:
Clean Japanese manga ink illustration, like a classic 1980s–90s seinen manga. Crisp black ink outlines with strong line-weight variation, halftone screentone dot shading, flat colour fills. Limited palette: ink black, off-white, one strong red (#C8102E), muted earthy colours, warm brown South Asian skin tones. No gradients, no 3D, no photorealism. Light from the top-left. Flat pure white background (#FFFFFF) with no paper texture, no vignette and no border. No ground shadow, no text, no signature, no watermark.
Reply only with "Ready". Do not create an image yet.
```

**8.1 → `hands/K1-grips.png`**
```
New image: Sheet of 5 separate hands, same scale, spaced well apart:
1. a young man's brown hand gripping a short piece of vertical bare black pole.
2. a woman's brown hand with a glass bangle gripping a short piece of vertical bare black pole.
3. an old farmer's rough dark hand gripping a short piece of vertical bare black pole.
4. a hand reaching in from the right side to grab a short piece of vertical pole, fingers just closing.
5. a clenched raised fist, wrist wrapped in a red cloth band.
No grid lines, no numbers, no text. Wide 16:9 landscape image.
```

**8.2 → `scene5/R1-rock.png`**
```
New image: A jagged black rock peak seen from a very low angle, drawn in solid black ink with rough white scratch highlights along its edges, like a dramatic manga panel. Its flat top sits in the upper middle of the image. Only the rock. Tall 9:16 portrait image.
```

**8.3 → `crowd/G1-silhouettes.png`**
```
New image: Sheet of 12 separate solid dark-charcoal silhouettes of protesters, all at the same scale, spaced well apart, no interior detail: walking, standing, raised fist, holding a bare pole, a parent carrying a child on their shoulders, an old man with a walking stick, two friends arm in arm, a woman in a headscarf, a student with a backpack, a person shouting with hands cupped, a person on crutches, a teenager running. Grid of 6 columns × 2 rows. No grid lines, no text. Wide 16:9 landscape image.
```

**8.4 → `crowd/G2-shields.png`**
```
New image: A wide row of 6 faceless security officers in riot gear seen from the front, standing shoulder to shoulder behind tall clear shields, helmets with dark visors, drawn as dark charcoal shapes with only minimal grey highlights on the shields and visors. Cold and intimidating. Wide 16:9 landscape image.
```

---

## CHAT 9: Chapter 1 street 🏙
*Attach `assets/tests/T2-street.png` (T2, your street test) to the first message so Gemini matches its style.*

**First message**
```
For everything in this chat, use this exact style (same as the attached image):
Painterly illustration with confident ink outlines, mixing a vintage revolutionary poster with modern comic art. Visible brush strokes, risograph halftone dot texture, slight red/cyan colour misregistration. Palette: desaturated teal-grey, warm ochre, faded brick, dusty pink, off-white, with red (#C8102E) as the only strong accent. Dramatic low camera angles looking up. The image goes edge to edge with NO border or frame. No text, no letters, no fake writing on posters or signs, no logos, no signatures, no watermarks.
Reply only with "Ready". Do not create an image yet.
```

**9.1 → `scene1/S1-sky.png`**
```
New image: Full-frame painted sky only: overcast, heavy grey-teal clouds, a faint warm glow behind them. Nothing else. Wide 16:9 landscape image.
```
**9.2 → `scene1/S1-sky-phone.png`** 📱
```
New image: The same sky, recomposed for a phone screen. Tall 9:16 portrait image.
```
**9.3 → `scene1/S2-skyline.png`**
```
New image: A distant city skyline as one long horizontal strip across the middle of the image: crowded towers, water tanks, a mosque dome, antennas, hazy and desaturated grey-teal. Everything that is not building is flat pure green (#00FF00). Wide 16:9 landscape image.
```
**9.4 → `scene1/S3-buildings.png`**
```
New image: Mid-distance tall Dhaka apartment blocks seen from a very low angle, leaning inward toward the top, with balconies, laundry lines with a few red cloths hanging, and tangled electric wires. Muted, oppressive, grey-ochre. The sky area must be flat pure green (#00FF00). Wide 16:9 landscape image.
```
**9.5 → `scene1/S4-wall.png`**
```
New image: A close old concrete wall filling the left half of the image, covered in layers of peeling wordless posters and abstract graffiti shapes, stained and weathered. Everything else is flat pure green (#00FF00). Tall 9:16 portrait image.
```
**9.6 → `scene1/S5-railing.png`**
```
New image: Foreground objects only: an old rusted iron railing running across the bottom of the image, a tall curved street lamp post on the right, and one torn red cloth snagged on the railing. Everything else is flat pure green (#00FF00). Wide 16:9 landscape image.
```
**9.7 → `scene1/S6-staircase.png`**
```
New image: A gigantic grey stone staircase rising steeply into the sky, seen from the bottom looking up, so huge it feels impossible to climb, its top lost in hazy light. Cold and monumental. No people. Everything around it is flat pure green (#00FF00). Tall 9:16 portrait image.
```

---

## CHAT 10: Chapter 3 march road 🛣

**First message**: attach `assets/tests/T2-street.png` (T2, your street test)
```
For everything in this chat, use this exact style (same as the attached image):
Painterly illustration with confident ink outlines, mixing a vintage revolutionary poster with modern comic art. Visible brush strokes, risograph halftone dot texture, slight red/cyan colour misregistration. Palette: desaturated teal-grey, warm ochre, faded brick, dusty pink, off-white, with red (#C8102E) as the only strong accent. Dramatic low camera angles looking up. The image goes edge to edge with NO border or frame. No text, no letters, no fake writing on posters or signs, no logos, no signatures, no watermarks.
Reply only with "Ready". Do not create an image yet.
```

**10.1 → `scene3/S7-road-a.png`**
```
New image: A wide road seen from the side at pavement level, stretching across the whole image: cracked asphalt along the bottom quarter, a low row of shuttered shops and trees behind, late-afternoon light turning everything faintly red. No people, no vehicles. Wide 16:9 landscape image.
```
**10.2 → `scene3/S8-road-b.png`** *(attach the road image you just made in 10.1, `scene3/S7-road-a.png`)*
```
Using the attached image: create the next part of the same panorama, continuing the scene seamlessly to the right. Same road, same horizon height, same light, same style. Its left edge must match the right edge of the attached image. Wide 16:9 landscape image.
```
**10.3 → `scene3/S9-far-hills.png`**
```
New image: A long distant horizon strip across the lower middle: hazy rooftops and faraway hills under a sky glowing red-orange. Soft and atmospheric. Everything above the strip is flat pure green (#00FF00). Wide 16:9 landscape image.
```

---

## CHAT 11: Chapter 4 barricade 🔥

**First message**: attach `assets/tests/T2-street.png` (T2, your street test)
```
For everything in this chat, use this exact style (same as the attached image):
Painterly illustration with confident ink outlines, mixing a vintage revolutionary poster with modern comic art. Visible brush strokes, risograph halftone dot texture, slight red/cyan colour misregistration. Palette: desaturated teal-grey, warm ochre, faded brick, dusty pink, off-white, with red (#C8102E) as the only strong accent. Dramatic low camera angles looking up. The image goes edge to edge with NO border or frame. No text, no letters, no fake writing on posters or signs, no logos, no signatures, no watermarks.
Reply only with "Ready". Do not create an image yet.
```

**11.1 → `scene4/S10-night.png`**
```
New image: A wide night street after a clash, from a low angle: wet asphalt reflecting a red glow, a smoky dark-teal sky, shuttered shops, a broken street lamp. The centre of the road is empty. No fire, no people. Wide 16:9 landscape image.
```
**11.2 → `scene4/S10-night-phone.png`** 📱
```
New image: The same night street, recomposed for a phone screen. Tall 9:16 portrait image.
```
**11.3 → `scene4/S11-debris.png`**
```
New image: A street barricade pile: an overturned burnt-out car frame, a stack of old tyres, broken wooden pallets and bricks, charred black but with NO flames and NO smoke. Only the pile. Everything else is flat pure green (#00FF00). Wide 16:9 landscape image.
```

---

## CHAT 12: Chapter 6 sky and plants 🌤

**First message**: attach `assets/tests/T2-street.png` (T2, your street test)
```
For everything in this chat, use this exact style (same as the attached image):
Painterly illustration with confident ink outlines, mixing a vintage revolutionary poster with modern comic art. Visible brush strokes, risograph halftone dot texture, slight red/cyan colour misregistration. Palette: desaturated teal-grey, warm ochre, faded brick, dusty pink, off-white, with red (#C8102E) as the only strong accent. Dramatic low camera angles looking up. The image goes edge to edge with NO border or frame. No text, no letters, no fake writing on posters or signs, no logos, no signatures, no watermarks.
Reply only with "Ready". Do not create an image yet.
```

**12.1 → `scene6/S12-sky.png`**
```
New image: Full-frame bright heroic sky: big towering white cumulus clouds in a soft blue-teal sky with halftone texture, uplifting morning light. Nothing else. Wide 16:9 landscape image.
```
**12.2 → `scene6/S12-sky-phone.png`** 📱
```
New image: The same sky, recomposed for a phone screen. Tall 9:16 portrait image.
```
**12.3 → `scene6/S13-clouds.png`**
```
New image: Six separate fluffy white cumulus clouds of different sizes, spaced well apart. Background flat pure green (#00FF00). Wide 16:9 landscape image.
```
**12.4 → `scene6/S14-foliage-a.png`**
```
New image: A horizontal band of lush tropical foreground plants along the bottom of the image: broad banana leaves, ferns, small white and yellow wildflowers, bright greens. Only the plants. Everything else is flat pure magenta (#FF00FF). Wide 16:9 landscape image.
```
**12.5 → `scene6/S15-foliage-b.png`**
```
New image: A different variation of the same plant band: different leaf shapes and flower positions, same height and style. Everything else is flat pure magenta (#FF00FF). Wide 16:9 landscape image.
```

---

## CHAT 13: Chapter 6 comrades portrait 👥
*Seven prompts, one per character. Attach that character's **reference sheet** (from Chats 1–7) with each prompt.*

**First message**: attach `assets/tests/T2-street.png` (T2, your street test)
```
For everything in this chat, use this exact style (same as the attached image):
Painterly illustration with confident ink outlines, mixing a vintage revolutionary poster with modern comic art. Visible brush strokes, risograph halftone dot texture, slight red/cyan colour misregistration. Palette: desaturated teal-grey, warm ochre, faded brick, dusty pink, off-white, with red (#C8102E) as the only strong accent. Dramatic low camera angles looking up. The image goes edge to edge with NO border or frame. No text, no letters, no fake writing on posters or signs, no logos, no signatures, no watermarks.
Reply only with "Ready". Do not create an image yet.
```

**13.1 → `comrades/C1-hero.png`**: attach the Hero reference sheet (`hero/H0-reference.png`)
```
Using the attached character sheet: New image of this exact character repainted in this chat's painted style, as part of a heroic group portrait. Low camera angle, standing on a ridge, three-quarter view, proud and calm. Two versions side by side at the same size:
1. standing proudly, looking into the distance.
2. turning his head toward the viewer with a small smile.
Any pole is bare with NO flag. Full body, nothing cropped. Background flat pure green (#00FF00). Wide 16:9 landscape image.
```

**13.2 → `comrades/C2-worker.png`**: attach the Garment worker reference sheet
```
Using the attached character sheet: New image of this exact character repainted in this chat's painted style, as part of a heroic group portrait. Low camera angle, standing on a ridge, three-quarter view, proud and calm. Two versions side by side at the same size:
1. standing proudly, looking into the distance.
2. raising her right fist.
Any pole is bare with NO flag. Full body, nothing cropped. Background flat pure green (#00FF00). Wide 16:9 landscape image.
```

**13.3 → `comrades/C3-student.png`**: attach the Student reference sheet
```
Using the attached character sheet: New image of this exact character repainted in this chat's painted style, as part of a heroic group portrait. Low camera angle, standing on a ridge, three-quarter view, proud and calm. Two versions side by side at the same size:
1. standing proudly, looking into the distance.
2. pointing ahead into the distance.
Any pole is bare with NO flag. Full body, nothing cropped. Background flat pure green (#00FF00). Wide 16:9 landscape image.
```

**13.4 → `comrades/C4-farmer.png`**: attach the Farmer reference sheet
```
Using the attached character sheet: New image of this exact character repainted in this chat's painted style, as part of a heroic group portrait. Low camera angle, standing on a ridge, three-quarter view, proud and calm. Two versions side by side at the same size:
1. standing proudly, looking into the distance.
2. resting one hand on his bare pole and nodding.
Any pole is bare with NO flag. Full body, nothing cropped. Background flat pure green (#00FF00). Wide 16:9 landscape image.
```

**13.5 → `comrades/C5-keffiyeh.png`**: attach the Keffiyeh woman reference sheet
```
Using the attached character sheet: New image of this exact character repainted in this chat's painted style, as part of a heroic group portrait. Low camera angle, standing on a ridge, three-quarter view, proud and calm. Two versions side by side at the same size:
1. standing proudly, looking into the distance.
2. shading her eyes with her hand, looking far ahead.
Any pole is bare with NO flag. Full body, nothing cropped. Background flat pure green (#00FF00). Wide 16:9 landscape image.
```

**13.6 → `comrades/C6-rickshaw.png`**: attach the Rickshaw puller reference sheet
```
Using the attached character sheet: New image of this exact character repainted in this chat's painted style, as part of a heroic group portrait. Low camera angle, standing on a ridge, three-quarter view, proud and calm. Two versions side by side at the same size:
1. standing proudly, looking into the distance.
2. arms crossed, laughing.
Any pole is bare with NO flag. Full body, nothing cropped. Background flat pure green (#00FF00). Wide 16:9 landscape image.
```

**13.7 → `comrades/C7-masked.png`**: attach the Masked protester reference sheet
```
Using the attached character sheet: New image of this exact character repainted in this chat's painted style, as part of a heroic group portrait. Low camera angle, standing on a ridge, three-quarter view, proud and calm. Two versions side by side at the same size:
1. standing proudly, looking into the distance.
2. pulling the scarf down to reveal a calm face.
Any pole is bare with NO flag. Full body, nothing cropped. Background flat pure green (#00FF00). Wide 16:9 landscape image.
```

---

## CHAT 14: Chapter 7 ending 🌅

**First message**
```
For everything in this chat, use this exact style:
Loose, delicate fine-ink line drawing with soft transparent watercolour washes on warm cream paper, like a page from an artist's sketchbook. Gentle, warm and hopeful. Palette: muted burgundy, ochre, sage green, soft dawn pink, warm grey. A few pencil construction lines left in. Edge to edge, no border. No text, no signatures, no watermarks.
Reply only with "Ready". Do not create an image yet.
```

**14.1 → `scene7/E1-dawn.png`**
```
New image: A wide gentle dawn landscape: soft pink-gold sky, open green rice fields, a distant river and a few palm trees, very calm and hopeful. The lower middle is empty and open. Wide 16:9 landscape image.
```
**14.2 → `scene7/E1-dawn-phone.png`** 📱
```
New image: The same dawn landscape, recomposed for a phone screen. Tall 9:16 portrait image.
```
**14.3 → `scene7/E2-table-empty.png`**
```
New image: One very long simple wooden table seen almost straight-on from the front at eye level, stretching nearly the full width of the image, with long benches on both sides. On it: plates of rice, bread, bowls of daal, clay cups and a water jug. No people, no tablecloth. Flat pure white background around it. Wide 16:9 landscape image.
```
**14.4 → `scene7/E3-table-full.png`** *(attach the empty table from 14.3, `scene7/E2-table-empty.png`, plus the 7 character reference sheets from Chats 1–7)*
```
Using the attached images: the same long table with the same framing, now with all seven attached characters sitting together along it, all at the same height, sharing food, laughing and talking. Keep each character recognisable but drawn in this chat's sketchbook style. Flat pure white background. Wide 16:9 landscape image.
```

---

## CHAT 15: Textures 📄

**First message:** none. Send the prompts directly.

**15.1 → `textures/X1-paper.png`**
```
New image: A flat scan of warm off-white cotton paper, very subtle fibres and grain, evenly lit, no shadows, no objects, no vignette, no border. Square 1:1 image.
```
**15.2 → `textures/X2-brush-black.png`**
```
New image: Sheet of 8 separate dry-brush ink strokes in solid black on flat pure white: long horizontal swipes, a circular swirl, a thick splatter, a short stab, a ragged diagonal, a fading drag. Rough bristle texture, frayed ends, spaced well apart. Wide 16:9 landscape image.
```
**15.3 → `textures/X3-brush-red.png`**
```
New image: The same kind of sheet with 8 new dry-brush strokes, in solid red (#C8102E) on flat pure white. Wide 16:9 landscape image.
```
**15.4 → `textures/X4-torn-edges.png`**
```
New image: Sheet of 4 separate long horizontal strips of torn paper edge, solid black shapes on flat pure white, with ragged fibrous torn edges, spaced well apart. Wide 16:9 landscape image.
```

---

## Music and sound (outside Gemini) 🎵

### Option A (best): record the public-domain melodies
Ask a friend to play these on harmonium, flute, violin or brass. A good phone recording in a quiet room is fine. Play **A2 and A3 to a metronome at 100 BPM**.

| File | Melody | How to play it | Length |
|---|---|---|---|
| `music/A1-whistle.wav` | The Internationale (opening phrase) | whistled alone, a bit distant | 20 s |
| `music/A2-march.wav` | Warszawianka | strong brass or harmonium, 100 BPM | 32 bars |
| `music/A3-climax.wav` | The Internationale (chorus) | as big as possible: several instruments or voices, 100 BPM | 16 bars |
| `music/A4-ending.wav` | The Internationale (chorus) or a bhatiali folk tune | solo harmonium or bansuri, slow and tender | 40 s |

### Option B: an AI music tool (for example Suno)
- These tools make **original** music; they won't reproduce The Internationale.
- **Check the plan's licence:** free plans are usually non-commercial only.
- **Keep one melody:** make B1 first, then use the tool's *cover* or *remix* option on that same song for B2–B4.
```
B1: Instrumental revolutionary anthem, solemn then rising, brass and choir humming, snare drum march, 100 BPM, minor key turning major at the end, cinematic, no lyrics.
B2: Same melody, a lone whistle with soft street ambience, very sparse, no drums.
B3: Same melody as a driving folk protest march: dhol, snare, brass, crowd clapping, 100 BPM.
B4: Same melody, slow and tender, solo harmonium and bamboo flute, warm, hopeful, no drums.
```

### Sound effects
Search **freesound.org** with the **CC0** licence filter.

| File | What to search for |
|---|---|
| `sfx/F1-city.wav` | South Asian street ambience, traffic and voices, 20 s loop |
| `sfx/F2-wind.wav` | strong wind gusts, 20 s loop |
| `sfx/F3-fire.wav` | crackling fire, 20 s loop |
| `sfx/F4-tear.wav` | heavy cloth tearing, single rip |
| `sfx/F5-flap.wav` | flag snapping in wind |
| `sfx/F6-thread.wav` | thread pulled quickly through fabric |
| `sfx/F7-impact.wav` | huge cinematic impact boom |
| `sfx/F8-step.wav` | single footstep on concrete |
| `sfx/F9-crowd.wav` | big crowd chanting and cheering, no clear words, 10 s |
| `sfx/F10-shields.wav` | riot shields banging in rhythm |

---

## Checklist

**Phase 1** (send these first)
- [ ] Chat 1: Hero (7 images)
- [ ] Chat 2: Garment worker (2)
- [ ] Chat 8: Hands, rock, crowd, shields (4)
- [ ] Chat 10: March road (3)
- [ ] Chat 15: Textures (4)
- [ ] Sound: F4 tear · F6 thread · F7 impact

**Phase 2**
- [ ] Chats 3–6: the other marchers (8 images)
- [ ] Chat 7: Masked protester (3)
- [ ] Chat 9: Street (7)
- [ ] Chat 11: Barricade (3)
- [ ] Sound: the rest

**Phase 3**
- [ ] Chat 12: Sky and plants (5)
- [ ] Chat 13: Comrades (7)
- [ ] Chat 14: Ending (4)
- [ ] Music: A1–A4 or B1–B4
