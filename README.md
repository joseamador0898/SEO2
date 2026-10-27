# SE O₂

**Sé O₂, "be oxygen."** A gamified app for cutting your carbon footprint. Low-carbon choices earn points, high-carbon ones cost points, and the app infers most of it from your phone, email and wallet so you don't have to log everything by hand.

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # carbon engine + inference tests
```

## How scoring works

**1 point = 100 g CO₂e avoided** compared with the default alternative. Penalties use the same scale.

| Action | Compared against | Example |
| --- | --- | --- |
| Walk, bike, e-bike, transit | Solo gasoline car (218 g/km) | 7.5 km bike commute → **+16** |
| Carpool / shared ride | Solo car, split by occupants | 10 km, 4 people → **+16** |
| Uber/DiDi solo | Solo car + ~40% empty pickup driving | 11 km → **−10** |
| Flight | Not flying (DEFRA factors incl. radiative forcing) | MEX ⇄ CUN economy → **−3,879** |
| Fast fashion (Zara, Shein, H&M, Bershka…) | Not buying; ×1.5 after 3+ orders in 30 days | 4-item Zara order → **−710** |
| Second-hand (GoTrendier, Vinted…) | Buying new | 2 items → **+84** |
| Meals | Average 2.5 kg meal | Beef **−52**, vegan **+18** |

The transport factors (Mexico grid at 444 g/kWh, CDMX speeds) come from the EcoTrack CDMX spec in PR #1. The logic is in `src/lib/carbon.ts`.

## Inference

`src/lib/inference.ts` turns raw signals into scored activities:

- **Email receipts:** detects fast-fashion and second-hand brands and counts garments line by line (jeans, chamarra, playera…). It also reads flight routes from IATA codes (with haversine distance, cabin class and round trip), and tells shared rides from solo rides.
- **iPhone motion/Health:** cycling, walking, transit and driving trips.
- **Apple Pay / cards:** Ecobici, transit top-ups, and in-store fashion purchases.

Inferred items land in a **review queue** with a confidence score and the evidence behind them. Nothing counts until the user confirms it.

## Demo vs. production

This is a web prototype. The connectors scan **sample data** (`src/lib/data.ts`), and the "Paste a receipt" box runs the real parser on any text you give it. Connecting real sources would need:

- an **iOS app** (or Capacitor/Expo wrapper) for HealthKit and Core Motion,
- the **Gmail API** (OAuth, `gmail.readonly`) with receipts parsed on-device,
- a bank aggregator or Apple Pay transaction access for card data.

State is saved in `localStorage`.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Motion, lucide-react, Vitest.
