"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import { NewsletterSubscribeForm } from "./NewsletterSubscribeForm"

export function ComingBackLanding() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance animations after mount
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="bg-background relative min-h-screen overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════
          ATMOSPHERIC BACKGROUND LAYERS
          Multiple layered effects create depth and cinematic mood
      ═══════════════════════════════════════════════════════════════ */}

      {/* Base ambient glow - soft yellow light from above */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 60% at 50% -20%, rgba(248, 235, 6, 0.07) 0%, transparent 50%),
            radial-gradient(ellipse 80% 40% at 30% 10%, rgba(248, 235, 6, 0.04) 0%, transparent 40%),
            radial-gradient(ellipse 60% 30% at 70% 5%, rgba(248, 235, 6, 0.03) 0%, transparent 35%)
          `,
        }}
      />

      {/* Subtle vignette for focus */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, rgba(3, 37, 35, 0.4) 100%)",
        }}
      />

      {/* Film grain texture - adds organic quality */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Gentle pulsing ambient light - represents hope/breathing */}
      <div
        className="animate-ambient-pulse pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 30% at 50% 30%, rgba(248, 235, 6, 0.02) 0%, transparent 70%)",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════════════ */}

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20 md:px-8 lg:py-28">
        <div className="w-full max-w-2xl">
          {/* ─────────────────────────────────────────────────────────────
              LOGO WITH THEATRICAL REVEAL
          ───────────────────────────────────────────────────────────── */}
          <div
            className={`mb-20 flex justify-center transition-all duration-1000 ease-out md:mb-24 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "-translate-y-8 opacity-0"
            }`}
          >
            <div className="relative">
              {/* Multi-layered glow effect */}
              <div
                className="absolute -inset-12 animate-pulse opacity-30 blur-3xl"
                style={{
                  backgroundColor: "#F8EB06",
                  animationDuration: "4s",
                }}
              />
              <div
                className="absolute -inset-6 opacity-15 blur-xl"
                style={{ backgroundColor: "#F8EB06" }}
              />
              <Image
                src="/images/logo.svg"
                alt="Tiween"
                width={160}
                height={46}
                className="relative brightness-0 drop-shadow-lg invert"
                priority
              />
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              MESSAGE SECTIONS WITH STAGGERED REVEALS
          ───────────────────────────────────────────────────────────── */}
          <div className="space-y-16 md:space-y-20">
            {/* ═══ FRENCH SECTION ═══ */}
            <section
              dir="ltr"
              lang="fr"
              className={`text-center transition-all delay-200 duration-1000 ease-out ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-12 opacity-0"
              }`}
            >
              <h2 className="font-display mb-8 text-3xl tracking-wide text-white md:text-4xl">
                Un message personnel
              </h2>
              <div className="mx-auto max-w-xl space-y-5 text-base leading-relaxed text-white/75 md:text-lg md:leading-relaxed">
                <p>
                  Depuis le début de Tiween, je suis resté dans l&apos;ombre.
                  Beaucoup d&apos;entre vous ont soutenu ce projet sans jamais
                  savoir qui était derrière. Aujourd&apos;hui, je sors de cette
                  ombre pour vous parler directement.
                </p>
                <p>
                  Ces derniers mois ont été difficiles. Ma santé mentale
                  m&apos;a obligé à faire une pause. J&apos;ai dû prendre du
                  recul, me soigner, et accepter que parfois, il faut savoir
                  s&apos;arrêter.
                </p>
                <p>
                  Aujourd&apos;hui, je vais mieux. Pas parfaitement, mais mieux.
                  Et je reprends doucement le travail sur Tiween. Une nouvelle
                  version arrive.
                </p>
                <p>
                  Merci à tous ceux qui ont attendu. Merci à ceux qui ont cru en
                  ce projet.
                </p>
                <p className="pt-4 font-medium text-white/50">— Ayoub</p>
              </div>
            </section>

            {/* Decorative separator with reveal */}
            <div
              className={`flex items-center justify-center gap-4 transition-all delay-500 duration-700 ease-out ${
                isVisible ? "scale-100 opacity-100" : "scale-75 opacity-0"
              }`}
            >
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/15 to-white/25" />
              <div className="relative">
                <div
                  className="absolute -inset-2 animate-pulse opacity-40 blur-md"
                  style={{
                    backgroundColor: "#F8EB06",
                    animationDuration: "3s",
                  }}
                />
                <div
                  className="relative h-2 w-2 rounded-full"
                  style={{ backgroundColor: "#F8EB06" }}
                />
              </div>
              <div className="h-px w-16 bg-gradient-to-l from-transparent via-white/15 to-white/25" />
            </div>

            {/* ═══ ARABIC SECTION ═══ */}
            <section
              dir="rtl"
              lang="ar"
              className={`font-arabic text-center transition-all delay-500 duration-1000 ease-out ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-12 opacity-0"
              }`}
            >
              <h2 className="mb-8 text-3xl tracking-wide text-white md:text-4xl">
                رسالة شخصية
              </h2>
              <div className="mx-auto max-w-xl space-y-5 text-base leading-loose text-white/75 md:text-lg md:leading-loose">
                <p>
                  منذ بداية تيوين، بقيت في الظل. كثيرون منكم دعموا هذا المشروع
                  دون أن يعرفوا من يقف وراءه. اليوم، أخرج من هذا الظل لأتحدث
                  إليكم مباشرة.
                </p>
                <p>
                  الأشهر الماضية كانت صعبة. صحتي النفسية أجبرتني على التوقف. كان
                  علي أن أتراجع، أن أعتني بنفسي، وأن أقبل أنه أحياناً يجب أن
                  نتوقف.
                </p>
                <p>
                  اليوم، أنا أفضل. ليس تماماً، لكن أفضل. وأعود ببطء للعمل على
                  تيوين. نسخة جديدة قادمة.
                </p>
                <p>شكراً لكل من انتظر. شكراً لكل من آمن بهذا المشروع.</p>
                <p className="pt-4 font-medium text-white/50">— أيوب</p>
              </div>
            </section>

            {/* Decorative separator with reveal */}
            <div
              className={`flex items-center justify-center gap-4 transition-all delay-700 duration-700 ease-out ${
                isVisible ? "scale-100 opacity-100" : "scale-75 opacity-0"
              }`}
            >
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/15 to-white/25" />
              <div className="relative">
                <div
                  className="absolute -inset-2 animate-pulse opacity-40 blur-md"
                  style={{
                    backgroundColor: "#F8EB06",
                    animationDuration: "3s",
                  }}
                />
                <div
                  className="relative h-2 w-2 rounded-full"
                  style={{ backgroundColor: "#F8EB06" }}
                />
              </div>
              <div className="h-px w-16 bg-gradient-to-l from-transparent via-white/15 to-white/25" />
            </div>

            {/* ═══ ENGLISH SECTION ═══ */}
            <section
              dir="ltr"
              lang="en"
              className={`text-center transition-all delay-700 duration-1000 ease-out ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-12 opacity-0"
              }`}
            >
              <h2 className="font-display mb-8 text-3xl tracking-wide text-white md:text-4xl">
                A Personal Message
              </h2>
              <div className="mx-auto max-w-xl space-y-5 text-base leading-relaxed text-white/75 md:text-lg md:leading-relaxed">
                <p>
                  Since Tiween began, I&apos;ve stayed in the shadows. Many of
                  you supported this project without ever knowing who was behind
                  it. Today, I&apos;m stepping out to speak to you directly.
                </p>
                <p>
                  These past months have been hard. My mental health forced me
                  to pause. I had to step back, take care of myself, and accept
                  that sometimes you need to stop.
                </p>
                <p>
                  Today, I&apos;m better. Not perfect, but better. And I&apos;m
                  slowly getting back to work on Tiween. A new version is
                  coming.
                </p>
                <p>
                  Thank you to everyone who waited. Thank you to those who
                  believed.
                </p>
                <p className="pt-4 font-medium text-white/50">— Ayoub</p>
              </div>
            </section>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              NEWSLETTER FORM - Final reveal with prominence
          ───────────────────────────────────────────────────────────── */}
          <div
            className={`mt-24 transition-all delay-1000 duration-1000 ease-out md:mt-28 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-16 opacity-0"
            }`}
          >
            <div className="mx-auto max-w-md">
              {/* Subtle decorative line above form */}
              <div className="mb-10 flex items-center justify-center">
                <div className="h-px w-24 bg-gradient-to-r from-transparent to-white/10" />
                <div className="mx-4 h-1 w-1 rounded-full bg-white/20" />
                <div className="h-px w-24 bg-gradient-to-l from-transparent to-white/10" />
              </div>

              <p className="mb-8 text-center text-sm tracking-wide text-white/40 uppercase">
                Be the first to know when we&apos;re back
              </p>
              <NewsletterSubscribeForm />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom atmospheric fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{
          background:
            "linear-gradient(to top, hsl(169 79% 8%) 0%, transparent 100%)",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════
          CUSTOM STYLES - Ambient animation
      ═══════════════════════════════════════════════════════════════ */}
      <style jsx>{`
        @keyframes ambient-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
        .animate-ambient-pulse {
          animation: ambient-pulse 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
