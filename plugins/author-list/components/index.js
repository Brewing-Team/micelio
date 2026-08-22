import { h } from "preact"
import { resolveRelative, joinSegments, classNames } from "@quartz-community/utils"
import {
  AUTHORS_ROOT,
  getAuthorRefs,
  authorSlug,
  getAuthorPhoto,
} from "../../author-shared/authors.js"

const profileIndexCache = new WeakMap()

/** Maps every authors/-prefixed file by slug, memoized per `allFiles` array for the build. */
function getProfileIndex(allFiles) {
  const files = allFiles ?? []
  let index = profileIndexCache.get(files)
  if (!index) {
    index = new Map()
    for (const file of files) {
      if (file.slug?.startsWith(`${AUTHORS_ROOT}/`)) index.set(file.slug, file)
    }
    profileIndexCache.set(files, index)
  }
  return index
}

const AuthorListComponent = () => {
  const AuthorList = ({ fileData, allFiles, displayClass }) => {
    const authors = getAuthorRefs(fileData?.frontmatter)
    if (authors.length === 0) return null
    const currentSlug = fileData.slug
    const profileIndex = getProfileIndex(allFiles)
    return h(
      "ul",
      { class: classNames(displayClass, "authors") },
      authors.map(({ name, display }) => {
        const profileSlug = joinSegments(AUTHORS_ROOT, authorSlug(name))
        const profileFile = profileIndex.get(profileSlug)
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
