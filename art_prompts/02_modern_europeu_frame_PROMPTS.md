# 02 Modern European (fleet dash) - empty frame, new method

Status: prompt written 2026-10-06, to be run in Gemini. Not generated yet.
Method: the art is only the FRAME. The app draws key caps, icons, names and LEDs.
Generator: Gemini (fill model/version used here): 
Date generated: 
Account: 

## Step 1 - landscape (send this first)

Create a single flat, perfectly front-on (orthographic, zero perspective, no camera angle) image of an empty truck-cab switch panel, LANDSCAPE, aspect ratio 3:2, highest resolution you can output. The image is a texture asset for an app, so the panel must fill the whole image edge to edge, with no room, no desk, no background, no hands, no shadows cast outside the panel.

Style: modern European long-haul fleet truck dashboard. Matte black soft-touch plastic body, thin brushed-aluminium frame lines separating groups, subtle moulded texture, clean, sober, realistic, evenly lit from the front with soft light, no reflections of the environment.

IMPORTANT - this is a BLANK frame:
- NO text, NO letters, NO numbers, NO icons, NO symbols, NO logos, NO brand names anywhere.
- NO lit LEDs or glowing parts. Everything is dark and off.
- Switches and buttons are NOT drawn. Instead there are EMPTY RECESSED SLOTS where keys will be added later: each slot is a clean dark rounded rectangle, slightly recessed, with a thin moulded bezel, empty inside (flat dark matte, no key cap, no pictogram).
- All slots are the SAME size (square-ish, about 1:1.1), perfectly aligned on a strict grid, with equal gaps. Rows must be exactly horizontal and columns exactly vertical.

Layout, top to bottom (all rows span the full width):
1. Instrument row: on the left three small square dark glass windows side by side (blank, off); in the middle one wide dark glass display window (blank, off); on the right one wide dark glass window (blank, off). Windows have a thin metal bezel.
2. Key row A: 9 empty slots in one row.
3. Key row B: 8 empty slots in one row, framed in three groups (2 + 3 + 3) by thin aluminium frame lines.
4. Key rows C and D: two rows of 9 empty slots each, directly under each other, split into a left block of 4 columns and a right block of 5 columns by a thin vertical aluminium divider.
No other controls, no knobs, no gauges, no radio.

## Step 2 - portrait (send after step 1, with the landscape image attached as style reference)

Using the attached image as the exact style, materials, colours and slot design reference, create the PORTRAIT version of the same panel: aspect ratio 9:19.5 (tall, phone shape), highest resolution possible, flat front-on view, panel fills the whole image edge to edge. Same rules: blank frame, no text, no icons, no logos, no lit parts, empty recessed slots all the same size on a strict grid with equal gaps.

Layout, top to bottom:
1. Three small square dark glass windows side by side (blank, off).
2. One wide dark glass display window (blank, off), about 3 slot-rows tall.
3. One wide dark glass window, about 1.5 slot-rows tall (blank, off).
4. Key area: 9 rows of 4 empty slots each (36 slots), grouped in three blocks of 3 rows each, separated by thin brushed-aluminium frame lines.

## After generating
- Check: no text or icons survived, no lit LEDs, slots equal and aligned. If Gemini adds text or icons, reply: "Remove ALL text, icons and glowing parts. Keep only empty recessed slots."
- Save the files as 02_modern_eu_frame_L.png and 02_modern_eu_frame_P.png in TruckDeck\art\new\
- Fill the date, model and any retouches above.

## Result log
- 2026-10-06: Gemini generated only the LANDSCAPE (2528x1696). Accepted. 44 slots (rows of 11, 9, 12, 12), slots 1:1.8; 5 glass windows. More slots than the 35 functions needed: spares get blank caps.
- Portrait: generate with the separate file 02_modern_europeu_frame_P_PROMPT.md.
