# BMW X5 xDrive40i — Private Garage

An interactive, single-page "garage" for my 2026 BMW X5 xDrive40i (Jet Black, Cognac leather): a rotatable 3D model plus spec explainers and upgrade planning.

Live artifact: https://claude.ai/artifact/1wDygTR3GY9bFqhSabUSDU

## What's inside

**Explore**
- **Garage**: 3D model (three.js) you can rotate and zoom. Open the hood, the upper and lower split tailgates, all four doors and the sky-roof sunshade. Switch lights (DRL / low / high), spin the wheels, and pick camera presets (front, side, rear, top, driver's seat) and Studio / Golden-hour / Night scenes. The scene follows the local time of day.
- **Engine**: B58 3.0 L inline-six with 48 V mild hybrid. The 3D engine shakes at idle, there's a synthesized engine and turbo sound, a rev button, and a power/torque curve.
- **Lighting**: adaptive full-LED headlights vs optional matrix / Selective Beam.
- **Cargo**: to-scale top view; fold the 40/20/40 rear seat and watch the volume change (33.9 → 72.3 ft³).
- **Spec sheet**: searchable, with a source for each figure.

**Workshop**
- **Tires**: guide to the 275/40 R21 and 315/35 R21 tire codes, a temperature check for summer tires, a speed-rating chart, and tire options.
- **Snow chains**: Caltrans R1/R2/R3 simulator and chains that fit 315/35R21.
- **Straps**: cam straps vs bungees.
- **Snowboards**: to-scale pass-through / fold planner and a gear list.
- **Build sheet**: totals the items you add and shows a snow-trip readiness score.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The page (UI, data, interactions) |
| `viewer.js` | three.js viewer: model setup, materials, opening parts, lights, camera |
| `x5model.js` | The 3D model as base64-encoded GLB (meshopt-compressed) |

## Run locally

The page uses ES modules, so serve it over HTTP rather than opening the file directly:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

three.js r170 loads from the jsDelivr CDN.

## Credits

3D model: "2024 BMW X5 xDrive40i" by [ddiaz-design](https://sketchfab.com/3d-models/b453ba441ff04f9290955d09c3d46b9f) on Sketchfab, licensed **CC BY-NC-SA 4.0**. It has been compressed and restyled (Jet Black paint, Cognac leather, black steering wheel, M fender badges removed, split tailgate added). Under the license, this repository is for personal, non-commercial use, and any derivative must be shared under the same license.

BMW and X5 are trademarks of BMW AG. This is a personal, unofficial project.
