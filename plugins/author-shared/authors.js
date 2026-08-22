import { resolveRelative, joinSegments, slugTag, slugifyFilePath } from "@quartz-community/utils"
import { visit, EXIT } from "unist-util-visit"

export const AUTHORS_ROOT = "authors"

// Matches an Obsidian wikilink: [[Target]], [[Target#anchor]], [[Target|Alias]]
const WIKILINK_RE = /^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]$/

/** Unwraps `[[Target]]`, `[[Target#anchor]]` or `[[Target|Alias]]` into `{ target, alias }`. */
export function parseWikilink(raw) {
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

/** Normalizes the `authors` frontmatter field (string, wikilink, or array of either) into `{name, display}[]`. */
export function getAuthorRefs(frontmatter) {
  const raw = frontmatter?.authors
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : [raw]
  return arr.map((a) => parseAuthorRef(a)).filter((ref) => ref.name.length > 0)
}

export function authorSlug(name) {
  return slugTag(name.trim())
}

/**
 * Resolves an author's `photo` frontmatter (e.g. `photo: "[[mdoradom.jpg]]"`) to a
 * URL usable from `currentSlug`. The image is expected to live alongside the
 * author's profile note under authors/. Absolute URLs and already-resolved
 * paths are passed through unchanged.
 */
export function photoSrcFromFrontmatter(photoRaw, currentSlug) {
  if (!photoRaw) return null
  const raw = String(photoRaw).trim()
  if (!raw) return null
  if (/^([a-z]+:)?\/\//i.test(raw) || /^\.{0,2}\//.test(raw)) return raw
  const { target } = parseWikilink(raw)
  if (!target) return null
  return resolveRelative(currentSlug, joinSegments(AUTHORS_ROOT, slugifyFilePath(target)))
}

/** Finds the first `<img>` anywhere under a hast node (including the node itself). */
export function findFirstImage(node) {
  if (!node) return null
  let found = null
  visit(
    node,
    (n) => n.type === "element" && n.tagName === "img",
    (n) => {
      found = n
      return EXIT
    },
  )
  return found
}

/** Resolves a profile file's avatar photo: explicit `photo` frontmatter, or the first embedded image. */
export function getAuthorPhoto(profileFile, currentSlug) {
  if (!profileFile) return null
  return (
    photoSrcFromFrontmatter(profileFile.frontmatter?.photo, currentSlug) ??
    findFirstImage(profileFile.htmlAst)?.properties?.src ??
    null
  )
}

/** Normalizes the `links` frontmatter field (string or array of strings) into a string array. */
export function getAuthorLinks(frontmatter) {
  const raw = frontmatter?.links
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : [raw]
  return arr.map((l) => String(l).trim()).filter(Boolean)
}
