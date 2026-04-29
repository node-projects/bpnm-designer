# BPMN Editor

This repository contains a browser-based BPMN XML editor built on top of `@node-projects/web-component-designer`. It combines a canvas editor, an XML code view, a BPMN-aware property grid, and a static deployment path that can be published directly to GitHub Pages.

The editor is aimed at lightweight BPMN authoring and diagram cleanup in the browser. It is not a workflow engine and it does not attempt to implement the full BPMN 2.0 execution model.

## Highlights

- Visual BPMN canvas with synchronized XML editing.
- Palette-driven element creation for common BPMN nodes and edges.
- BPMN-aware property editing for labels, documentation, event definitions, ids, references, and colors.
- Context pad actions for delete, recolor, element replacement, and text-annotation creation.
- Automatic rerouting of connected BPMN edges when nodes move or resize.
- BPMN DI read and write support, including `bioc:fill` and `bioc:stroke` colors compatible with bpmn.io-style color metadata.
- Collaboration-ready sample diagram with participants, lanes, message flow, group, annotation, and event definitions.
- Drag-and-drop BPMN/XML loading, download/save-as support, and recent-document persistence in local storage.
- Static GitHub Pages publishing through a generated `site/` artifact.

## Supported Surface

The current modeling surface focuses on the most useful diagramming elements for interactive editing:

- Events: start, intermediate catch, intermediate throw, boundary, end.
- Activities: task, user task, service task, script task, manual task, business rule task, send task, receive task, call activity, sub process.
- Gateways: exclusive, parallel, inclusive, event based.
- Data and artifacts: data object, data store, text annotation, group.
- Collaboration structures: participant and lane.
- Edges: sequence flow, message flow, association, data input association, data output association.

## Local Development

### Prerequisites

- Node.js 18 or newer.
- npm 9 or newer.

### Install and run

```bash
npm ci
npm start
```

The dev server serves the project directly from the repository root. The app shell lives in `index.html`, while TypeScript sources compile into `dist/`.

### Useful scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the local dev server and open the editor in a browser. |
| `npm run build` | Compile TypeScript into `dist/`. |
| `npm run check` | Run TypeScript type-checking without emitting files. |
| `npm run prepare-pages` | Build the app and create a static `site/` artifact for publishing. |

## How It Works

### Editor architecture

- `src/initialize.ts` wires the shell, file operations, recent documents, and the split-view document container.
- `src/setupBpmnDesignerServiceContainer.ts` configures the web-component-designer services, BPMN tools, extensions, and context menus.
- `src/services/BpmnParserService.ts` converts between BPMN XML/BPMN DI and the custom BPMN web components used on the canvas.
- `src/extensions/BpmnContextPadExtension.ts` provides single-selection overlay actions similar to the bpmn.io context pad.
- `src/services/BpmnConnectionRouting.ts` keeps connected edges visually aligned while editing.
- `src/widgets/` contains the BPMN element implementations and palette metadata.

### BPMN XML and DI handling

The editor persists both semantic BPMN model elements and diagram interchange information:

- BPMN model elements are written under `bpmn:process` and `bpmn:collaboration`.
- BPMN DI shapes and edges are written under `bpmndi:BPMNDiagram` and `bpmndi:BPMNPlane`.
- Color metadata is stored with the bpmn.io color namespace using `bioc:fill` and `bioc:stroke`.
- Edge waypoints are regenerated when necessary so moved nodes keep coherent connections.

## GitHub Pages Deployment

The repository includes [deploy-pages.yml](.github/workflows/deploy-pages.yml), which publishes the editor to GitHub Pages on pushes to `main` or `master`, and also supports manual runs.

### Deployment flow

1. GitHub Actions installs dependencies with `npm ci`.
2. `npm run prepare-pages` compiles the app and creates a `site/` folder.
3. The staging script copies the required browser runtime packages into `site/vendor/` and rewrites the production `index.html` to use those vendored paths.
4. The workflow uploads `site/` as the Pages artifact and deploys it.

### One-time repository setup

1. Open the repository settings on GitHub.
2. Go to the Pages section.
3. Set the build and deployment source to `GitHub Actions`.

After that, the site will be published at the standard Pages URL for the repository, typically `https://<owner>.github.io/<repo>/`.

### Local dry-run for deployment

If you want to inspect the production artifact before pushing:

```bash
npm run prepare-pages
npx web-dev-server --root-dir site --open
```

The generated `site/` folder is ignored by Git and is safe to recreate at any time.

## Editing Workflow

Typical usage inside the editor:

1. Open an existing BPMN XML file or load the built-in sample.
2. Add or connect elements from the palette and connection tools.
3. Select an element to use the context pad for quick actions.
4. Use the inspector to edit semantic fields and DI colors.
5. Review or adjust the XML in the synchronized code view.
6. Download the BPMN XML or save it under a new name.

## Current Scope and Limitations

- The editor focuses on diagram authoring and BPMN DI round-tripping, not process execution.
- The supported BPMN surface is intentionally curated and does not cover every BPMN 2.0 element or attribute.
- The replacement menu in the context pad is limited to compatible element families.
- Advanced BPMN behaviors such as validation, simulation, token playback, and engine-specific extensions are out of scope.

## Repository Layout

```text
.
|-- index.html
|-- src/
|   |-- extensions/
|   |-- services/
|   |-- toolbar/
|   `-- widgets/
|-- scripts/
|   `-- prepare-pages.mjs
|-- dist/
`-- .github/workflows/
```

## Notes

- The app currently uses import maps in development.
- The GitHub Pages artifact avoids direct `node_modules` hosting by rewriting those imports to `site/vendor/` during staging.
- The default sample is intentionally richer than a minimal three-node process so collaboration and artifact behavior can be exercised immediately.