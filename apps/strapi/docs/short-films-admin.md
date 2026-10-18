# Short films: admin guide

How an operator enters, translates and publishes a short film in the Strapi
admin. Short films feed the public short-film directory
(see [short-films-api.md](./short-films-api.md) for the read API they appear in).

**Last updated:** 2026-10-18 (plan 01-09)

## Who can enter short films

Strapi admins only (D-21). Venue managers use
the venue dashboard, which no longer accepts the type "short film": a crafted
request is refused with `WORK_TYPE_INVALID`. Venue managers can still schedule a
short film that an admin entered.

## Where

Strapi admin, **Events Manager**, **Works**, **Add a work**, then choose the type
**Short film**. To change an existing short film, open it from the Works list.

## Fields

Everything below is on the default-language (French) tab. The sections shown
depend on the type (D-17).

| Field                    | Applies to       | What to enter                                                                                                                                     |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title, Original title    | all              | Title is required. Original title is optional and is not translated.                                                                              |
| Slug                     | all              | The address of the film (`/shorts/<slug>`). Leave it blank: it is generated from the title when you save. `featured` is reserved.                 |
| Duration (min)           | all              | Whole minutes. Over 40 gives a warning, never a block.                                                                                            |
| Release year, Age rating | all              | Optional.                                                                                                                                         |
| Genres                   | all              | Pick from the genre list.                                                                                                                         |
| Synopsis                 | all              | Plain text, translated per language on the other tabs.                                                                                            |
| Poster                   | all              | Chosen from the media library (real upload). Required to publish a short film.                                                                    |
| Countries, Languages     | all (D-17, D-18) | Searchable pickers. Tunisia and Tunisian Arabic are listed first. "No dialogue" replaces any other language.                                      |
| Credits                  | all              | Person plus role. A short film needs at least one credit whose role is **Director**.                                                              |
| Cast, Distinctions       | all              | Optional.                                                                                                                                         |
| Videos                   | all              | A video of type **trailer** counts as a place to watch (festival films with a trailer only). Full-length videos mark the film available online.   |
| Where to watch           | short film only  | One row per official place to watch: platform, link, access type. Official channels only, no re-uploads (D-16). Links must start with `https://`. |
| Directory placement      | short film only  | **Featured** pins the film to the featured list; **Featured rank** orders it (1 first). The rank is cleared when Featured is off (D-05).          |

Save as often as you like: drafts are not held to the publish rules. (Country and
language codes and link formats are still checked on every save.)

## Translating (French, Arabic, English)

The tabs above the form list the languages configured in the admin (French
first). Each tab shows the state of that language: **Missing** (no translation
yet), **Draft**, **Published** or **Modified** (published, then edited).

- The French tab is the full form. Everything shared across languages (slug,
  duration, countries, credits, links, placement) is edited only there.
- The Arabic and English tabs edit only **Title**, **Synopsis** and **Poster**.
  The French title is shown as a hint, and for a language with no entry yet the
  poster starts as the French one. Type the title and press **Save**: that
  creates the translation.
- Creating a translation of a film with credits also gives each credited
  person, role and character an entry in that language (a copy of the French
  name). This is automatic; it is how Strapi links the credits across languages.
- Save a tab before switching to another one: unsaved changes on a tab are lost
  when you leave it.
- The slug only exists on the French entry; Arabic and English pages use it.

**Branch shipped (D-22):** the tabs create the translation rows themselves. The
native Content Manager fallback is not needed (spike A3 confirmed that saving a
missing language creates it). Translating a film with credits directly in the
native Content Manager fails with "locale not found" until its people and roles
have an entry in that language, so translate from the Works form.

## Publishing

The bar above the form shows the status of the language you are on and has
**Publish** and **Unpublish** for that language only. Publishing French does
not publish Arabic or English: publish each tab. Until a translation is
published the public site shows the French text.

For a short film the bar checks the saved French draft first (D-19) and lists
what is missing. **Publish stays disabled until the list is empty.** The check is
advisory: the server repeats it on every publish, from any screen, so an
incomplete film can never go live. Save your changes before publishing: the
check reads the saved draft, not what is on screen.

| Message                                                                         | What to do                                                                 |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Add a slug before publishing                                                    | Save once with a title, or type a slug.                                    |
| This slug is reserved, choose another one                                       | Do not use `featured`.                                                     |
| Add a poster before publishing                                                  | Choose a poster from the media library on the French tab and save.         |
| Add at least one director credit                                                | Add a credit with the **Director** role.                                   |
| Publish the director's person record first                                      | Open the person and publish it, then publish the film.                     |
| Add a streaming link or a trailer video                                         | Add a row under Where to watch, or a video of type trailer.                |
| Longer than 40 minutes: check this is a short film                              | A warning only. Publishing is still allowed.                               |
| One of the countries is not a valid ISO code                                    | Re-pick the countries from the list.                                       |
| One of the languages is not in the list                                         | Re-pick the languages from the list.                                       |
| A streaming link must start with https://                                       | Fix the link under Where to watch.                                         |
| The people, roles or characters credited ... have no entry in this language yet | Save the translation again; if it keeps failing, report it to a developer. |

The same sentences appear when the server refuses a save or a publish. If you
see "Publishing failed" with no detail, reload and try again; if it repeats,
report it with the time and the film.

## Things to know

- **The launch import** can publish films without a poster (D-20). That exception
  exists only inside the import script; the admin never offers it, so a film
  entered here always needs a poster.
- **Two admins editing the same film**: the last save wins. Publishing always
  checks the stored draft, so an edit made while you publish cannot slip an
  unchecked state live.
- **Bulk publish** in the native Content Manager list is not all-or-nothing: with
  a mixed selection the screen reports an error while some films may still have
  been published. Publish short films one by one from the Works form.
