# Real-World TypeScript Examples

## Example 1: Type-Safe API Client

```typescript
// Define API routes with their request/response types
interface APIRoutes {
  "/users": {
    GET: { response: User[] }
    POST: { body: CreateUserDTO; response: User }
  }
  "/users/:id": {
    GET: { params: { id: string }; response: User }
    PUT: { params: { id: string }; body: UpdateUserDTO; response: User }
    DELETE: { params: { id: string }; response: void }
  }
}

type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE"

type RouteConfig<
  Routes extends Record<string, Record<string, unknown>>,
  Path extends keyof Routes,
  Method extends keyof Routes[Path],
> = Routes[Path][Method]

// Type-safe fetch wrapper
async function apiRequest<
  Path extends keyof APIRoutes,
  Method extends keyof APIRoutes[Path] & HTTPMethod,
>(
  path: Path,
  method: Method,
  options?: RouteConfig<APIRoutes, Path, Method> extends { body: infer B }
    ? { body: B }
    : never
): Promise<
  RouteConfig<APIRoutes, Path, Method> extends { response: infer R } ? R : never
> {
  const response = await fetch(path as string, {
    method,
    body: options
      ? JSON.stringify((options as { body: unknown }).body)
      : undefined,
    headers: { "Content-Type": "application/json" },
  })
  return response.json()
}

// Usage - fully type-checked
const users = await apiRequest("/users", "GET")
// users is User[]

const newUser = await apiRequest("/users", "POST", {
  body: { name: "John", email: "john@example.com" },
})
// newUser is User
```

## Example 2: Form Validation with Discriminated Unions

```typescript
type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; errors: Record<keyof T, string[]> }

interface FormSchema {
  name: { type: "string"; min: number; max: number }
  email: { type: "email" }
  age: { type: "number"; min: number; max: number }
}

type InferFormData<S extends Record<string, { type: string }>> = {
  [K in keyof S]: S[K]["type"] extends "string" | "email"
    ? string
    : S[K]["type"] extends "number"
      ? number
      : unknown
}

function validateForm<S extends Record<string, { type: string }>>(
  schema: S,
  data: Record<string, unknown>
): ValidationResult<InferFormData<S>> {
  const errors: Record<string, string[]> = {}

  for (const [key, config] of Object.entries(schema)) {
    const value = data[key]
    const fieldErrors: string[] = []

    if (config.type === "string" || config.type === "email") {
      if (typeof value !== "string") {
        fieldErrors.push("Must be a string")
      } else {
        if ("min" in config && value.length < (config as { min: number }).min) {
          fieldErrors.push(
            `Minimum length is ${(config as { min: number }).min}`
          )
        }
        if (config.type === "email" && !value.includes("@")) {
          fieldErrors.push("Invalid email format")
        }
      }
    }

    if (config.type === "number") {
      if (typeof value !== "number") {
        fieldErrors.push("Must be a number")
      }
    }

    if (fieldErrors.length > 0) {
      errors[key] = fieldErrors
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      valid: false,
      errors: errors as Record<keyof InferFormData<S>, string[]>,
    }
  }

  return { valid: true, data: data as InferFormData<S> }
}

// Usage
const schema = {
  name: { type: "string" as const, min: 2, max: 50 },
  email: { type: "email" as const },
  age: { type: "number" as const, min: 0, max: 150 },
}

const result = validateForm(schema, formData)

if (result.valid) {
  // result.data is { name: string; email: string; age: number }
  saveUser(result.data)
} else {
  // result.errors is Record<"name" | "email" | "age", string[]>
  showErrors(result.errors)
}
```

## Example 3: Redux-Style Action Creators

```typescript
// Define action types
interface ActionTypes {
  INCREMENT: { amount: number }
  DECREMENT: { amount: number }
  SET_COUNT: { value: number }
  RESET: undefined
}

// Create action type
type Action<T extends keyof ActionTypes> = ActionTypes[T] extends undefined
  ? { type: T }
  : { type: T; payload: ActionTypes[T] }

// Type-safe action creators
type ActionCreators = {
  [K in keyof ActionTypes]: ActionTypes[K] extends undefined
    ? () => Action<K>
    : (payload: ActionTypes[K]) => Action<K>
}

const actionCreators: ActionCreators = {
  INCREMENT: (payload) => ({ type: "INCREMENT", payload }),
  DECREMENT: (payload) => ({ type: "DECREMENT", payload }),
  SET_COUNT: (payload) => ({ type: "SET_COUNT", payload }),
  RESET: () => ({ type: "RESET" }),
}

// Type-safe reducer
type AllActions = Action<keyof ActionTypes>

function reducer(state: number, action: AllActions): number {
  switch (action.type) {
    case "INCREMENT":
      return state + action.payload.amount
    case "DECREMENT":
      return state - action.payload.amount
    case "SET_COUNT":
      return action.payload.value
    case "RESET":
      return 0
    default:
      const _exhaustive: never = action
      return state
  }
}
```

## Example 4: Database Query Builder

```typescript
interface User {
  id: number
  name: string
  email: string
  age: number
  createdAt: Date
}

type WhereClause<T> = {
  [K in keyof T]?:
    | T[K]
    | { eq: T[K] }
    | { ne: T[K] }
    | { gt: T[K] }
    | { lt: T[K] }
    | { in: T[K][] }
}

type OrderBy<T> = {
  [K in keyof T]?: "asc" | "desc"
}

class QueryBuilder<T, Selected extends keyof T = keyof T> {
  private _where: WhereClause<T> = {}
  private _orderBy: OrderBy<T> = {}
  private _limit?: number
  private _select?: Selected[]

  where(clause: WhereClause<T>): this {
    this._where = { ...this._where, ...clause }
    return this
  }

  orderBy(order: OrderBy<T>): this {
    this._orderBy = order
    return this
  }

  limit(n: number): this {
    this._limit = n
    return this
  }

  select<K extends keyof T>(fields: K[]): QueryBuilder<T, K> {
    const builder = this as unknown as QueryBuilder<T, K>
    builder._select = fields
    return builder
  }

  execute(): Promise<Pick<T, Selected>[]> {
    // Build and execute SQL query
    return Promise.resolve([])
  }
}

// Usage
const users = await new QueryBuilder<User>()
  .select(["id", "name", "email"])
  .where({ age: { gt: 18 } })
  .orderBy({ createdAt: "desc" })
  .limit(10)
  .execute()

// users is { id: number; name: string; email: string }[]
```

## Example 5: React Component Props with Polymorphism

```typescript
type PolymorphicRef<C extends React.ElementType> =
  React.ComponentPropsWithRef<C>["ref"]

type AsProp<C extends React.ElementType> = { as?: C }

type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P)

type PolymorphicComponentProp<
  C extends React.ElementType,
  Props = {}
> = React.PropsWithChildren<Props & AsProp<C>> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>

type PolymorphicComponentPropWithRef<
  C extends React.ElementType,
  Props = {}
> = PolymorphicComponentProp<C, Props> & { ref?: PolymorphicRef<C> }

// Button component that can render as any element
interface ButtonProps {
  variant?: "primary" | "secondary"
  size?: "sm" | "md" | "lg"
}

type ButtonComponent = <C extends React.ElementType = "button">(
  props: PolymorphicComponentPropWithRef<C, ButtonProps>
) => React.ReactElement | null

const Button: ButtonComponent = React.forwardRef(
  <C extends React.ElementType = "button">(
    { as, variant = "primary", size = "md", children, ...props }: PolymorphicComponentProp<C, ButtonProps>,
    ref?: PolymorphicRef<C>
  ) => {
    const Component = as || "button"
    return (
      <Component ref={ref} className={`btn-${variant} btn-${size}`} {...props}>
        {children}
      </Component>
    )
  }
)

// Usage
<Button>Click me</Button>                              // renders as <button>
<Button as="a" href="/home">Go home</Button>          // renders as <a>
<Button as={Link} to="/about">About</Button>          // renders as Link component
```

## Example 6: Middleware Chain Types

```typescript
type Context = {
  request: Request
  response: Response
  state: Record<string, unknown>
}

type NextFunction = () => Promise<void>

type Middleware<
  StateIn extends Record<string, unknown> = Record<string, unknown>,
  StateOut extends Record<string, unknown> = StateIn,
> = (
  ctx: Context & { state: StateIn },
  next: NextFunction
) => Promise<Context & { state: StateOut }>

// Compose middlewares with proper state threading
function compose<
  S1 extends Record<string, unknown>,
  S2 extends Record<string, unknown>,
  S3 extends Record<string, unknown>,
>(m1: Middleware<S1, S2>, m2: Middleware<S2, S3>): Middleware<S1, S3>

function compose(...middlewares: Middleware[]): Middleware {
  return async (ctx, next) => {
    let index = -1

    async function dispatch(i: number): Promise<void> {
      if (i <= index) throw new Error("next() called multiple times")
      index = i

      const middleware = middlewares[i]
      if (i === middlewares.length) {
        return next()
      }

      await middleware(ctx, () => dispatch(i + 1))
    }

    await dispatch(0)
    return ctx
  }
}

// Usage
const authMiddleware: Middleware<{}, { userId: string }> = async (
  ctx,
  next
) => {
  ctx.state.userId = "123"
  await next()
  return ctx as Context & { state: { userId: string } }
}

const logMiddleware: Middleware<
  { userId: string },
  { userId: string; logged: true }
> = async (ctx, next) => {
  console.log(`User ${ctx.state.userId} made request`)
  ctx.state.logged = true
  await next()
  return ctx as Context & { state: { userId: string; logged: true } }
}

const pipeline = compose(authMiddleware, logMiddleware)
// pipeline is Middleware<{}, { userId: string; logged: true }>
```

## Example 7: Zod-like Schema Inference

```typescript
abstract class Schema<T> {
  abstract parse(value: unknown): T
  abstract _type: T
}

class StringSchema extends Schema<string> {
  _type!: string

  parse(value: unknown): string {
    if (typeof value !== "string") {
      throw new Error("Expected string")
    }
    return value
  }

  min(length: number): this {
    // Add validation
    return this
  }

  email(): this {
    // Add email validation
    return this
  }
}

class NumberSchema extends Schema<number> {
  _type!: number

  parse(value: unknown): number {
    if (typeof value !== "number") {
      throw new Error("Expected number")
    }
    return value
  }

  min(value: number): this {
    return this
  }
}

class ObjectSchema<T extends Record<string, Schema<unknown>>> extends Schema<{
  [K in keyof T]: T[K]["_type"]
}> {
  _type!: { [K in keyof T]: T[K]["_type"] }

  constructor(private shape: T) {
    super()
  }

  parse(value: unknown): { [K in keyof T]: T[K]["_type"] } {
    if (typeof value !== "object" || value === null) {
      throw new Error("Expected object")
    }

    const result: Record<string, unknown> = {}
    for (const [key, schema] of Object.entries(this.shape)) {
      result[key] = schema.parse((value as Record<string, unknown>)[key])
    }

    return result as { [K in keyof T]: T[K]["_type"] }
  }
}

// Factory functions
const z = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  object: <T extends Record<string, Schema<unknown>>>(shape: T) =>
    new ObjectSchema(shape),
}

// Infer type from schema
type Infer<S extends Schema<unknown>> = S["_type"]

// Usage
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0),
})

type User = Infer<typeof userSchema>
// { name: string; email: string; age: number }

const user = userSchema.parse(data)
// user is User
```
