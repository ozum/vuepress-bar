const sortBy = require("lodash.sortby");
const glob = require("glob");
const markdownIt = require("markdown-it");
const meta = require("markdown-it-meta");
const { lstatSync, readdirSync, readFileSync, existsSync } = require("fs");
const { join, normalize, sep } = require("path");
const startCase = require("lodash.startCase");
const escapeRegExp = require("lodash.escaperegexp");

const isDirectory = source => lstatSync(source).isDirectory();
const getDirectories = source =>
  readdirSync(source).filter(name => !(name === ".vuepress") && isDirectory(join(source, name)));

function getName(dir, { navPrefix, stripNumbers } = {}) {
  let name = dir.split(sep).pop();

  if (navPrefix) {
    // "nav.001.xyz" or "nav-001.xyz" or "nav_001.xyz" or "nav 001.xyz" -> "nav"
    const pattern = new RegExp(`^${escapeRegExp(navPrefix)}[.-_ ]?`);
    name = name.replace(pattern, "");
  }
  if (stripNumbers) {
    // "001.guide" or "001-guide" or "001_guide" or "001 guide" -> "guide"
    name = name.replace(/^\d+[.-_ ]?/, "");
  }

  return startCase(name);
}

// Load all MD files in a specified directory and order by metadata 'order' value
const getChildren = function(parent_path, dir, recursive = true) {
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
    if (path.endsWith("README")) {
      path = path.slice(0, -6);
    }

    return {
      path,
      order: path === "" && order === undefined ? 0 : order // README is first if it hasn't order
    };
  });

  // Return the ordered list of files, sort by 'order' then 'path'
  return sortBy(files, ["order", "path"]).map(file => file.path);
};

function side(
  baseDir,
  { stripNumbers, maxLevel, navPrefix, skipEmptySidebar } = {},
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
          fileLinks.push({
            title: getName(subDir, { stripNumbers, navPrefix }),
            children
          });
        }
      });
  }

  return fileLinks;
}

function nav(rootDir, { navPrefix, stripNumbers, skipEmptyNavbar }, relativeDir = "/", currentNavLevel = 1) {
  const baseDir = join(rootDir, relativeDir);
  const childrenDirs = getDirectories(baseDir).filter(subDir => subDir.startsWith(navPrefix));
  const options = { navPrefix, stripNumbers, skipEmptyNavbar };
  let result;

  if (currentNavLevel > 1 && childrenDirs.length === 0) {
    if (!existsSync(join(baseDir, "README.md"))) {
      if (skipEmptyNavbar) {
        return;
      } else {
        throw new Error(
          `README.md file cannot be found in ${baseDir}. VuePress would return 404 for that NavBar link.`
        );
      }
    }
    result = { text: getName(baseDir, { stripNumbers, navPrefix }), link: relativeDir + sep };
  } else if (childrenDirs.length > 0) {
    const items = childrenDirs
      .map(subDir => nav(rootDir, options, join(relativeDir, subDir), currentNavLevel + 1))
      .filter(Boolean);
    result = currentNavLevel === 1 ? items : { text: getName(baseDir, { stripNumbers, navPrefix }), items };
  }

  return result;
}

function multiSide(rootDir, nav, { stripNumbers, maxLevel, navPrefix, skipEmptySidebar }, currentLevel = 1) {
  const sideBar = {};
  const options = { stripNumbers, maxLevel, navPrefix, skipEmptySidebar };

  nav.forEach(navItem => {
    if (navItem.link) {
      sideBar[navItem.link] = side(join(rootDir, navItem.link), options);
    } else {
      Object.assign(sideBar, multiSide(rootDir, navItem.items, options), currentLevel + 1);
    }
  });

  if (skipEmptySidebar) {
    Object.keys(sideBar).forEach(key => {
      if (sideBar[key].length === 0) {
        delete sideBar[key];
      }
    });
  }

  if (currentLevel === 1) {
    const fallBackSide = side(rootDir, options);
    if (!skipEmptySidebar || fallBackSide.length > 0) {
      sideBar["/"] = side(rootDir, options);
    }
  }

  return sideBar;
}

function getConfig(
  rootDir,
  {
    stripNumbers = true,
    maxLevel = 2,
    navPrefix = "nav",
    skipEmptySidebar = true,
    skipEmptyNavbar = true,
    multipleSideBar = true
  } = {}
) {
  rootDir = normalize(rootDir);
  rootDir = rootDir.endsWith(sep) ? rootDir.slice(0, -1) : rootDir; // Remove last / if exists.
  const options = {
    stripNumbers,
    maxLevel,
    navPrefix,
    skipEmptySidebar,
    skipEmptyNavbar,
    multipleSideBar
  };
  const navItems = nav(rootDir, options);

  return {
    nav: navItems || [],
    sidebar: multipleSideBar && navItems ? multiSide(rootDir, navItems, options) : side(rootDir, options)
  };
}

module.exports = getConfig;
