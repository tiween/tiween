# Story 2A.14: User Components - LoginForm and RegisterForm

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create LoginForm and RegisterForm components,
So that users can authenticate with the application.

---

## Acceptance Criteria

1. **Given** shadcn/ui Form components are available
   **When** I create LoginForm and RegisterForm components
   **Then** LoginForm is created at `src/features/auth/components/LoginForm/`

2. **And** LoginForm has:

   - Email input
   - Password input with show/hide toggle
   - "Forgot password" link
   - Submit button
   - Social login buttons (Google, Facebook)
   - "Create account" link

3. **And** RegisterForm is created at `src/features/auth/components/RegisterForm/` with:

   - Name input
   - Email input
   - Password input with strength indicator
   - Confirm password input
   - Terms acceptance checkbox
   - Submit button
   - Social login buttons
   - "Already have account" link

4. **And** both forms use Zod validation

5. **And** error messages display inline

6. **And** Storybook stories exist for all states

7. **And** forms work in RTL mode

---

## Tasks / Subtasks

- [ ] **Task 1: Create LoginForm Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/features/auth/components/LoginForm/`
  - [ ] 1.2 Define LoginFormProps interface
  - [ ] 1.3 Implement email input with shadcn Input
  - [ ] 1.4 Implement password input with toggle
  - [ ] 1.5 Add "Forgot password" link
  - [ ] 1.6 Add submit button with loading state
  - [ ] 1.7 Add social login buttons section
  - [ ] 1.8 Add "Create account" link

- [ ] **Task 2: Create RegisterForm Component** (AC: #3)

  - [ ] 2.1 Create directory `src/features/auth/components/RegisterForm/`
  - [ ] 2.2 Define RegisterFormProps interface
  - [ ] 2.3 Implement name input
  - [ ] 2.4 Implement email input
  - [ ] 2.5 Implement password input with strength indicator
  - [ ] 2.6 Implement confirm password input
  - [ ] 2.7 Add terms checkbox
  - [ ] 2.8 Add submit button with loading
  - [ ] 2.9 Add social login buttons
  - [ ] 2.10 Add "Already have account" link

- [ ] **Task 3: Form Validation** (AC: #4, #5)

  - [ ] 3.1 Create login validation schema
  - [ ] 3.2 Create register validation schema
  - [ ] 3.3 Implement inline error display
  - [ ] 3.4 Add password match validation

- [ ] **Task 4: Storybook Stories** (AC: #6)

  - [ ] 4.1 Create LoginForm.stories.tsx
  - [ ] 4.2 Add Default, WithError, Loading stories
  - [ ] 4.3 Create RegisterForm.stories.tsx
  - [ ] 4.4 Add Default, WeakPassword, PasswordMismatch stories

- [ ] **Task 5: RTL Support** (AC: #7)
  - [ ] 5.1 Align form fields correctly
  - [ ] 5.2 Position icons correctly
  - [ ] 5.3 Add RTL stories

---

## Dev Notes

### LoginForm Props

```typescript
export interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void
  onForgotPassword?: () => void
  onCreateAccount?: () => void
  onSocialLogin?: (provider: "google" | "facebook") => void
  isLoading?: boolean
  error?: string
  className?: string
  labels?: LoginFormLabels
}

export interface LoginFormData {
  email: string
  password: string
}
```

### RegisterForm Props

```typescript
export interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => void
  onLogin?: () => void
  onSocialLogin?: (provider: "google" | "facebook") => void
  isLoading?: boolean
  error?: string
  className?: string
  labels?: RegisterFormLabels
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}
```

### Validation Schemas

```typescript
export const loginSchema = z.object({
  email: z.string().email("INVALID_EMAIL"),
  password: z.string().min(1, "REQUIRED"),
})

export const registerSchema = z
  .object({
    name: z.string().min(2, "NAME_TOO_SHORT"),
    email: z.string().email("INVALID_EMAIL"),
    password: z.string().min(8, "PASSWORD_TOO_SHORT"),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "TERMS_REQUIRED" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "PASSWORDS_DONT_MATCH",
    path: ["confirmPassword"],
  })
```

### Password Strength Indicator

```typescript
function getPasswordStrength(password: string): "weak" | "medium" | "strong" {
  if (password.length < 8) return "weak"
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  if (hasNumber && hasSpecial && hasUpper) return "strong"
  if (hasNumber || hasSpecial) return "medium"
  return "weak"
}
```

### File Structure

```
apps/client/src/features/auth/components/
├── LoginForm/
│   ├── LoginForm.tsx
│   ├── loginSchema.ts
│   ├── LoginForm.stories.tsx
│   └── index.ts
├── RegisterForm/
│   ├── RegisterForm.tsx
│   ├── PasswordStrength.tsx
│   ├── registerSchema.ts
│   ├── RegisterForm.stories.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.14]
- Pattern Reference: shadcn/ui Form components

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/auth/components/LoginForm/LoginForm.tsx` (to create)
- `apps/client/src/features/auth/components/LoginForm/loginSchema.ts` (to create)
- `apps/client/src/features/auth/components/LoginForm/LoginForm.stories.tsx` (to create)
- `apps/client/src/features/auth/components/LoginForm/index.ts` (to create)
- `apps/client/src/features/auth/components/RegisterForm/RegisterForm.tsx` (to create)
- `apps/client/src/features/auth/components/RegisterForm/PasswordStrength.tsx` (to create)
- `apps/client/src/features/auth/components/RegisterForm/registerSchema.ts` (to create)
- `apps/client/src/features/auth/components/RegisterForm/RegisterForm.stories.tsx` (to create)
- `apps/client/src/features/auth/components/RegisterForm/index.ts` (to create)
