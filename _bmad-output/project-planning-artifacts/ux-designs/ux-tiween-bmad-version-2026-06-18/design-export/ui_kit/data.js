/* Fake seed data + a few helpers for the Venues Admin UI kit. Plain JS, attaches
   to window so the Babel-transpiled App can read it. No real backend. */
;(function () {
  const TYPES = [
    { value: "cinema", label: "Cinéma" },
    { value: "theatre", label: "Théâtre" },
    { value: "musee", label: "Musée" },
    { value: "centre", label: "Centre culturel" },
    { value: "salle", label: "Salle de concert" },
  ]
  const CITIES = [
    { value: "tunis", label: "Tunis" },
    { value: "carthage", label: "Carthage" },
    { value: "sousse", label: "Sousse" },
    { value: "sfax", label: "Sfax" },
  ]
  const VENUES = [
    {
      id: "v1",
      name: "CinéMadart",
      slug: "cinemadart",
      city: "carthage",
      type: "cinema",
      status: "pending",
      capacity: 320,
      address: "15 Avenue Habib Bourguiba, Carthage",
      phone: "+216 71 000 000",
      email: "contact@cinemadart.tn",
      pmr: true,
      salles: 4,
      clim: true,
    },
    {
      id: "v2",
      name: "Théâtre Municipal",
      slug: "theatre-municipal",
      city: "tunis",
      type: "theatre",
      status: "approved",
      capacity: 800,
      address: "2 Rue de Grèce, Tunis",
      phone: "+216 71 259 499",
      email: "contact@theatre.tn",
      pmr: true,
      salles: 1,
      clim: true,
    },
    {
      id: "v3",
      name: "Centre Culturel B'chira",
      slug: "bchira",
      city: "tunis",
      type: "centre",
      status: "approved",
      capacity: 150,
      address: "La Marsa, Tunis",
      phone: "+216 71 740 111",
      email: "art@bchira.tn",
      pmr: false,
      salles: 3,
      clim: false,
    },
    {
      id: "v4",
      name: "Musée du Bardo",
      slug: "bardo",
      city: "tunis",
      type: "musee",
      status: "suspended",
      capacity: null,
      address: "Le Bardo, Tunis",
      phone: "+216 71 513 650",
      email: "info@bardomuseum.tn",
      pmr: true,
      salles: 12,
      clim: true,
    },
    {
      id: "v5",
      name: "Théâtre de l'Étoile du Nord",
      slug: "etoile-nord",
      city: "tunis",
      type: "theatre",
      status: "pending",
      capacity: 240,
      address: "Avenue de Paris, Tunis",
      phone: "+216 71 333 222",
      email: "etoile@nord.tn",
      pmr: false,
      salles: 1,
      clim: true,
    },
    {
      id: "v6",
      name: "Acropolium de Carthage",
      slug: "acropolium",
      city: "carthage",
      type: "salle",
      status: "approved",
      capacity: 400,
      address: "Colline de Byrsa, Carthage",
      phone: "+216 71 730 000",
      email: "acropolium@carthage.tn",
      pmr: true,
      salles: 1,
      clim: false,
    },
  ]
  // Property vocabulary (S2): categories → definitions
  const CATEGORIES = [
    { id: "c1", name: "Accessibilité", sortOrder: 1, parent: null },
    { id: "c2", name: "Équipements", sortOrder: 2, parent: null },
    { id: "c3", name: "Audio / Vidéo", sortOrder: 1, parent: "c2" },
  ]
  const DEFINITIONS = [
    {
      id: "d1",
      name: "Accès PMR",
      category: "c1",
      type: "boolean",
      key: "pmr",
    },
    { id: "d2", name: "Boucle magnétique", category: "c1", type: "boolean" },
    {
      id: "d3",
      name: "Nombre de salles",
      category: "c2",
      type: "integer",
      key: "salles",
    },
    {
      id: "d4",
      name: "Climatisation",
      category: "c2",
      type: "boolean",
      key: "clim",
    },
    {
      id: "d5",
      name: "Type d'écran",
      category: "c3",
      type: "enum",
      enumOptions: ["Standard", "IMAX", "4DX"],
    },
  ]

  window.VENUES_DATA = { TYPES, CITIES, VENUES, CATEGORIES, DEFINITIONS }

  window.labelFor = function (list, value) {
    const o = list.find((x) => x.value === value)
    return o ? o.label : "—"
  }
  window.slugify = function (s) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }
})()
