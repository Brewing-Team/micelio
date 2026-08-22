import { h, Fragment } from "preact"
import {
  resolveRelative,
  simplifySlug,
  joinSegments,
  htmlToJsx,
  getDate,
  byDateAndAlphabetical,
  formatDate,
} from "@quartz-community/utils"
import {
  AUTHORS_ROOT,
  getAuthorRefs,
  authorSlug,
  photoSrcFromFrontmatter,
  findFirstImage,
} from "../author-shared/authors.js"

function isListed(file) {
  return file?.unlisted !== true
}

function hasChildren(tree) {
  return (tree?.children?.length ?? 0) > 0
}

function initials(name) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

/**
 * Splits a profile note's rendered body into an avatar photo (the first embedded
 * image, e.g. `![[photo.jpg]]`) and the remaining bio content. If the leading
 * top-level node is (or only contains) that image, it's dropped from the bio so
 * the photo isn't shown twice — once as the avatar, once inline.
 */
function extractLeadingImage(tree) {
  const children = tree?.children ?? []
  const first = children[0]
  const img = findFirstImage(first)
  if (img?.properties?.src) {
    return { src: img.properties.src, bioTree: { ...tree, children: children.slice(1) } }
  }
  const anyImg = findFirstImage(tree)
  return { src: anyImg?.properties?.src ?? null, bioTree: tree }
}

/**
 * Resolves a profile note's avatar + bio content: the explicit `photo` frontmatter
 * wins if set, otherwise falls back to the first image embedded in the note body.
 */
function resolveAvatar(fileData, tree, currentSlug) {
  const explicit = photoSrcFromFrontmatter(fileData?.frontmatter?.photo, currentSlug)
  if (explicit) return { src: explicit, bioTree: tree }
  return extractLeadingImage(tree)
}

function Avatar({ name, photoSrc }) {
  if (photoSrc) {
    return h("img", { class: "author-avatar", src: photoSrc, alt: name })
  }
  return h("div", { class: "author-avatar author-avatar-fallback" }, initials(name))
}

function NoteList({ files, currentSlug, locale }) {
  const sorted = [...files].sort(byDateAndAlphabetical())
  return h(
    "ul",
    { class: "author-notes" },
    sorted.map((file) => {
      const title = file.frontmatter?.title ?? file.slug
      const date = getDate(file)
      return h(
        "li",
        { class: "author-note", key: file.slug },
        h(
          "div",
          { class: "author-note-meta" },
          date && h("time", { dateTime: date.toISOString() }, formatDate(date, locale)),
        ),
        h(
          "a",
          { class: "internal author-note-title", href: resolveRelative(currentSlug, file.slug) },
          title,
        ),
      )
    }),
  )
}

function AuthorProfile({ fileData, tree, currentSlug }) {
  const name = fileData?.frontmatter?.title ?? currentSlug
  const description = fileData?.frontmatter?.description
  const { src: photoSrc, bioTree } = resolveAvatar(fileData, tree, currentSlug)
  const bio = hasChildren(bioTree) ? htmlToJsx(bioTree) : description

  return h(
    "div",
    { class: "author-profile" },
    h(Avatar, { name, photoSrc }),
    h(
      "div",
      { class: "author-profile-text" },
      h("h1", { class: "author-name" }, name),
      bio && h("div", { class: "author-bio" }, bio),
    ),
  )
}

function AuthorIndex({ authors, currentSlug, locale }) {
  return h(
    "ul",
    { class: "author-index" },
    authors.map(({ slug, name, photoSrc, description, count }) =>
      h(
        "li",
        { class: "author-index-item", key: slug },
        h("a", { class: "internal", href: resolveRelative(currentSlug, slug) }, [
          h(Avatar, { name, photoSrc }),
          h(
            "div",
            { class: "author-index-text" },
            h("span", { class: "author-name" }, name),
            description && h("p", { class: "author-bio-preview" }, description),
            h("span", { class: "author-note-count" }, count === 1 ? "1 note" : `${count} notes`),
          ),
        ]),
      ),
    ),
  )
}

const authorMentionsCache = new WeakMap()

/**
 * Indexes every listed file's `authors:` mentions once per build (memoized per
 * `allFiles` array): mention counts for the author index, and each author's
 * notes for their individual page, both keyed by author slug.
 */
function getAuthorMentions(allFiles) {
  const files = allFiles ?? []
  let mentions = authorMentionsCache.get(files)
  if (!mentions) {
    const counts = new Map()
    const notesByAuthor = new Map()
    for (const file of files.filter(isListed)) {
      const slugsInFile = new Set()
      for (const { name } of getAuthorRefs(file?.frontmatter)) {
        const s = authorSlug(name)
        if (!counts.has(s)) counts.set(s, { slug: joinSegments(AUTHORS_ROOT, s), name, count: 0 })
        counts.get(s).count += 1
        if (!notesByAuthor.has(s)) notesByAuthor.set(s, [])
        if (!slugsInFile.has(s)) {
          notesByAuthor.get(s).push(file)
          slugsInFile.add(s)
        }
      }
    }
    mentions = { counts, notesByAuthor }
    authorMentionsCache.set(files, mentions)
  }
  return mentions
}

const AuthorContent = () => {
  const AuthorContentBody = (props) => {
    const { fileData, tree, allFiles, cfg } = props
    const slug = fileData?.slug ?? ""
    if (!(slug === AUTHORS_ROOT || slug.startsWith(`${AUTHORS_ROOT}/`))) {
      throw new Error(`Component "AuthorContent" tried to render a non-author page: ${slug}`)
    }
    const locale = cfg?.locale ?? "en-US"
    const currentSlug = slug
    const key = simplifySlug(slug.slice(AUTHORS_ROOT.length))
    const { counts, notesByAuthor } = getAuthorMentions(allFiles)

    if (key === "/") {
      // Index of every author: anyone mentioned in `authors:` frontmatter,
      // plus anyone who merely has a profile note under authors/.
      const bySlug = new Map([...counts].map(([s, entry]) => [s, { ...entry }]))
      const listed = (allFiles ?? []).filter(isListed)
      for (const file of listed) {
        if (!file.slug?.startsWith(`${AUTHORS_ROOT}/`)) continue
        if (file.slug === currentSlug || file.slug.endsWith("/index")) continue
        const s = simplifySlug(file.slug.slice(AUTHORS_ROOT.length))
        const name = file.frontmatter?.title ?? s
        const existing = bySlug.get(s)
        const merged = existing ?? { slug: file.slug, name, count: 0 }
        merged.name = name
        merged.photoSrc =
          photoSrcFromFrontmatter(file.frontmatter?.photo, currentSlug) ??
          findFirstImage(file.htmlAst)?.properties?.src ??
          null
        merged.description = file.frontmatter?.description
        bySlug.set(s, merged)
      }
      const authors = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name))
      const intro = hasChildren(tree) ? htmlToJsx(tree) : fileData?.description
      return h(
        Fragment,
        null,
        intro && h("div", { class: "author-index-intro" }, intro),
        h("p", { class: "author-index-count" }, `${authors.length} author(s).`),
        h(AuthorIndex, { authors, currentSlug, locale }),
      )
    }

    const notes = notesByAuthor.get(key) ?? []
    return h(
      "div",
      { class: "author-page" },
      h(AuthorProfile, { fileData, tree, currentSlug }),
      h(
        "div",
        { class: "author-notes-section" },
        h(
          "p",
          { class: "author-notes-count" },
          notes.length === 1 ? "1 note by this author." : `${notes.length} notes by this author.`,
        ),
        h(NoteList, { files: notes, currentSlug, locale }),
      ),
    )
  }

  AuthorContentBody.css = `
.author-avatar {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.author-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--highlight);
  color: var(--secondary);
  font-weight: 700;
  font-size: 1.5rem;
}
.author-profile {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin: 1rem 0 2rem;
}
.author-profile .author-name {
  margin: 0 0 0.25rem;
}
.author-bio {
  color: var(--darkgray);
}
.author-notes-count {
  color: var(--gray);
  font-size: 0.9rem;
}
ul.author-notes {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}
.author-note {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 0.6rem;
}
.author-note-meta {
  color: var(--gray);
  font-size: 0.85rem;
  min-width: 6rem;
}
ul.author-index {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  display: grid;
  gap: 1rem;
}
.author-index-item > a {
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: transparent;
}
.author-bio-preview {
  color: var(--darkgray);
  font-size: 0.85rem;
  margin: 0.15rem 0;
}
.author-note-count {
  color: var(--gray);
  font-size: 0.8rem;
}
`

  return AuthorContentBody
}

const authorMatcher = ({ slug }) => slug === AUTHORS_ROOT || slug.startsWith(`${AUTHORS_ROOT}/`)

function AuthorPage() {
  return {
    name: "AuthorPage",
    priority: 10,
    match: authorMatcher,
    generate({ content }) {
      const allFiles = content.map((c) => c[1].data).filter(isListed)

      const existingSlugs = new Set()
      const authorsBySlug = new Map()
      for (const file of allFiles) {
        if (authorMatcher({ slug: file.slug ?? "" })) existingSlugs.add(file.slug)
        for (const { name, display } of getAuthorRefs(file?.frontmatter)) {
          const s = authorSlug(name)
          if (s && !authorsBySlug.has(s)) authorsBySlug.set(s, display)
        }
      }

      const virtualPages = []
      const indexSlug = joinSegments(AUTHORS_ROOT, "index")
      if (!existingSlugs.has(indexSlug)) {
        virtualPages.push({
          slug: indexSlug,
          title: "Authors",
          data: { frontmatter: { title: "Authors" } },
        })
      }
      for (const [s, name] of authorsBySlug) {
        const pageSlug = joinSegments(AUTHORS_ROOT, s)
        if (existingSlugs.has(pageSlug)) continue
        virtualPages.push({
          slug: pageSlug,
          title: name,
          data: { frontmatter: { title: name } },
        })
      }
      return virtualPages
    },
    layout: "author",
    frame: "default",
    body: AuthorContent,
  }
}

export default AuthorPage
export { AuthorContent }
