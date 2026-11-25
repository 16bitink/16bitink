# InkRoad art: how it is made

Painted with the ElevenLabs image models (no PixelLab). Flow `pxhCJTx7cUrBkOKUGktJ`; the style node is `wwlsarYhIkQePfSgqTV7` (docs/inkroad/style-reference.png).

1. `creative_edit_image`, model `gpt-image-2.5-sunburst`, `generations_count: 1`, `connect_from: ["wwlsarYhIkQePfSgqTV7"]`. Start the prompt with "Using exactly the art style, palette, light and camera angle of this picture (orthographic, looking north, tilted about 60 degrees so flat roofs are seen almost square and the south front wall is seen as a shorter strip, no perspective, no rotation, side walls not visible), make a game sprite sheet on a plain transparent background with no shadow on the background." Then a grid of separate items with wide gaps, every item described. End with "Original fictional architecture. No text, no people, no flags, no religious buildings." Vehicles and ground pieces say "seen from directly above".
2. The result is usually RGBA with a real alpha (composite on sand before judging; never drop the alpha). If it comes back opaque magenta, key it out and despill.
3. Save the raw sheet in `raw/`, cut it by connected alpha regions with a script in this folder, trim, resize to the 2x size, save `src/art/img/<set>/<key>.webp` (quality 88, alpha).

Worked examples in `raw/`: vehicles.png, gulf-homes-1-2.png (4 villas, 4 apartments), gulf-textures.png (sand, asphalt, paving, deck / grass, shallow, deep, bus lane).
A plot's front wall bottom edge is the footprint's south edge. Never call a generation twice to retry a pending one; poll `creative_get_flow_run_status`.
