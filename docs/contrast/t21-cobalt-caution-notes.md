# T21: Cobalt Mono caution hue scan (step 1)

Status colours share one lightness per mode (`actionColors.baseLightness` 52; light fg L37, dark fg L72 via
`darkFgLightnessOffset` -20) and one chroma (0.12). Only `caution.hue` is per-status.

Worst-case contrast is over canvas, section, card, component, elevated and interactive. The track is border-default.

| caution hue | light fg (delivered OKLCH) | light worst / track | dark fg | dark worst / track |
|---|---|---|---|---|
| 45 (now) | #702300 (L37 C.116 H40) | 9.72 / 7.56 | #e28b63 | 4.88 / 3.48 |
| 65 | #682d00 (H50) | 9.55 / 7.43 | #d8944d | 4.97 / 3.54 |
| 70 | #662f00 (H53) | 9.51 / 7.40 | #d59649 | 4.99 / 3.55 |
| 75 | #633200 (H58) | 9.44 / 7.34 | #d09945 | 5.01 / 3.57 |
| 80 | #603500 (H62) | 9.43 / 7.34 | #cd9b43 | 5.03 / 3.59 |
| 85 | #5c3700 (H69) | 9.37 / 7.29 | #c79e41 | 5.05 / 3.60 |

- **Dark:** every hue from 65 to 85 passes. At H75, #d09945 reads as amber.
- **Light:** at L37, amber (H70-80, C0.12) falls outside sRGB. `oklchToHex` clips it per channel, which drags the
  hue back toward 55-60 and gives dark brown (#633200). Contrast isn't the limit (9.4:1). The shared L37 is. That is
  the brief's stop condition: amber that doesn't turn brown needs a light-only caution lightness, which is a
  generator change.
- **If light caution could have its own lightness at H75 C0.12:** L48 #845100 gives 5.94 / 4.62. L50 #8a5700 gives
  5.45 / 4.24. L52 #905d00 gives 5.00 / 3.89. Above about L53 it drops under 4.5 on #ffffff. So in light mode the
  honest amber is an ochre at L48-50. A traffic-light amber (#b8860b-ish, L~64) fails at about 3.3:1.

Swatch: `t21-cobalt-caution-candidates.png` (captured on the PC from the .html next to it).
