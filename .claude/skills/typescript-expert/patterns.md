# Advanced TypeScript Patterns

## Conditional Types

```typescript
// Extract return type of a function
type ReturnType<T> = T extends (...args: unknown[]) => infer R ? R : never

// Extract promise value type (recursive)
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T

// Extract array element type
type ArrayElement<T> = T extends readonly (infer E)[] ? E : never

// Make specific keys optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Make specific keys required
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

// Deep partial (recursive)
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T

// Deep readonly (recursive)
type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T
```

## Mapped Types with Modifiers

```typescript
// Remove readonly modifier
type Mutable<T> = { -readonly [K in keyof T]: T[K] }

// Remove optional modifier
type Concrete<T> = { [K in keyof T]-?: T[K] }

// Add prefix to all keys
type Prefixed<T, P extends string> = {
  [K in keyof T as `${P}${string & K}`]: T[K]
}

// Filter keys by value type
type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never
}[keyof T]

// Pick only function properties
type FunctionProps<T> = Pick<T, KeysOfType<T, (...args: unknown[]) => unknown>>
```

## Builder Pattern with Type Safety

```typescript
type BuilderState = {
  name: boolean
  email: boolean
  age: boolean
}

type RequiredFields = { name: true; email: true }

class UserBuilder<State extends Partial<BuilderState> = {}> {
  private data: Partial<{ name: string; email: string; age: number }> = {}

  withName(name: string): UserBuilder<State & { name: true }> {
    this.data.name = name
    return this as UserBuilder<State & { name: true }>
  }

  withEmail(email: string): UserBuilder<State & { email: true }> {
    this.data.email = email
    return this as UserBuilder<State & { email: true }>
  }

  withAge(age: number): UserBuilder<State & { age: true }> {
    this.data.age = age
    return this as UserBuilder<State & { age: true }>
  }

  build(this: UserBuilder<RequiredFields>): {
    name: string
    email: string
    age?: number
  } {
    return this.data as { name: string; email: string; age?: number }
  }
}

// Usage - compile error if required fields missing
const user = new UserBuilder()
  .withName("John")
  .withEmail("john@example.com")
  .build() // OK

const invalid = new UserBuilder().withName("John").build() // Error: Property 'email' is missing
```

## State Machine Types

```typescript
type State = "idle" | "loading" | "success" | "error"

type StateData = {
  idle: undefined
  loading: { progress: number }
  success: { data: unknown }
  error: { message: string }
}

type StateMachine<S extends State = "idle"> = {
  state: S
  data: StateData[S]
  transition: <T extends State>(to: T, data: StateData[T]) => StateMachine<T>
}
```

## Variadic Tuple Types

```typescript
// Concatenate tuples
type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U]

// First element
type Head<T extends unknown[]> = T extends [infer H, ...unknown[]] ? H : never

// All but first
type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never

// Last element
type Last<T extends unknown[]> = T extends [...unknown[], infer L] ? L : never

// Reverse tuple
type Reverse<T extends unknown[]> = T extends [infer H, ...infer R]
  ? [...Reverse<R>, H]
  : []
```

## Path Types for Nested Objects

```typescript
type PathImpl<T, K extends keyof T> = K extends string
  ? T[K] extends Record<string, unknown>
    ? `${K}.${PathImpl<T[K], keyof T[K]>}` | K
    : K
  : never

type Path<T> = PathImpl<T, keyof T>

type PathValue<T, P extends Path<T>> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Path<T[K]>
      ? PathValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : never

// Usage
interface Config {
  database: {
    host: string
    port: number
  }
  api: {
    key: string
  }
}

type ConfigPath = Path<Config>
// "database" | "database.host" | "database.port" | "api" | "api.key"

function get<T, P extends Path<T>>(obj: T, path: P): PathValue<T, P> {
  // Implementation
}
```

## Event Emitter with Type Safety

```typescript
type EventMap = {
  connect: { host: string; port: number }
  disconnect: { reason: string }
  message: { content: string; from: string }
}

class TypedEventEmitter<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<(data: unknown) => void>>()

  on<E extends keyof Events>(
    event: E,
    listener: (data: Events[E]) => void
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as (data: unknown) => void)
  }

  emit<E extends keyof Events>(event: E, data: Events[E]): void {
    this.listeners.get(event)?.forEach((listener) => listener(data))
  }
}

// Usage
const emitter = new TypedEventEmitter<EventMap>()

emitter.on("connect", (data) => {
  // data is { host: string; port: number }
  console.log(data.host, data.port)
})

emitter.emit("connect", { host: "localhost", port: 3000 }) // OK
emitter.emit("connect", { host: "localhost" }) // Error: missing 'port'
```

## Validation Schema Types

```typescript
type Validator<T> = (value: unknown) => value is T

type InferValidator<V> = V extends Validator<infer T> ? T : never

const string: Validator<string> = (v): v is string => typeof v === "string"
const number: Validator<number> = (v): v is number => typeof v === "number"

function object<T extends Record<string, Validator<unknown>>>(
  schema: T
): Validator<{ [K in keyof T]: InferValidator<T[K]> }> {
  return (value): value is { [K in keyof T]: InferValidator<T[K]> } => {
    if (typeof value !== "object" || value === null) return false
    return Object.entries(schema).every(([key, validator]) =>
      validator((value as Record<string, unknown>)[key])
    )
  }
}

// Usage
const userValidator = object({
  name: string,
  age: number,
})

function processUser(data: unknown) {
  if (userValidator(data)) {
    // data is { name: string; age: number }
    console.log(data.name, data.age)
  }
}
```

## Recursive JSON Type

```typescript
type JSONPrimitive = string | number | boolean | null
type JSONArray = JSONValue[]
type JSONObject = { [key: string]: JSONValue }
type JSONValue = JSONPrimitive | JSONArray | JSONObject

// Safe JSON parse
function parseJSON(text: string): JSONValue {
  return JSON.parse(text) as JSONValue
}
```
