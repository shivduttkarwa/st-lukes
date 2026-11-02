import fs from "node:fs";

const dir = new URL("./pages/", import.meta.url);
const readJson = (url) => JSON.parse(fs.readFileSync(url, "utf8"));
const smallest = (image) => (image.srcset ? image.srcset.split(",")[0].trim().split(" ")[0] : image.src);
// the rows show small cuts made by .qa/search-thumbs.py
const thumbOf = (src) => `/assets/images/search/${src.replace("/assets/images/", "").replace(/\//g, "-")}`;

export default function () {
  const items = [];
  const seen = new Set();
  const add = (item) => {
    if (!item.image || seen.has(item.title)) return;
    seen.add(item.title);
    const source = smallest(item.image);
    items.push({ ...item, source, image: thumbOf(source) });
  };

  const pages = fs.readdirSync(dir).filter((name) => name.endsWith(".json")).map((name) => ({ key: name.replace(".json", ""), data: readJson(new URL(name, dir)) }));
  const builtUrls = new Set(pages.map(({ key }) => (key === "home" ? "/" : `/${key}/`)));

  pages.forEach(({ key, data }) => {
    const hero = data.body.find((block) => block.type.endsWith("hero"));
    add({
      title: data.seo.title.split(" | ")[0],
      text: data.seo.description,
      url: key === "home" ? "/" : `/${key}/`,
      image: hero?.value.image,
    });
  });

  pages.forEach(({ data }) => {
    data.body
      .filter((block) => block.type === "news_hero" || block.type === "news_index")
      .forEach((block) => block.value.stories.forEach((story) => add({ title: story.title, text: `News and stories: ${story.tag}`, url: story.url || "#", image: story.image })));
  });

  // pages that exist only in the menu so far: their section stands in for a description
  const site = readJson(new URL("./site.json", import.meta.url));
  site.nav.forEach((section) => {
    (section.children || [])
      .filter((child) => !builtUrls.has(child.url))
      .forEach((child) => add({ title: child.label, text: section.label, url: child.url, image: child.image }));
  });

  return items;
}
