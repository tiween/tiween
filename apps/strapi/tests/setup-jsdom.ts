// Per-file setup for the "admin" Jest project (jsdom environment).
// Extends Jest's expect with @testing-library/jest-dom matchers
// (toBeInTheDocument, toHaveAttribute, ...).
import "@testing-library/jest-dom"

// jsdom has no layout engine. The Design System `Combobox` observes its list
// with IntersectionObserver and measures it with ResizeObserver when it opens;
// no-op stand-ins let a test open the list and pick an option. Nothing here
// reports intersections or sizes, so only behaviour that does not depend on
// layout (filtering, selecting) is testable, which is all the suites assert.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
for (const name of ["IntersectionObserver", "ResizeObserver"] as const) {
  if (!(name in globalThis)) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: NoopObserver,
    })
  }
}

// jsdom does not implement scrollIntoView, which the combobox calls on the
// highlighted option.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}
