# Transparent school logos

The cards use `logo-tk-amanah-transparent.png`, `logo-sd-amanah-transparent.png`, `logo-smp-amanah-transparent.png`, and `logo-smk-amanah-transparent.png`.

TK uses the existing transparent original `logo-amanah.png`, preserving its original pixels. SD, SMP, and SMK use the built-in ImageGen tool's background-extraction edits of the user-supplied JPEGs. Original JPEGs remain available alongside the PNGs. The additional HTML headings above TK and SMP have been removed.

Prompt template used separately for TK, SD, SMP, and SMK (the generated TK variant was not selected):

> Use case: background-extraction. Edit target: supplied {LEVEL} Amanah school logo. Remove ONLY the solid black exterior background surrounding the existing logo and (where present) the detached white nameplate above it, producing genuine alpha transparency. Preserve the full crest, gold ribbon, all existing black outlines and black lettering INSIDE the logo, the green/teal/gray crest color, and any existing white top nameplate and its exact letters unchanged. Do not add a nameplate, do not add new text, do not redesign or redraw the emblem. The TK and SMP originals have no top nameplate: keep it that way. Tight framing with small transparent padding around the entire visible artwork, no checkerboard pattern, no shadows. Save the transparent PNG asset locally and return its filesystem path.
