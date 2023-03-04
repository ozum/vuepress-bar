# vuepress-bar

VuePress sidebar and navbar generator based on file and directory structure. Focus your documents, not sidebar or navbar.

# Synopsis

```js
//.vuepress/config.js
const getConfig = require("vuepress-bar");

const { nav, sidebar } = getConfig();

module.exports = { themeConfig: { nav, sidebar } };
```

# Usage

## 1. Install

```bash
npm install vuepress-bar -D
# or:
# yarn add vuepress-bar -D
```

## 2. Get Menu & Bar Configuration

```js
// .vuepress/config.js
const { nav, sidebar } = getConfig(options); // Use default location of `.vuepress`: `${__dirname}/..`
const { nav, sidebar } = getConfig("path/to/.vuepress/..", options); // Point to *parent* dir of `.vuepress`.
```

## 3. Merge with VuePress Configuration

### Alternative 1: No Modification

```js
// .vuepress/config.js
module.exports = { themeConfig: { nav, sidebar } };
```

### Alternative 2: Modification

```js
// .vuepress/config.js
module.exports = {
  themeConfig: {
    nav: [{ text: 'pg-structure', link: 'https://www.pg-structure.com/' }, ...nav]
    sidebar,
  }
};
```

\*\* See advanced section below for more advanced modifications such as overriding.

# Features

- **Creates navbar & sidebar:** Add `navbar` prefix to your directories such as `nav.guide` or `nav.01.guide`
- **Custom sort:** Prefix directories with numbers, or add `order` meta to files such as `01.guide`
- **Multiple Sidebars**
- **No configuration**
- Adds README.md to the first available group like the VuePress web site. (Maybe disabled by options)
- Pass parameters in directory names. (See advanced example below.)
- Fİlter based on Front Matter meta data.

# Examples with Explanations

## With Navbar

```
|- docs/
  |- .vuepress
  |- nav.01.guide/
    |- README.md
  |- nav.02.api/
    |- classes/
      |- member.md
```

```js
{
  nav: [
    { text: 'Guide', link: '/nav.01.guide/' },
    { text: 'Api', link: '/nav.02.api/' }
  ],
  sidebar: {
    '/nav.01.guide/': [ '' ],
    '/nav.02.api/': [ { title: 'Classes', children: [ '', 'classes/member' ] } ]
  }
}
```

- Readme is moved into first group: `'/nav.02.api/': [ { title: 'Classes', children: [ '', 'classes/member' ] } ]` instead of `'/nav.02.api/': [ '', { title: 'Classes', children: [ 'classes/member' ] } ]`

## Without Navbar

```
|- docs/
  |- .vuepress
  |- 01.guide/
    |- README.md
  |- 02.api/
    |- classes/
      |- member.md
```

```js
{
  nav: [],
  sidebar: [
    { title: "Guide", children: ["01.guide/"] },
    {
      title: "Api",
      children: [{ title: "Classes", children: ["02.api/classes/member"] }]
    }
  ]
};
```

## Advanced

### Parameters

It is possible to pass sidebar parameters in directory names. You may pass the following parameters after double dash `--` separated by a comma:

- `nc` sets `collapsable` to `false`.
- `dX` sets `sidebarDepth` to `X`.

```
|- docs/
  |- 01.guide--nc,d2/
    |- README.md
```

```js
{
  nav: [],
  sidebar: [
    {
      title: "Guide",
      collapsable: false,
      sidebarDepth: 1,
      children: ["01.guide--nc,d2/"]
    },
  ]
};
```

### Overriding

You may want to override generated navbar or sidebar. That is the reason why `vuepress-bar` isn't written as a plugin. You can override generated config.

**Rename "Api" to "API"**

```ts
const { nav, sidebar } = getConfig();

// Find item with text "Api" and change it to "API".
nav.find((item) => item.text === "Api").text = "API";
```

**Filter Some Entries**

```ts
module.exports = {
  themeConfig: {
    nav,
    sidebar: sidebar.filter((i) => i.title !== "Node Modules"),
  },
};
```

**Filter Some Entries with Meta Data**

Use YAML meta data (Front Matter).

**CAUTION if you use "Theme API" and filter pages in the `ready` function:** The filter option has to be the same as what is in the `ready` function or there will be an error because the ready function deletes the pages.

```ts
const { nav, sidebar } = getConfig({ filter: (meta) => meta.draft !== true });
```

# Notes

- VuePress requires `README.md` as default file in a `navbar` link. Forgetting `README.md` would skip that creation of that navbar item.

# Options

| Param                                | Type     | Default | Description                                                                                      |
| ------------------------------------ | -------- | ------- | ------------------------------------------------------------------------------------------------ |
| stripNumbers                         | Boolean  | `true`  | Remove number prefixes from directory names where it helps sorting.                              |
| maxLevel                             | Number   | `2`     | Maximum level of recursion for subdirectory traversing.                                          |
| navPrefix                            | String   | `nav`   | Prefix for directories for navbar and mulitple sidebars.                                         |
| skipEmptySidebar                     | Boolean  | `true`  | Do not add item to sidebar if directory is empty.                                                |
| skipEmptyNavbar                      | Boolean  | `true`  | Do not add item to navbar if directory is empty.                                                 |
| multipleSideBar                      | Boolean  | `true`  | Create multiple sidebars if there are navbar items.                                              |
| addReadMeToFirstGroup                | Boolean  | `true`  | Add README.md into first group of sidebar. (vuepress website's behaviour)                        |
| mixDirectoriesAndFilesAlphabetically | Boolean  | `true`  | Add directories to alphabetic positions between files. (i.e. `01-file`, `02-folder`, `03-file` ) |
| pinyinNav                            | Boolean  | `false` | Translate chinese nav to pinyin.                                                                 |
| filter                               | Function |         | Fİlter function to filter files. Front Matter meta data is passed as an object.                  |
