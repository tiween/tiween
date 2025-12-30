# Story 2A.15: User Components - ProfileForm and SocialLogin

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create ProfileForm and SocialLogin components,
So that users can manage their profile and authenticate with social providers.

---

## Acceptance Criteria

1. **Given** LoginForm and RegisterForm exist
   **When** I create ProfileForm and SocialLogin components
   **Then** ProfileForm is created at `src/features/auth/components/ProfileForm/`

2. **And** ProfileForm has:

   - Avatar upload/change
   - Name input
   - Email display (non-editable or with verification)
   - Language preference selector (AR/FR/EN)
   - Default region selector
   - Save button

3. **And** SocialLogin is created at `src/features/auth/components/SocialLogin/` with:

   - "Continue with Google" button with icon
   - "Continue with Facebook" button with icon
   - Divider with "ou"
   - Loading states for each button

4. **And** both components have Storybook stories

5. **And** components work in RTL mode

---

## Tasks / Subtasks

- [ ] **Task 1: Create ProfileForm Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/features/auth/components/ProfileForm/`
  - [ ] 1.2 Define ProfileFormProps interface
  - [ ] 1.3 Implement avatar upload/preview
  - [ ] 1.4 Add name input
  - [ ] 1.5 Add email display (read-only)
  - [ ] 1.6 Add language selector (AR/FR/EN)
  - [ ] 1.7 Add region selector
  - [ ] 1.8 Add save button with loading

- [ ] **Task 2: Create SocialLogin Component** (AC: #3)

  - [ ] 2.1 Create directory `src/features/auth/components/SocialLogin/`
  - [ ] 2.2 Define SocialLoginProps interface
  - [ ] 2.3 Implement Google button with icon
  - [ ] 2.4 Implement Facebook button with icon
  - [ ] 2.5 Add divider with "ou" text
  - [ ] 2.6 Add loading states for each button

- [ ] **Task 3: Storybook Stories** (AC: #4)

  - [ ] 3.1 Create ProfileForm.stories.tsx
  - [ ] 3.2 Add Default, WithAvatar, Loading stories
  - [ ] 3.3 Create SocialLogin.stories.tsx
  - [ ] 3.4 Add Default, GoogleLoading, FacebookLoading stories

- [ ] **Task 4: RTL Support** (AC: #5)
  - [ ] 4.1 Align form fields correctly
  - [ ] 4.2 Position social icons correctly
  - [ ] 4.3 Add RTL stories

---

## Dev Notes

### ProfileForm Props

```typescript
export interface ProfileFormData {
  name: string
  email: string
  language: "ar" | "fr" | "en"
  region?: string
  avatarUrl?: string
}

export interface ProfileFormProps {
  initialData: ProfileFormData
  onSubmit: (data: ProfileFormData) => void
  onAvatarChange?: (file: File) => void
  isLoading?: boolean
  regions?: Array<{ id: string; name: string }>
  className?: string
  labels?: ProfileFormLabels
}
```

### SocialLogin Props

```typescript
export interface SocialLoginProps {
  onGoogleClick: () => void
  onFacebookClick: () => void
  isGoogleLoading?: boolean
  isFacebookLoading?: boolean
  disabled?: boolean
  className?: string
  labels?: {
    google: string
    facebook: string
    divider: string
  }
}
```

### Language Options

```typescript
const languages = [
  { value: "ar", label: "العربية" },
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
]
```

### File Structure

```
apps/client/src/features/auth/components/
├── LoginForm/
├── RegisterForm/
├── ProfileForm/
│   ├── ProfileForm.tsx
│   ├── AvatarUpload.tsx
│   ├── ProfileForm.stories.tsx
│   └── index.ts
├── SocialLogin/
│   ├── SocialLogin.tsx
│   ├── SocialLogin.stories.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.15]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/auth/components/ProfileForm/ProfileForm.tsx` (to create)
- `apps/client/src/features/auth/components/ProfileForm/AvatarUpload.tsx` (to create)
- `apps/client/src/features/auth/components/ProfileForm/ProfileForm.stories.tsx` (to create)
- `apps/client/src/features/auth/components/ProfileForm/index.ts` (to create)
- `apps/client/src/features/auth/components/SocialLogin/SocialLogin.tsx` (to create)
- `apps/client/src/features/auth/components/SocialLogin/SocialLogin.stories.tsx` (to create)
- `apps/client/src/features/auth/components/SocialLogin/index.ts` (to create)
