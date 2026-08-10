/**
 * Mocks for @strapi/strapi/admin hooks.
 *
 * Strapi's admin panel exposes hooks (useFetchClient, useNotification, ...)
 * that depend on a running admin shell. In unit tests we replace them with
 * lightweight controllable stand-ins so components can be tested in
 * isolation.
 *
 * Intentionally minimal — only the surface we actually use is mocked. If a
 * test pulls in a hook not listed here, add it explicitly rather than
 * auto-mocking the whole module.
 */

import { jest } from "@jest/globals"

export const useFetchClient = jest.fn(() => ({
  get: jest.fn(async (_url: string) => ({ data: { data: [] } })),
  post: jest.fn(async (_url: string, _body?: any) => ({ data: { data: {} } })),
  put: jest.fn(async (_url: string, _body?: any) => ({ data: { data: {} } })),
  del: jest.fn(async (_url: string) => ({ data: { data: {} } })),
}))

/**
 * The real hook returns `{ toggleNotification }` — every call site in this repo
 * destructures it. Returning a bare function (the previous stand-in) made
 * `toggleNotification` `undefined`, so the first toast a component fired blew up
 * with "not a function" inside the test rather than in the code under test.
 */
export const toggleNotification = jest.fn()
export const useNotification = jest.fn(() => ({ toggleNotification }))

export const useTracking = jest.fn(() => ({ trackUsage: jest.fn() }))

export const useRBAC = jest.fn(() => ({
  isLoading: false,
  allowedActions: {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  },
}))

export const useAuth = jest.fn(() => ({
  user: { id: 1, email: "admin@test", firstname: "Test", lastname: "Admin" },
}))

export const Page = {
  Title: ({ children }: { children?: React.ReactNode }) => children,
  Loading: () => null,
  Error: ({ children }: { children?: React.ReactNode }) => children,
  Main: ({ children }: { children?: React.ReactNode }) => children,
  // Rendered by a page whose caller lacks the read permission; the text is what
  // a test asserts on, so it must be identifiable rather than `null`.
  NoPermissions: () => "You do not have the permissions to access that content",
}

/**
 * `Layouts.Header` renders its own props rather than children (title, subtitle,
 * primaryAction), so the stand-in has to project them or a page's title and its
 * main CTA are invisible to a component test.
 */
export const Layouts = {
  Root: ({ children }: { children?: React.ReactNode }) => children,
  Header: ({
    title,
    subtitle,
    primaryAction,
  }: {
    title?: React.ReactNode
    subtitle?: React.ReactNode
    primaryAction?: React.ReactNode
  }) => [title, subtitle, primaryAction],
  Content: ({ children }: { children?: React.ReactNode }) => children,
}

/** `SubNav.*` (the plugin side navigation) — structure only. */
export const SubNav = {
  Main: ({ children }: { children?: React.ReactNode }) => children,
  Header: ({ label }: { label?: React.ReactNode }) => label,
  Content: ({ children }: { children?: React.ReactNode }) => children,
  Sections: ({ children }: { children?: React.ReactNode }) => children,
  Section: ({ children }: { children?: React.ReactNode }) => children,
  Link: ({ label }: { label?: React.ReactNode }) => label,
}
