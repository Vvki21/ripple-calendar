# Ripple

An interactive calendar prototype built around an **Elastic Timeline**: stretch or move an event and the flexible events after it ripple out of the way in real time. Locked events hold their time; conflicts are previewed, never silently saved.

Built with React + Vite for an HCI Design course.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

- `/` — the calendar (Week view by default; Day and Month views too)
- `/design-system` — the Ripple design system: palette, event colors, typography, spacing, components

## Try

- Drag on empty time to create an event; name it in the popover.
- Drag an event to move it (sideways to change the day); drag its bottom edge to stretch it.
- Lock an event and watch the ripple respect it.
- ⌘Z / Ctrl+Z to undo. **Demo** in the top bar steps through the six prototype stages.
