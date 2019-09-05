# vuepress-plugin-autobar

VuePress sidebar and navbar generator based on file and directory structure. Focus your documents, not sidebar or navbar.

## 1. Synopsis

### Install
```bash
 # npm install -D vuepress-plugin-autobar # Waitting author accepted the PR.
 npm install -D boboidream/vuepress-bar
```

### Usage
Add `vuepress-plugin-autobar` in your site or theme config file. See [official docs on using a plugin](https://vuepress.vuejs.org/plugin/using-a-plugin.html)

```js
// .vuepress/config.js
// or
// .vuepress/theme/index.js

module.exports = {
  plugins: ['autobar']
}
```

## 2. Features

- **Creates navbar & sidebar:** Add `navbar` prefix to your directories such as `nav.guide` or `nav.01.guide`
- **Custom sort:** Prefix directories with numbers, or add `order` meta to files such as `01.guide`
- **Multiple Sidebars**
- **No configuration**
- Adds README.md to the first available group like VuePress web site. (May be disabled by options)
- Possible to pass parameters in directory names. (See advanced example below.)

## 3. Examples

### With Navbar

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

### Without Navbar

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

## 4. Advanced
### Conventions
It is possible to pass sidebar parameters in directory names. You may pass following parameters after double dash `--` separated by comma:

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

**Notes**
- VuePress requires `README.md` as default file in a `navbar` link. Forgetting `README.md` would skip that creation of that navbar item.

### Advanced Options
```js
// .vuepress/config.js
// or
// .vuepress/theme/index.js
const autobar_options = {
  rootDir: 'xxx',
  stripNumbers = true,
  maxLevel = 2,
  navPrefix = "nav",
  skipEmptySidebar = true,
  skipEmptyNavbar = true,
  multipleSideBar = true,
  setHomepage = 'hide' | 'toGroup' | 'top'
};

module.exports = {
  plugins: [
    [ 'autobar', autobar_options ]
  ]
}
```

**tips**
If you want to use simple links, maybe you will like [vuepress-plugin-rpurl](https://github.com/boboidream/vuepress-plugin-rpurl).


### API
| Param            | Type    | Default            | Description                                                                                                                                     |
| ---------------- | ------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| rootDir          | String  | `${ctx.sourceDir}` | Root directory where the documents are located.                                                                                                 |
| stripNumbers     | Boolean | `true`             | Remove number prefixes from directory names where it helps sorting.                                                                             |
| maxLevel         | Number  | `2`                | Maximum level of recursion for subdirectory traversing.                                                                                         |
| navPrefix        | String  | `nav`              | Prefix for directories for navbar and mulitple sidebars.                                                                                        |
| skipEmptySidebar | Boolean | `true`             | Do not add item to sidebar if directory is empty.                                                                                               |
| skipEmptyNavbar  | Boolean | `true`             | Do not add item to navbar if directory is empty.                                                                                                |
| multipleSideBar  | Boolean | `true`             | Creates multiple sidebars if there are navbar items.                                                                                            |
| setHomepage      | String  | `hide`             | `hide`: Hide homepage link in sidebar.<br>`toGroup`: Adds README.md into first group of sidebar.<br>`top`: Show homepage link at top of sidebar |
| pinyinNav        | Boolean | `false`            | Do not translate chinese nav to pinyin.                                                                                                         |

> Tips: pinyinNav: true,Should use with [vuepress-plugin-permalink-pinyin](https://github.com/viko16/vuepress-plugin-permalink-pinyin). 
