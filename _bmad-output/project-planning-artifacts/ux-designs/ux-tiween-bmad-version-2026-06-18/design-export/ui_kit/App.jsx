/* Venues Plugin Admin — interactive UI kit. Composes the design-system primitives
   from window.StrapiDSVenuesPluginAdmin_1054bf. Fake data, no backend.
   SOURCE: claude.ai/design/p/1054bff7-5f5f-4489-97e3-54129a48639d (exported 2026-06-19).
   This is the AUTHORITATIVE behavioral reference for stories 2D.2 (S0/S1), 2D.3 (S2),
   2D.4 (S3). It is cosmetic — replace the custom DS bundle with real @strapi/design-system
   imports per handoff/ds-component-binding.md. See ../MANIFEST.md for reconciliation notes. */
const DS = window.StrapiDSVenuesPluginAdmin_1054bf
const {
  Button,
  IconButton,
  Badge,
  StatusBadge,
  Loader,
  EmptyStateLayout,
  Field,
  TextInput,
  NumberInput,
  Textarea,
  SingleSelect,
  Toggle,
  Checkbox,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  Dialog,
  Accordion,
  AccordionItem,
  Tabs,
  SideNav,
  SideNavSection,
  SideNavLink,
} = DS
const { TYPES, CITIES, VENUES, CATEGORIES, DEFINITIONS } = window.VENUES_DATA

const Icon = ({ name, size = 16, color }) => (
  <span
    aria-hidden
    style={{
      display: "inline-block",
      width: size,
      height: size,
      background: color || "currentColor",
      flex: "none",
      WebkitMask: `url(../../assets/icons/${name}.svg) center/contain no-repeat`,
      mask: `url(../../assets/icons/${name}.svg) center/contain no-repeat`,
    }}
  />
)

/* ---------------------------------------------------------------- Toast */
function useToast() {
  const [toast, setToast] = React.useState(null)
  const show = (message, type = "success") => {
    setToast({ message, type })
    clearTimeout(useToast._t)
    useToast._t = setTimeout(() => setToast(null), 2600)
  }
  return [toast, show]
}
function Toast({ toast }) {
  if (!toast) return null
  const color =
    toast.type === "danger"
      ? "var(--colors-danger600)"
      : toast.type === "warning"
        ? "var(--colors-warning600)"
        : "var(--colors-success600)"
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 700,
        background: "var(--colors-neutral0)",
        border: "1px solid var(--colors-neutral150)",
        borderLeft: `4px solid ${color}`,
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-popup)",
        padding: "12px 16px",
        font: "var(--text-omega)",
        color: "var(--colors-neutral800)",
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}
    >
      <Icon
        name={toast.type === "success" ? "Check" : "WarningCircle"}
        color={color}
      />
      {toast.message}
    </div>
  )
}

/* ---------------------------------------------------------- Shell chrome */
function Header({ title, subtitle, action }) {
  return (
    <div
      style={{
        background: "var(--colors-neutral0)",
        borderBottom: "1px solid var(--colors-neutral150)",
        padding: "24px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
      }}
    >
      <div>
        <h1
          style={{
            font: "var(--text-alpha)",
            color: "var(--colors-neutral800)",
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              font: "var(--text-omega)",
              color: "var(--colors-neutral600)",
              margin: "4px 0 0",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

/* ----------------------------------------------------------- Map picker */
function MapPicker({ address }) {
  const [located, setLocated] = React.useState(false)
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <Field label="Adresse">
            <TextInput
              defaultValue={address}
              placeholder="15 Avenue Habib Bourguiba, Carthage"
            />
          </Field>
        </div>
        <div style={{ alignSelf: "flex-end" }}>
          <Button
            variant="secondary"
            startIcon={<Icon name="PinMap" />}
            onClick={() => setLocated(true)}
          >
            Localiser
          </Button>
        </div>
      </div>
      <div
        style={{
          position: "relative",
          height: 180,
          borderRadius: "var(--radius)",
          overflow: "hidden",
          border: "1px solid var(--colors-neutral200)",
          background:
            "repeating-linear-gradient(45deg,#eef1f6,#eef1f6 16px,#e6eaf2 16px,#e6eaf2 32px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 52% 46%, rgba(73,69,255,.08), transparent 60%)",
          }}
        />
        {located && (
          <span
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%,-100%)",
              color: "var(--colors-danger600)",
            }}
          >
            <Icon name="PinMap" size={28} />
          </span>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 12,
            font: "var(--text-pi)",
            color: "var(--colors-neutral600)",
            background: "rgba(255,255,255,.85)",
            padding: "4px 8px",
            borderRadius: 4,
          }}
        >
          {located
            ? "Glissez l’épingle pour corriger la position"
            : "Cliquez sur « Localiser » pour géocoder l’adresse"}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------- Property-value editor (S3) */
function PropertiesEditor({ venue }) {
  const cats = CATEGORIES.filter((c) => !c.parent).sort(
    (a, b) => a.sortOrder - b.sortOrder
  )
  return (
    <Accordion>
      {cats.map((cat) => {
        const childCats = CATEGORIES.filter((c) => c.parent === cat.id)
        const ids = [cat.id, ...childCats.map((c) => c.id)]
        const defs = DEFINITIONS.filter((d) => ids.includes(d.category))
        return (
          <AccordionItem
            key={cat.id}
            title={cat.name}
            icon={<Icon name="Cog" />}
            count={defs.length}
            defaultOpen={cat.id === "c1"}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {defs.map((d) => (
                <PropRow key={d.id} def={d} venue={venue} />
              ))}
            </div>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
function PropRow({ def, venue }) {
  const initial = def.key
    ? venue[def.key]
    : def.type === "boolean"
      ? false
      : def.type === "integer"
        ? 0
        : ""
  const [val, setVal] = React.useState(initial)
  let input
  if (def.type === "boolean")
    input = <Toggle checked={!!val} onChange={setVal} />
  else if (def.type === "integer")
    input = (
      <NumberInput
        value={val ?? 0}
        onChange={(e) => setVal(e.target.value)}
        style={{ maxWidth: 120 }}
      />
    )
  else if (def.type === "enum")
    input = (
      <SingleSelect
        value={val}
        onChange={setVal}
        placeholder="—"
        options={def.enumOptions.map((o) => ({ value: o, label: o }))}
      />
    )
  else
    input = <TextInput value={val} onChange={(e) => setVal(e.target.value)} />
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 220px 32px",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span
        style={{ font: "var(--text-omega)", color: "var(--colors-neutral800)" }}
      >
        {def.name}
      </span>
      <div>{input}</div>
      <IconButton label={`Retirer ${def.name}`} variant="danger">
        <Icon name="Trash" />
      </IconButton>
    </div>
  )
}

/* ------------------------------------------------------- Venue form (S1) */
function VenueForm({ venue, canManageAll, onClose, onSave }) {
  const isEdit = !!venue
  const [name, setName] = React.useState(venue?.name || "")
  const [slug, setSlug] = React.useState(venue?.slug || "")
  const [slugTouched, setSlugTouched] = React.useState(isEdit)
  const [type, setType] = React.useState(venue?.type || "")
  const [status, setStatus] = React.useState(venue?.status || "pending")
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState({})

  React.useEffect(() => {
    if (!slugTouched) setSlug(window.slugify(name))
  }, [name, slugTouched])

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!name.trim()) next.name = "Le nom est requis."
    if (!type) next.type = "Le type est requis."
    setErr(next)
    if (Object.keys(next).length) return
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      onSave(isEdit ? `Lieu modifié.` : "Lieu créé.")
    }, 650)
  }

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 28 }}>
      <h3
        style={{
          font: "var(--text-beta)",
          color: "var(--colors-neutral800)",
          margin: "0 0 14px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
  const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }

  return (
    <Modal
      title={isEdit ? `Modifier ${venue.name}` : "Nouveau lieu"}
      onClose={onClose}
      footer={
        <>
          <Button variant="tertiary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={saving} onClick={submit}>
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <Section title="Informations générales">
          <div style={grid}>
            <Field label="Nom du lieu" required error={err.name}>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="CinéMadart"
              />
            </Field>
            <Field label="Slug" hint="Généré depuis le nom, modifiable">
              <TextInput
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setSlugTouched(true)
                }}
              />
            </Field>
            <Field label="Type" required error={err.type}>
              <SingleSelect
                value={type}
                onChange={setType}
                placeholder="Sélectionner…"
                options={TYPES}
              />
            </Field>
            <Field
              label="Statut"
              hint={
                !canManageAll
                  ? "Seuls les admins modifient le statut"
                  : undefined
              }
            >
              <SingleSelect
                value={status}
                onChange={setStatus}
                disabled={!canManageAll}
                options={[
                  { value: "pending", label: "En attente" },
                  { value: "approved", label: "Approuvé" },
                  { value: "suspended", label: "Suspendu" },
                ]}
              />
            </Field>
          </div>
        </Section>

        <Section title="Localisation">
          <MapPicker address={venue?.address} />
          <div style={{ marginTop: 16, maxWidth: "50%" }}>
            <Field label="Ville">
              <SingleSelect
                value={venue?.city || ""}
                onChange={() => {}}
                placeholder="Sélectionner…"
                options={CITIES}
              />
            </Field>
          </div>
        </Section>

        <Section title="Contact">
          <div style={grid}>
            <Field label="Téléphone">
              <TextInput defaultValue={venue?.phone} placeholder="+216 …" />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                defaultValue={venue?.email}
                placeholder="contact@…"
              />
            </Field>
            <Field label="Site web">
              <TextInput type="url" placeholder="https://…" />
            </Field>
            <Field label="Capacité">
              <NumberInput
                defaultValue={venue?.capacity ?? ""}
                placeholder="0"
              />
            </Field>
          </div>
        </Section>

        <Section title="Médias">
          <div style={{ display: "flex", gap: 12 }}>
            <UploadSlot label="Logo (1)" />
            <UploadSlot label="Galerie (plusieurs)" wide />
          </div>
        </Section>

        <Section title="Propriétés">
          <PropertiesEditor venue={venue || {}} />
        </Section>
      </form>
    </Modal>
  )
}
function UploadSlot({ label, wide }) {
  return (
    <div
      style={{
        flex: wide ? 2 : 1,
        height: 96,
        border: "1px dashed var(--colors-neutral300)",
        borderRadius: "var(--radius)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        color: "var(--colors-neutral500)",
        font: "var(--text-pi)",
        background: "var(--colors-neutral100)",
      }}
    >
      <Icon name="CloudUpload" size={20} />
      {label}
    </div>
  )
}

/* ----------------------------------------------------------- Venues list (S1) */
function VenuesList({ canManageAll, onEdit, onCreate, toast }) {
  const data = canManageAll ? VENUES : VENUES.filter((v) => v.id === "v1")
  const [q, setQ] = React.useState("")
  const [fStatus, setFStatus] = React.useState("")
  const [fType, setFType] = React.useState("")
  const [sortDir, setSortDir] = React.useState("ASC")
  const [sel, setSel] = React.useState(() => new Set())
  const [confirm, setConfirm] = React.useState(null)

  let rows = data.filter(
    (v) =>
      (!q ||
        v.name.toLowerCase().includes(q.toLowerCase()) ||
        v.address.toLowerCase().includes(q.toLowerCase())) &&
      (!fStatus || v.status === fStatus) &&
      (!fType || v.type === fType)
  )
  rows = [...rows].sort((a, b) =>
    sortDir === "ASC"
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name)
  )

  const allChecked = rows.length > 0 && rows.every((r) => sel.has(r.id))
  const someChecked = rows.some((r) => sel.has(r.id))
  const toggleAll = () =>
    setSel(allChecked ? new Set() : new Set(rows.map((r) => r.id)))
  const toggleOne = (id) =>
    setSel((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const doBulkDelete = () => {
    setConfirm(null)
    setSel(new Set())
    toast(
      `${sel.size} lieu${sel.size > 1 ? "x" : ""} supprimé${sel.size > 1 ? "s" : ""}.`
    )
  }

  return (
    <div>
      <Header
        title="Lieux"
        subtitle={canManageAll ? `${data.length} lieux` : "Votre lieu"}
        action={
          canManageAll && (
            <Button startIcon={<Icon name="Plus" />} onClick={onCreate}>
              Nouveau lieu
            </Button>
          )
        }
      />
      <div style={{ padding: "24px 32px" }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--colors-neutral500)",
              }}
            >
              <Icon name="Search" />
            </span>
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un lieu…"
              style={{ paddingLeft: 38 }}
            />
          </div>
          <div style={{ minWidth: 150 }}>
            <SingleSelect
              value={fStatus}
              onChange={setFStatus}
              placeholder="Statut : tous"
              options={[
                { value: "pending", label: "En attente" },
                { value: "approved", label: "Approuvé" },
                { value: "suspended", label: "Suspendu" },
              ]}
            />
          </div>
          <div style={{ minWidth: 150 }}>
            <SingleSelect
              value={fType}
              onChange={setFType}
              placeholder="Type : tous"
              options={TYPES}
            />
          </div>
        </div>

        {someChecked && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
              padding: "8px 12px",
              background: "var(--colors-primary100)",
              borderRadius: "var(--radius)",
            }}
          >
            <span
              style={{
                font: "var(--text-omega)",
                color: "var(--colors-primary700)",
                fontWeight: 600,
              }}
            >
              {sel.size} sélectionné{sel.size > 1 ? "s" : ""}
            </span>
            <Button
              size="S"
              variant="danger-light"
              startIcon={<Icon name="Trash" />}
              onClick={() => setConfirm("bulk")}
            >
              Supprimer
            </Button>
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyStateLayout
            icon={
              <img src="../../assets/illustrations/EmptyDocuments.svg" alt="" />
            }
            content="Aucun lieu ne correspond à votre recherche."
            action={
              canManageAll && (
                <Button startIcon={<Icon name="Plus" />} onClick={onCreate}>
                  Créer un lieu
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked && !allChecked}
                    onChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </Th>
                <Th onSort={setSortDir} direction={sortDir}>
                  Nom
                </Th>
                <Th>Ville</Th>
                <Th>Type</Th>
                <Th>Statut</Th>
                <Th>Capacité</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((v) => (
                <Tr key={v.id} onClick={() => onEdit(v)}>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={sel.has(v.id)}
                      onChange={() => toggleOne(v.id)}
                      aria-label={`Sélectionner ${v.name}`}
                    />
                  </Td>
                  <Td>
                    <span style={{ fontWeight: 600 }}>{v.name}</span>
                  </Td>
                  <Td>{window.labelFor(CITIES, v.city)}</Td>
                  <Td>{window.labelFor(TYPES, v.type)}</Td>
                  <Td>
                    <StatusBadge status={v.status} />
                  </Td>
                  <Td>{v.capacity ?? "—"}</Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      <IconButton
                        label="Modifier"
                        bordered
                        onClick={() => onEdit(v)}
                      >
                        <Icon name="Pencil" />
                      </IconButton>
                      <IconButton
                        label="Supprimer"
                        variant="danger"
                        bordered
                        onClick={() => setConfirm(v.id)}
                      >
                        <Icon name="Trash" />
                      </IconButton>
                    </span>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {confirm && (
        <Dialog
          title="Confirmation"
          variant="danger"
          confirmLabel="Supprimer"
          onClose={() => setConfirm(null)}
          onConfirm={
            confirm === "bulk"
              ? doBulkDelete
              : () => {
                  setConfirm(null)
                  toast("Lieu supprimé.")
                }
          }
        >
          {confirm === "bulk"
            ? `Supprimer ${sel.size} lieu${sel.size > 1 ? "x" : ""} ? Cette action est irréversible.`
            : "Supprimer ce lieu ? Cette action est irréversible."}
        </Dialog>
      )}
    </div>
  )
}

/* ------------------------------------------------- Property authoring (S2) */
function PropertiesPage() {
  const [tab, setTab] = React.useState("cat")
  return (
    <div>
      <Header
        title="Propriétés"
        subtitle="Vocabulaire des catégories et définitions"
      />
      <div style={{ padding: "20px 32px" }}>
        <div style={{ marginBottom: 20 }}>
          <Tabs
            tabs={[
              { id: "cat", label: "Catégories" },
              { id: "def", label: "Définitions" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        {tab === "cat" ? <CategoryTree /> : <DefinitionsList />}
      </div>
    </div>
  )
}
function CategoryTree() {
  const roots = CATEGORIES.filter((c) => !c.parent)
  const Row = ({ cat, child }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px",
        background: "var(--colors-neutral0)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--colors-neutral200)",
        marginBottom: 8,
        marginLeft: child ? 32 : 0,
        borderLeft: child
          ? "3px solid var(--colors-primary600)"
          : "1px solid var(--colors-neutral200)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="Drag" color="var(--colors-neutral400)" />
        <span
          style={{
            font: "var(--text-omega)",
            fontWeight: 600,
            color: "var(--colors-neutral800)",
          }}
        >
          {cat.name}
        </span>
        <Badge variant="neutral">
          {DEFINITIONS.filter((d) => d.category === cat.id).length} déf.
        </Badge>
      </span>
      <span style={{ display: "inline-flex", gap: 6 }}>
        <IconButton label="Modifier" bordered>
          <Icon name="Pencil" />
        </IconButton>
        <IconButton label="Supprimer" variant="danger" bordered>
          <Icon name="Trash" />
        </IconButton>
      </span>
    </div>
  )
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <Button variant="secondary" startIcon={<Icon name="Plus" />}>
          Nouvelle catégorie
        </Button>
      </div>
      {roots.map((c) => (
        <React.Fragment key={c.id}>
          <Row cat={c} />
          {CATEGORIES.filter((ch) => ch.parent === c.id).map((ch) => (
            <Row key={ch.id} cat={ch} child />
          ))}
        </React.Fragment>
      ))}
    </div>
  )
}
function DefinitionsList() {
  const cats = CATEGORIES.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <Button variant="secondary" startIcon={<Icon name="Plus" />}>
          Nouvelle définition
        </Button>
      </div>
      {cats.map((cat) => {
        const defs = DEFINITIONS.filter((d) => d.category === cat.id)
        if (!defs.length) return null
        return (
          <div key={cat.id} style={{ marginBottom: 18 }}>
            <div
              style={{
                font: "var(--text-sigma)",
                textTransform: "uppercase",
                color: "var(--colors-neutral600)",
                marginBottom: 8,
              }}
            >
              {cat.name}
            </div>
            <Table>
              <Thead>
                <Tr>
                  <Th>Nom</Th>
                  <Th>Type</Th>
                  <Th>Options</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {defs.map((d) => (
                  <Tr key={d.id}>
                    <Td>
                      <span style={{ fontWeight: 600 }}>{d.name}</span>
                    </Td>
                    <Td>
                      <Badge variant="secondary">{d.type}</Badge>
                    </Td>
                    <Td>{d.enumOptions ? d.enumOptions.join(", ") : "—"}</Td>
                    <Td>
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <IconButton label="Modifier" bordered>
                          <Icon name="Pencil" />
                        </IconButton>
                        <IconButton label="Supprimer" variant="danger" bordered>
                          <Icon name="Trash" />
                        </IconButton>
                      </span>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )
      })}
    </div>
  )
}

/* ----------------------------------------------------------------- App */
function App() {
  const [route, setRoute] = React.useState("venues")
  const [canManageAll, setCanManageAll] = React.useState(true)
  const [form, setForm] = React.useState(null) // {venue} | {create:true}
  const [toast, showToast] = useToast()

  React.useEffect(() => {
    if (!canManageAll && route === "properties") setRoute("venues")
  }, [canManageAll, route])

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--colors-neutral100)",
        overflow: "hidden",
      }}
    >
      <SideNav title="Venues" description="Lieux & propriétés">
        <SideNavSection>
          <SideNavLink
            icon={<Icon name="Store" />}
            active={route === "venues"}
            onClick={() => setRoute("venues")}
          >
            Lieux
          </SideNavLink>
          {canManageAll && (
            <SideNavLink
              icon={<Icon name="Cog" />}
              active={route === "properties"}
              onClick={() => setRoute("properties")}
            >
              Propriétés
            </SideNavLink>
          )}
        </SideNavSection>
        <div
          style={{
            marginTop: "auto",
            padding: 16,
            borderTop: "1px solid var(--colors-neutral150)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
              color: "var(--colors-neutral600)",
            }}
          >
            <Icon name="Lock" size={14} />
            <span
              style={{
                font: "var(--text-pi)",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Rôle (démo)
            </span>
          </div>
          <Toggle checked={canManageAll} onChange={setCanManageAll}>
            {canManageAll ? "Admin / Editor" : "Venue Manager"}
          </Toggle>
        </div>
      </SideNav>

      <div style={{ flex: 1, overflow: "auto" }}>
        {route === "venues" ? (
          <VenuesList
            canManageAll={canManageAll}
            onCreate={() => setForm({ create: true })}
            onEdit={(v) => setForm({ venue: v })}
            toast={showToast}
          />
        ) : (
          <PropertiesPage />
        )}
      </div>

      {form && (
        <VenueForm
          venue={form.venue}
          canManageAll={canManageAll}
          onClose={() => setForm(null)}
          onSave={(msg) => {
            setForm(null)
            showToast(msg)
          }}
        />
      )}
      <Toast toast={toast} />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />)
