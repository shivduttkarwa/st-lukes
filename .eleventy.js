import fs from "node:fs";
import path from "node:path";
import less from "less";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import * as esbuild from "esbuild";

const PROD = process.env.ELEVENTY_RUN_MODE === "build";

function relativeUrls(html, pageUrl) {
  const up = "../".repeat(pageUrl.split("/").length - 2);
  return html
    .replace(/\b(href|src|poster|action|data-src|data-thumb)="\/(?!\/)([^"]*)"/g, (_, attr, url) => `${attr}="${up + url || "./"}"`)
    .replace(/\bsrcset="([^"]*)"/g, (_, set) => `srcset="${set.replace(/(^|[\s,])\/(?!\/)/g, `$1${up}`)}"`);
}

async function compileCss() {
  const input = "src/assets/styles/main.less";
  const out = await less.render(fs.readFileSync(input, "utf8"), {
    filename: path.resolve(input),
    paths: ["node_modules", "src/assets/styles"],
  });
  const prefixed = await postcss([autoprefixer]).process(out.css, { from: undefined });
  const css = PROD
    ? (await esbuild.transform(prefixed.css, { loader: "css", minify: true, legalComments: "none" })).code
    : prefixed.css;
  fs.mkdirSync("dist/assets/css", { recursive: true });
  fs.writeFileSync("dist/assets/css/main.css", css);
}

export default function (eleventyConfig) {
  eleventyConfig.addTransform("relative-urls", function (content) {
    return (this.page.outputPath || "").endsWith(".html") ? relativeUrls(content, this.page.url) : content;
  });

  eleventyConfig.on("eleventy.before", compileCss);
  eleventyConfig.addWatchTarget("src/assets/styles/");
  eleventyConfig.addWatchTarget("dist/assets/js/");

  for (const dir of ["images", "icons", "fonts", "video"]) {
    if (fs.existsSync(`src/assets/${dir}`)) {
      eleventyConfig.addPassthroughCopy({ [`src/assets/${dir}`]: `assets/${dir}` });
    }
  }

  eleventyConfig.setServerOptions({ port: 3000, showAllHosts: true });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "dist" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["njk", "html"],
  };
}
