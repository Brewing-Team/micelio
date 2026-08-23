import { h } from "preact"
import { joinSegments, pathToRoot } from "@quartz-community/utils"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

export default function MicelioBg(opts) {
  const optsProvided = opts ?? {}

  return {
    name: "micelio-bg",
    externalResources: () => ({
      additionalHead: [
        // Inline config so the client script can pick up runtime options
        () => {
          const cfg = JSON.stringify(optsProvided)
          return h("script", { dangerouslySetInnerHTML: { __html: `window.MICELIO_BG_CONFIG = ${cfg};` } })
        },
        (fileData) => {
          const baseDir = fileData?.slug === "404" ? "/" : pathToRoot(fileData?.slug || "")
          return h("script", { src: joinSegments(baseDir, "static/micelio-bg.js") })
        },
      ],
    }),
    // Copy plugin static assets into output/static so the injected script exists
    // at runtime. This ensures the plugin is self-contained when installed.
    emit: async (ctx) => {
      try {
        const pluginDir = path.dirname(fileURLToPath(import.meta.url))
        const src = path.join(pluginDir, "static", "micelio-bg.js")
        const outDir = path.join(ctx.argv.output, "static")
        await fs.promises.mkdir(outDir, { recursive: true })
        const dest = path.join(outDir, "micelio-bg.js")
        await fs.promises.copyFile(src, dest)
        return [dest]
      } catch (err) {
        // Fail gracefully — plugin shouldn't break the build if copy fails
        return []
      }
    },
  }
}

export { MicelioBg }
