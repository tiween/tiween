---
quick_id: 261024-iy3
mockup_status: not-applicable
mockup_waiver: "storage-path change only; no UI"
mockups: []
---

# Experience: Mirror Strapi Media Library folders in ImageKit uploads

No user-facing or data-entry screen changes. Editors keep using the stock Strapi Media
Library; only the ImageKit storage path of new uploads changes.

## Flows

1. Editor uploads a file into Media Library folder `Short films > Posters`: ImageKit stores it at
   `<root>/<env>/short-films/posters/<hash><ext>`; thumbnail and formats go to the same folder.
2. Editor uploads at the Media Library root: the file goes to `<root>/<env>/unsorted/`.
3. Editor replaces a file's media: the new file goes to the folder its Media Library record is in.
4. `seed:shorts` imports a film: the poster goes to `Short films > Posters` and the backdrop to
   `Short films > Backdrops` (folders created once, reused after that).

## States

- Success: the stored URL contains the mirrored path.
- Folder names cannot be resolved (DB error, folder deleted mid-upload): the file goes to `unsorted`
  with a warning in the server log. The upload itself still succeeds.
- ImageKit refuses the upload: same failure surface as today (upload error). The log line and
  rejection carry a status and safe message only, never a credential.

## Copy

No UI copy. Server log lines only (English, one line, no secrets).

## Known boundary

Placement happens at upload time. Moving or renaming a Media Library folder later does not move
files already stored in ImageKit.
