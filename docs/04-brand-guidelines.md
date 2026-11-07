# Zubli — Brand Guidelines

**Personality:** premium, playful, vibrant, modern. Confident and friendly, never childish.

## Logo
`public/brand/zubli-icon.png` — the approved "Colorful Zubli Gradient App Icon": white
lowercase "zubli" wordmark on a violet gradient squircle with coral (top-left), turquoise
(bottom-left) and yellow (bottom-right) waves. Source has a white margin (not transparent).
Never recolor, stretch, rotate or add effects. Clear space ≥ 0.25× icon width. Min size 24px.
For in-app headers prefer a cropped/transparent export; keep the original untouched.

## Palette
| Token | Hex | Use |
|---|---|---|
| violet | #7864FF | Primary brand, CTAs, focus |
| coral | #FF647F | Likes, highlights, soft-destructive |
| turquoise | #34D9C5 | Destination mode, success |
| yellow | #FFBA54 | Interest mode, ratings, delight |
| navy | #18233F | Text, dark surfaces |

Neutrals derive from navy (opacity steps); light background `#FFFFFF` / tint `#F7F6FF`.
Dark mode: surface `#0F1730`, text `#F2F3FA`, brand colors unchanged.
**Mode coding:** Destination = turquoise, Interest = yellow, brand chrome = violet.

## Accessibility
Navy on white is high contrast. White on #7864FF is roughly 4.4:1 — fine for large/bold
button text, borderline for small text; verify and darken the button shade (≈ #6450F0) if
needed. Turquoise and yellow are never text on white. Focus ring 2px violet with offset.
Touch targets ≥ 44px.

## Typography
Headings: rounded geometric sans (e.g. Plus Jakarta Sans or Sora) via `next/font`, 700–800,
echoing the rounded wordmark. Body: Inter 400/500. Scale 12/14/16/18/24/32/44.

## Shape & motion
Radius 16px cards, pill buttons, 24px sheets. Soft navy-tinted shadows. Photos lead every
card. Motion 150–250ms ease-out, springy on like/save; honor `prefers-reduced-motion`.

## Voice
Short, warm, active. "Found something good?" not "Submit a post."

## Tailwind v4 tokens (`@theme` in globals.css)
`--color-violet-500:#7864FF; --color-coral-500:#FF647F; --color-turquoise-500:#34D9C5;
--color-yellow-500:#FFBA54; --color-navy-900:#18233F;`
