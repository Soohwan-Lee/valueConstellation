# Value Constellation — Frontend

HCI research prototype for visualizing value-dimension signals from multi-stakeholder deliberation text.

## Stack

- **Vite + React + TypeScript** — fast local dev, easy to modify
- **Tailwind CSS v3** — rapid styling
- **Plain SVG** — no heavy charting library; keeps the app lightweight and the components easy to customize

## Getting Started

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

## Features

| Feature | Status |
|---|---|
| 2D argument map (scatter plot) | ✅ |
| Projection toggle (PCA / MDS / t-SNE / UMAP) | ✅ UI ready, MDS/t-SNE/UMAP simulated |
| Color by cluster / speaker | ✅ |
| Speaker filter | ✅ |
| Click to inspect argument | ✅ |
| 19D signed value bar chart | ✅ |
| Active-value threshold slider | ✅ |
| Cluster label editing | ✅ |
| Cluster filter | ✅ |

## Data

Current fixture: **22 representative arguments** hand-picked from  
`results/policy_discussion/full_argument_projection_compare.csv`  
`results/policy_discussion/full_argument_vectors.csv`

To load real data, replace `src/data/fixture.ts` with a CSV loader (e.g. using `papaparse`).  
Real MDS / t-SNE / UMAP coordinates are in `full_argument_projection_compare.csv`  
(projection_method column: `pca`, `mds`, `tsne`, `umap`).

## Directory Structure

```
src/
  types/          — TypeScript interfaces & constants
  data/           — fixture data + cluster metadata
  utils/          — color palettes, formatting helpers
  components/     — React components (map, detail, legend, controls)
  App.tsx         — state management & layout
```

## Architecture Notes

- Python research scripts (`scripts/`) are untouched — this UI is a pure frontend client.
- The 19D signed value vector is the canonical measurement; 2D projections are display only.
- Cluster assignments come from `full_argument_projection_compare_metadata.json`.
- Do not cluster on t-SNE / UMAP coordinates — cluster in the original 19D space.

## Deployment

```bash
npm run build   # outputs to dist/
```

Deploy `dist/` to Vercel, Netlify, or serve locally with `npm run preview`.
