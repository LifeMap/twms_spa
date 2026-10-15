# TWMS Momentum — HTML motion

19.5 seconds, 160 BPM (52 beats), 1600 × 900 responsive stage. Native HTML/CSS,
SVG, Canvas and Web Audio. No Higgsfield, generated media, or external player.
Sound is an original synthesized electronic beat, off until the user enables it.
The expanded mix layers four-on-the-floor kicks, sub bass, noise claps and hats,
detuned chord stabs, an arpeggiated lead, stereo echo and scene-change impacts.
A compressor controls overlapping peaks; sound fades in when enabled.
Visual accents include 170 orbiting particles/comet trails, neon arcs, radial
cut bursts, a sweeping lower ribbon and beat-driven illustration zoom/rotation.
Headlines remain steady and there are no full-screen strobe flashes.
The original motion palette is the reference for service card backgrounds:
Autogram lime `#d1ff43`, Tripplan electric blue `#194df2`, Jarvis forest `#0b281b`,
Orch AI pink `#f890ce`, and TWMS Studio yellow `#ffe45f`. The Tripplan card uses
light text, lime route accents and dark text inside its light illustration panels.
Intro/finale retain brand green. Music, scene order and timing are unchanged.

## Editorial references

The five product scenes express planning direction, not claims that all planned
features are already released. No pricing, performance statistics or fabricated
customer results are used.

| Scene | Time | Source | Core message |
| --- | --- | --- | --- |
| TWMS | 0–1.5 | Existing brand name and slogan | Tiny Wins. Make Success. |
| Autogram | 1.5–4.5 | `autogram/docs/SERVICE_OVERVIEW.md` v3.0; root planning docs cover web/API | Instagram/Facebook keyword comments → automatic DM |
| Tripplan | 4.5–7.5 | `trip-plan/docs/pivot_01/11_피벗_PRD.md`, latest decisions 2026-09-11; `00_최우선_제품_방향.md` | Flight/travel discovery and newsletters; not a trip itinerary editor |
| Jarvis | 7.5–10.5 | `jarvis/docs/Cloudflare_Personal_Assistant_MVP_PRD_v1.md`; `Jarvis_Call_Bridge_Client_PRD.md` v2.1 | Personal assistant: memory, tools and voice |
| Orch AI | 10.5–13.5 | `ai_orch/docs/v2-product-plan.md` v1.0 | Knowledge → tasks → execution → verification/iteration |
| TWMS Studio | 13.5–16.5 | `movies/docs/v3/PHASE1_PRD_v1.md`, 2026-10-07; v3 README and earlier as-built PRD | Script → scenes/cuts → previs → film workflow |
| TWMS | 16.5–19.5 | Brand slogan | Tiny Wins. Make Success.; www.twms.ai |

Fitpik is excluded from this film because its repository was not identified.
Reviews is also omitted at the user's request, including the ending name ribbons.
Scene cuts and audio impacts share the beat grid above; risers precede each cut
and the loop back to the intro. Both Reviews and Fitpik cards are hidden on the site.
Official service logos were not invented; typography and abstract product graphics
carry the scenes. The original MP4 remains available as a separate source asset.

## Preview and controls

Open `/motion/twms-momentum.html` for standalone playback and scrubbing. The home
page embeds the same HTML, keeping its sound and pause controls. `?lang=en` and
`?lang=ja` localize scene descriptions. `?embedded=1` hides standalone controls.
`window.twmsMotion.seek(seconds)` and `.pause()` allow deterministic visual QA.
Reduced-motion users receive a paused brand frame. Audio and animation suspend
while the document is hidden; fullscreen flashing/strobe effects are not used.

Parent/player messages are checked against the same origin and the expected
window. No private repository text, keys, internal metrics or infrastructure
details are included in the public player.
