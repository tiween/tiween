import { Metadata } from "next"
import { PlayContributionWizard } from "@/features/contribute/components"
import { Locale } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"

import type { ContributeLabels } from "@/features/contribute/types"

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export const metadata: Metadata = {
  title: "Contribute a Play | Tiween",
  description:
    "Submit a Tunisian play to be added to the Tiween database. Help us document and preserve Tunisian theatre.",
  robots: { index: true, follow: true },
}

export default async function ContributePlayPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  // Get contribute labels from messages
  const messages = await getMessages({ locale })

  // Extract contribute labels with type safety
  const contributeMessages = (messages as Record<string, unknown>)
    .contribute as ContributeLabels | undefined

  // Provide default labels if not defined in messages
  const labels: ContributeLabels = contributeMessages || {
    steps: {
      basics: "Basic Information",
      theatreDetails: "Theatre Details",
      credits: "Credits",
      media: "Media & Links",
      review: "Review & Submit",
    },
    fields: {
      title: "Title",
      originalTitle: "Original Title",
      synopsis: "Synopsis",
      releaseYear: "Year",
      duration: "Duration",
      ageRating: "Age Rating",
      playType: "Play Type",
      format: "Format",
      actCount: "Number of Acts",
      hasIntermission: "Has Intermission",
      basedOn: "Based On",
      originalLanguage: "Original Language",
      productionCompany: "Production Company",
      premiereDate: "Premiere Date",
      person: "Person",
      role: "Role",
      character: "Character",
      poster: "Poster",
      videos: "Videos",
      links: "Links",
      distinctions: "Awards & Festivals",
      inputLanguage: "Input Language",
      submitterEmail: "Your Email",
      submitterName: "Your Name",
      acceptTerms: "I accept the terms",
    },
    buttons: {
      next: "Continue",
      previous: "Back",
      submit: "Submit",
      saveDraft: "Save Draft",
      addCredit: "Add Credit",
      addVideo: "Add Video",
      addLink: "Add Link",
      addAward: "Add Award",
      remove: "Remove",
      cancel: "Cancel",
      createPerson: "Create New Person",
    },
    errors: {
      TITLE_REQUIRED: "Title is required",
      TITLE_TOO_LONG: "Title must be 200 characters or less",
      SYNOPSIS_TOO_LONG: "Synopsis must be 5000 characters or less",
      INVALID_YEAR: "Invalid year",
      INVALID_DURATION: "Duration must be between 1 and 600 minutes",
      PLAY_TYPE_REQUIRED: "Play type is required",
      FORMAT_REQUIRED: "Format is required",
      PLAYWRIGHT_OR_DIRECTOR_REQUIRED:
        "At least one playwright or director is required",
      PERSON_REQUIRED: "Person is required",
      ROLE_REQUIRED: "Role is required",
      INVALID_URL: "Invalid URL",
      INVALID_EMAIL: "Invalid email address",
      INPUT_LANGUAGE_REQUIRED: "Please select the language you used",
      TERMS_REQUIRED: "You must accept the terms to submit",
      RATE_LIMIT_EXCEEDED: "Too many submissions. Please try again later.",
      RECAPTCHA_FAILED: "Security verification failed. Please try again.",
      SUBMISSION_FAILED: "Submission failed. Please try again.",
    },
    tooltips: {
      originalTitle:
        "If the play has a different original title (e.g., in another language)",
      basedOn: "For adaptations or translations, what work is this based on?",
      inputLanguage:
        "The language you used to fill this form. We will handle translations after review.",
    },
    placeholders: {
      title: "Enter the play title",
      synopsis: "A brief description of the play...",
      searchPerson: "Search for a person...",
      videoUrl: "https://youtube.com/watch?v=...",
    },
    success: {
      title: "Thank You!",
      message:
        "Your submission has been received and will be reviewed by our team. We appreciate your contribution to documenting Tunisian theatre.",
      submitAnother: "Submit Another Play",
    },
  }

  return (
    <main className="bg-tiween-green min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">
            Contribute a Play
          </h1>
          <p className="mx-auto max-w-2xl text-white/70">
            Help us document Tunisian theatre by submitting information about a
            play. Your contribution will be reviewed before publication.
          </p>
        </div>

        {/* Wizard */}
        <PlayContributionWizard labels={labels} />
      </div>
    </main>
  )
}
