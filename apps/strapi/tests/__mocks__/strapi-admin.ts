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
/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from "@jest/globals"

export const useFetchClient = jest.fn(() => ({
  get: jest.fn(async (_url: string) => ({ data: { data: [] } })),
  post: jest.fn(async (_url: string, _body?: any) => ({ data: { data: {} } })),
  put: jest.fn(async (_url: string, _body?: any) => ({ data: { data: {} } })),
  del: jest.fn(async (_url: string) => ({ data: { data: {} } })),
}))

export const useNotification = jest.fn(() => jest.fn())

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
}

export const Layouts = {
  Root: ({ children }: { children?: React.ReactNode }) => children,
  Header: ({ children }: { children?: React.ReactNode }) => children,
  Content: ({ children }: { children?: React.ReactNode }) => children,
}
