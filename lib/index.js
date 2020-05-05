const sortBy = require("lodash.sortby");
const glob = require("glob");
const markdownIt = require("markdown-it");
const meta = require("markdown-it-meta");
const { lstatSync, readdirSync, readFileSync, existsSync } = require("fs");
const { join, normalize, sep, dirname } = require("path");
const escapeRegExp = require("lodash.escaperegexp");
const slugify = require("transliteration").slugify;
const { titleize } = require("inflection");
const callerPath = require("caller-path");

const isDirectory = source => lstatSync(source).isDirectory();
const getDirectories = source =>
  readdirSync(source).filter(name => !(name === ".vuepress") && isDirectory(join(source, name)));
const hasReadme = source =>
  readdirSync(source).findIndex(name => name.toLowerCase() === "readme.md" && !isDirectory(join(source, name))) > -1;

/**
 * Translate chinese to pinyin.
 * Compatible with vuepress-pluin-permalink-pinyin.
 * @param {Array} navArr
 */
function transliteratePinyin(navArr) {
  return navArr.map(nav => {
    const result = { ...nav };
    if (nav.link) {
      result.link = slugify(nav.link, { ignore: ["/", "."] });
    }
    if (nav.items) {
      result.items = transliteratePinyin(nav.items);
    }
    return result;
  });
}

/**
 * Returns name to be used in menus after removing navigation prefix, prefix numbers used for ordering and `.`, `-`, `_` and spaces.
 *
 * @param   {string}  path                  - File path to get name for.
 * @param   {Object}  options               - Options
 * @param   {string}  options.navPrefix     - Navigation order prefix if present.
 * @param   {boolean} options.stripNumbers  - Whether to strip numbers.
 * @returns {string}                        - Name to be used in navigation.
 * @example
 * getName("/some/path/nav-01-how", { navPrefix: "nav", stripNumbers: true }); // how
 * getName("/some/path/nav.01.how", { navPrefix: "nav", stripNumbers: true }); // how
 */
function getName(path, { navPrefix, stripNumbers } = {}) {
  let name = path.split(sep).pop();
  const argsIndex = name.lastIndexOf("--");
  if (argsIndex > -1) {
    name = name.substring(0, argsIndex);
  }

  if (navPrefix) {
    // "nav.001.xyz" or "nav-001.xyz" or "nav_001.xyz" or "nav 001.xyz" -> "nav"
    const pattern = new RegExp(`^${escapeRegExp(navPrefix)}[.\-_ ]?`);
    name = name.replace(pattern, "");
  }
  if (stripNumbers) {
    // "001.guide" or "001-guide" or "001_guide" or "001 guide" -> "guide"
    name = name.replace(/^\d+[.\-_ ]?/, "");
  }

  return titleize(name.replace("-", " "));
}

// Load all MD files in a specified directory and order by metadata 'order' value
function getChildren(parent_path, dir, recursive = true) {
  // CREDITS: https://github.com/benjivm (from: https://github.com/vuejs/vuepress/issues/613#issuecomment-495751473)
  parent_path = normalize(parent_path);
  parent_path = parent_path.endsWith(sep) ? parent_path.slice(0, -1) : parent_path; // Remove last / if exists.
  const pattern = recursive ? "/**/*.md" : "/*.md";
  files = glob.sync(parent_path + (dir ? `/${dir}` : "") + pattern).map(path => {
    // Instantiate MarkdownIt
    md = new markdownIt();
    // Add markdown-it-meta
    md.use(meta);
    // Get the order value
    file = readFileSync(path, "utf8");
    md.render(file);
    order = md.meta.order;
    // Remove "parent_path" and ".md"
    path = path.slice(parent_path.length + 1, -3);
    // Remove "README", making it the de facto index page
    if (path.toLowerCase().endsWith("readme")) {
      path = path.slice(0, -6);
    }

    return {
      path,
      order: path === "" && order === undefined ? 0 : order // README is first if it hasn't order
    };
  });

  // Return the ordered list of files, sort by 'order' then 'path'
  return sortBy(files, ["order", "path"]).map(file => file.path);
}

/**
 * Return sidebar config for given baseDir.
 *
 * @param   {String} baseDir        - Absolute path of directory to get sidebar config for.
 * @param   {Object} options        - Options
 * @param   {String} relativeDir    - Relative directory to add to baseDir
 * @param   {Number} currentLevel   - Current level of items.
 * @returns {Array.<String|Object>} - Recursion level
 */
function side(
  baseDir,
  { stripNumbers, maxLevel, navPrefix, skipEmptySidebar, addReadMeToFirstGroup, mixDirectoriesAndFilesAlphabetically },
  relativeDir = "",
  currentLevel = 1
) {
  const fileLinks = getChildren(baseDir, relativeDir, currentLevel > maxLevel);
  if (currentLevel <= maxLevel) {
    getDirectories(join(baseDir, relativeDir))
      .filter(subDir => !subDir.startsWith(navPrefix))
      .forEach(subDir => {
        const children = side(
          baseDir,
          { stripNumbers, maxLevel, navPrefix, skipEmptySidebar },
          join(relativeDir, subDir),
          currentLevel + 1
        );

        if (children.length > 0 || !skipEmptySidebar) {
          // Where to put '02-folder' in ['01-file', { title: 'Other Folder', children: ['03-folder/file'] }]
          const sortedFolderPosition = fileLinks.findIndex(
            link => {
              let childrenTitle = "";
              if(link.children) {
                if(typeof link.children[0] == 'string') childrenTitle = link.children[0];
                else if (typeof link.children[0] == 'object') childrenTitle = link.children[0].title;
                
                return childrenTitle.split(sep)[0];
              }
              return subDir < link;
            }
          );

          const insertPosition =
            mixDirectoriesAndFilesAlphabetically && sortedFolderPosition > -1 ? sortedFolderPosition : fileLinks.length;

          fileLinks.splice(insertPosition, 0, {
            title: getName(subDir, { stripNumbers, navPrefix }),
            ...parseSidebarParameters(subDir),
            children
          });
        }
      });
  }

  // Remove README.md from first position and add it to first group.
  if (addReadMeToFirstGroup && fileLinks[0] === "" && typeof fileLinks[1] === "object") {
    fileLinks.shift();
    fileLinks[0].children.unshift("");
  }

  return fileLinks;
}

/**
 * Gets sidebar parameters from directory name. Arguments are given after double dash `--` and separated by comma.
 * - `nc` sets collapsable to `false`.
 * - `dX` sets sidebarDepth to `X`.
 *
 * @param   {String} dirname  - Name of the directory.
 * @returns {Object}          - sidebar parameters.
 * @example
 * parseSidebarParameters("docs/api--nc,d2"); { collapsable: false, sidebarDepth: 2 }
 */
function parseSidebarParameters(dirname) {
  const index = dirname.lastIndexOf("--");
  if (index === -1) {
    return {};
  }

  const args = dirname.substring(index + 2).split(",");
  const parameters = {};

  args.forEach(arg => {
    if (arg === "nc") {
      parameters.collapsable = false;
    } else if (arg.match(/d\d+/)) {
      parameters.sidebarDepth = Number(arg.substring(1));
    }
  });

  return parameters;
}

/**
 * Returns navbar configuration for given path.
 * @param   {String}          rootDir           - Path of the directory to get navbar configuration for.
 * @param   {OBject}          options           - Options
 * @param   {String}          relativeDir       - (Used internally for recursion) Relative directory to `rootDir` to get navconfig for.
 * @param   {Number}          currentNavLevel   - (Used internally for recursion) Recursion level.
 * @returns {Array.<Object>}
 */
function nav(rootDir, { navPrefix, stripNumbers, skipEmptyNavbar }, relativeDir = "/", currentNavLevel = 1) {
  relativeDir = relativeDir.replace(/\\/g, "/");
  const baseDir = join(rootDir, relativeDir);
  const childrenDirs = getDirectories(baseDir).filter(subDir => subDir.startsWith(navPrefix));
  const options = { navPrefix, stripNumbers, skipEmptyNavbar };
  let result;

  if (currentNavLevel > 1 && childrenDirs.length === 0) {
    if (!hasReadme(baseDir)) {
      if (skipEmptyNavbar) {
        return;
      } else {
        throw new Error(
          `README.md file cannot be found in ${baseDir}. VuePress would return 404 for that NavBar link.`
        );
      }
    }
    result = { text: getName(baseDir, { stripNumbers, navPrefix }), link: relativeDir + "/" };
  } else if (childrenDirs.length > 0) {
    const items = childrenDirs
      .map(subDir => nav(rootDir, options, join(relativeDir, subDir), currentNavLevel + 1))
      .filter(Boolean);
    result = currentNavLevel === 1 ? items : { text: getName(baseDir, { stripNumbers, navPrefix }), items };
  }

  return result;
}

/**
 * Returns multiple sidebars for given directory.
 * @param {String}    rootDir       - Directory to get navbars for.
 * @param {Object}    nav           - Navigation configuration (Used for calculating sidebars' roots.)
 * @param {Object}    options       - Options
 * @param {Number}    currentLevel  - Recursion level.
 * @returns {Object}                - Multiple navbars.
 */
function multiSide(rootDir, nav, options, currentLevel = 1) {
  const sideBar = {};

  nav.forEach(navItem => {
    if (navItem.link) {
      sideBar[navItem.link] = side(join(rootDir, navItem.link), options);
    } else {
      Object.assign(sideBar, multiSide(rootDir, navItem.items, options), currentLevel + 1);
    }
  });

  if (options.skipEmptySidebar) {
    Object.keys(sideBar).forEach(key => {
      if (sideBar[key].length === 0) {
        delete sideBar[key];
      }
    });
  }

  if (currentLevel === 1) {
    const fallBackSide = side(rootDir, options);
    const singleEmptyElement = fallBackSide.length === 1 && fallBackSide[0] === ''; // ['']

    if (!options.skipEmptySidebar || (fallBackSide.length > 0 && !singleEmptyElement)) { // If [''] is present at root level, vuepress does not render sidebar correctly. See `example-with-root-readme` test
      sideBar["/"] = side(rootDir, options);
    }
  }

  return sideBar;
}

/**
 * Returns `nav` and `sidebar` configuration for VuePress calculated using structrue of directory and files in given path.
 * @param   {String}    rootDir   - Directory to get configuration for.
 * @param   {Object}    options   - Options
 * @returns {Object}              - { nav: ..., sidebar: ... } configuration.
 */
function getConfig(rootDirOrOptions, options) {
  let rootDir = typeof rootDirOrOptions === "string" ? normalize(rootDirOrOptions) : join(dirname(callerPath()), '..');
  rootDir = rootDir.endsWith(sep) ? rootDir.slice(0, -1) : rootDir; // Remove last / if exists.

  options = {
    stripNumbers: true,
    maxLevel: 2,
    navPrefix: "nav",
    skipEmptySidebar: true,
    skipEmptyNavbar: true,
    multipleSideBar: true,
    addReadMeToFirstGroup: true,
    mixDirectoriesAndFilesAlphabetically: true,
    pinyinNav: false,
    ...(options || (typeof rootDirOrOptions === "object" ? rootDirOrOptions : {}))
  };

  const navItems = nav(rootDir, options);

  const result = {
    nav: navItems || [],
    sidebar: options.multipleSideBar && navItems ? multiSide(rootDir, navItems, options) : side(rootDir, options)
  };

  if (options.pinyinNav && nav.length) {
    result.nav = transliteratePinyin(result.nav);
  }

  return result;
}

module.exports = getConfig;
