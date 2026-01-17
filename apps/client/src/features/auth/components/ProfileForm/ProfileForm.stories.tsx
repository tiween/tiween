import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"
import type { ProfileFormData, Region } from "."

import { ProfileForm } from "."

const meta: Meta<typeof ProfileForm> = {
  title: "Features/Auth/ProfileForm",
  component: ProfileForm,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Profile editing form with avatar upload, language preference, and region selection. Supports AR/FR/EN languages with full RTL support.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ProfileForm>

// Sample regions for Tunisia
const tunisianRegions: Region[] = [
  { id: "tunis", name: "Grand Tunis" },
  { id: "sfax", name: "Sfax" },
  { id: "sousse", name: "Sousse" },
  { id: "kairouan", name: "Kairouan" },
  { id: "bizerte", name: "Bizerte" },
  { id: "gabes", name: "Gabès" },
  { id: "ariana", name: "Ariana" },
  { id: "gafsa", name: "Gafsa" },
]

const defaultInitialData: ProfileFormData = {
  name: "Ahmed Ben Ali",
  email: "ahmed.benali@example.com",
  language: "fr",
}

/**
 * Interactive wrapper for stories
 */
function InteractiveProfileForm({
  initialData = defaultInitialData,
  regions = tunisianRegions,
  simulateLoading = false,
}: {
  initialData?: ProfileFormData
  regions?: Region[]
  simulateLoading?: boolean
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    setSaved(false)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
    setSaved(true)
    console.log("Profile saved:", data)
  }

  const handleAvatarChange = (file: File) => {
    console.log("Avatar file selected:", file.name, file.size)
  }

  return (
    <div className="space-y-4">
      <ProfileForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onAvatarChange={handleAvatarChange}
        isLoading={isLoading || simulateLoading}
        regions={regions}
      />
      {saved && (
        <p className="text-center text-sm text-green-600">
          ✓ Profil enregistré avec succès!
        </p>
      )}
    </div>
  )
}

/**
 * Default form state
 */
export const Default: Story = {
  render: () => <InteractiveProfileForm />,
}

/**
 * Form with existing avatar
 */
export const WithAvatar: Story = {
  render: () => (
    <InteractiveProfileForm
      initialData={{
        ...defaultInitialData,
        avatarUrl: "https://i.pravatar.cc/150?u=ahmed",
      }}
    />
  ),
}

/**
 * Form in loading state
 */
export const Loading: Story = {
  render: () => <InteractiveProfileForm simulateLoading />,
}

/**
 * Form without region selector
 */
export const WithoutRegions: Story = {
  render: () => <InteractiveProfileForm regions={[]} />,
}

/**
 * RTL mode with Arabic labels
 */
export const RTL: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (data: ProfileFormData) => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setIsLoading(false)
      console.log("Profile saved:", data)
    }

    return (
      <div dir="rtl" lang="ar" className="font-arabic">
        <ProfileForm
          initialData={{
            name: "أحمد بن علي",
            email: "ahmed@example.com",
            language: "ar",
            region: "tunis",
          }}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          regions={[
            { id: "tunis", name: "تونس الكبرى" },
            { id: "sfax", name: "صفاقس" },
            { id: "sousse", name: "سوسة" },
          ]}
          labels={{
            title: "ملفي الشخصي",
            name: "الاسم الكامل",
            namePlaceholder: "اسمك",
            email: "البريد الإلكتروني",
            language: "اللغة",
            region: "المنطقة الافتراضية",
            regionPlaceholder: "اختر منطقة",
            save: "حفظ",
            saving: "جاري الحفظ...",
            avatar: {
              change: "تغيير",
              remove: "حذف",
              uploadHint: "JPG, PNG أو GIF. 2 ميجا كحد أقصى.",
            },
          }}
        />
      </div>
    )
  },
}

/**
 * English labels
 */
export const EnglishLabels: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (data: ProfileFormData) => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setIsLoading(false)
    }

    return (
      <ProfileForm
        initialData={{
          name: "Ahmed Ben Ali",
          email: "ahmed@example.com",
          language: "en",
        }}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        regions={tunisianRegions}
        labels={{
          title: "My Profile",
          name: "Full Name",
          namePlaceholder: "Your name",
          email: "Email",
          language: "Language",
          region: "Default Region",
          regionPlaceholder: "Select a region",
          save: "Save",
          saving: "Saving...",
          avatar: {
            change: "Change",
            remove: "Remove",
            uploadHint: "JPG, PNG or GIF. Max 2MB.",
          },
        }}
      />
    )
  },
}

/**
 * New user (empty profile)
 */
export const NewUser: Story = {
  render: () => (
    <InteractiveProfileForm
      initialData={{
        name: "",
        email: "newuser@example.com",
        language: "fr",
      }}
    />
  ),
}

/**
 * Controlled component demo
 */
export const Controlled: Story = {
  args: {
    initialData: defaultInitialData,
    regions: tunisianRegions,
    isLoading: false,
    onSubmit: (data) => console.log("Submit:", data),
    onAvatarChange: (file) => console.log("Avatar:", file.name),
  },
}
