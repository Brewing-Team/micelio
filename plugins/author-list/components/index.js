import { h } from "preact"
import {
  resolveRelative,
  slugTag,
  joinSegments,
  slugifyFilePath,
  classNames,
} from "@quartz-community/utils"

const AUTHORS_ROOT = "authors"

// Matches an Obsidian wikilink: [[Target]], [[Target#anchor]], [[Target|Alias]]
const WIKILINK_RE = /^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]$/

/** Unwraps `[[Target]]`, `[[Target#anchor]]` or `[[Target|Alias]]` into `{ target, alias }`. */
function parseWikilink(raw) {
  const s = String(raw).trim()
  const m = s.match(WIKILINK_RE)
  if (m) return { target: m[1].trim(), alias: m[2]?.trim() }
  return { target: s, alias: undefined }
}

/** Turns a raw `authors:` list entry into `{ name, display }`, unwrapping `[[wikilinks]]`. */
function parseAuthorRef(raw) {
  const { target, alias } = parseWikilink(raw)
  return { name: target, display: alias ?? target }
}

function getAuthorRefs(frontmatter) {
  const raw = frontmatter?.authors
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : [raw]
  return arr.map((a) => parseAuthorRef(a)).filter((ref) => ref.name.length > 0)
}

/** Resolves an author's `photo` frontmatter (e.g. `[[mdoradom.jpg]]`) to a URL. */
function photoSrcFromFrontmatter(photoRaw, currentSlug) {
  if (!photoRaw) return null
  const raw = String(photoRaw).trim()
  if (!raw) return null
  if (/^([a-z]+:)?\/\//i.test(raw) || /^\.{0,2}\//.test(raw)) return raw
  const { target } = parseWikilink(raw)
  if (!target) return null
  return resolveRelative(currentSlug, joinSegments(AUTHORS_ROOT, slugifyFilePath(target)))
}

/** Finds the first `<img>` anywhere under a hast node. */
function findFirstImage(node) {
  if (!node) return null
  if (node.type === "element" && node.tagName === "img") return node
  if (node.children) {
    for (const child of node.children) {
      const found = findFirstImage(child)
      if (found) return found
    }
  }
  return null
}

function getAuthorPhoto(profileFile, currentSlug) {
  if (!profileFile) return null
  return (
    photoSrcFromFrontmatter(profileFile.frontmatter?.photo, currentSlug) ??
    findFirstImage(profileFile.htmlAst)?.properties?.src ??
    null
  )
}

const AuthorListComponent = () => {
  const AuthorList = ({ fileData, allFiles, displayClass }) => {
    const authors = getAuthorRefs(fileData?.frontmatter)
    if (authors.length === 0) return null
    const currentSlug = fileData.slug
    return h(
      "ul",
      { class: classNames(displayClass, "authors") },
      authors.map(({ name, display }) => {
        const profileSlug = joinSegments(AUTHORS_ROOT, slugTag(name))
        const profileFile = (allFiles ?? []).find((f) => f.slug === profileSlug)
        const photoSrc = getAuthorPhoto(profileFile, currentSlug)
        return h(
          "li",
          { key: name },
          h(
            "a",
            {
              class: "internal author-link",
              href: resolveRelative(currentSlug, profileSlug),
            },
            [
              photoSrc && h("img", { class: "author-link-avatar", src: photoSrc, alt: "" }),
              h("span", { class: "author-link-name" }, display),
            ],
          ),
        )
      }),
    )
  }
  AuthorList.css = `
.authors {
  list-style: none;
  display: flex;
  padding-left: 0;
  gap: 0.4rem;
  margin: 0.5rem 0 1rem;
  flex-wrap: wrap;
  align-items: center;
}
.authors > li {
  display: inline-block;
  white-space: nowrap;
  margin: 0;
}
a.internal.author-link {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  gap: 0.4rem;
  border-radius: 999px;
  background-color: var(--highlight);
  color: var(--secondary);
  padding: 0.15rem 0.6rem;
  margin: 0;
  line-height: 1.3rem;
}
.author-link-avatar {
  width: 1.3rem;
  height: 1.3rem;
  margin: 0;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.author-link-name {
  font-weight: 500;
}
`
  return AuthorList
}

export { AuthorListComponent as AuthorList }
