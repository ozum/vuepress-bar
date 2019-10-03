const autoBar = require("./index");

const configOf = (name, options = {}) => {
  const ctx = {themeConfig:{}};
  if (!options.rootDir) {
    options.rootDir = `${__dirname}/../docs/example-${name}`;
  }
  return autoBar(options, ctx);
}
const expected = name => require(`${__dirname}/../docs/example-${name}.json`);

describe("autoBar", () => {
  it("should create config", async () => {
    const config = await configOf("standard", {setHomepage: 'toGroup'}).ready();
    expect(config).toEqual(expected("standard"));
  });

  it("should create config without adding readme to first group", async () => {
    const config = await configOf("standard", {setHomepage: 'top'}).ready();
    expect(config).toEqual(expected("standard-no-readme-move"));
  });

  it("should throw for missing README.md in Navbar", async () => {
    try { await configOf("missing-readme", {
        skipEmptyNavbar: false,
        setHomepage: 'toGroup'
      }).ready();
    } catch(e) {
      expect(e).toEqual({
        error: "README.md file cannot be found"
      })
    }
  });

  it("should skip Navbar item for missing README.md", async () => {
    const config = await configOf("missing-readme", {setHomepage: 'toGroup'}).ready();
    expect(config).toEqual(expected("missing-readme"));
  });

  it("should skip Navbar item for missing README.md", async () => {
    const config = await configOf("no-navbar", {setHomepage: 'toGroup'}).ready();
    expect(config).toEqual(expected("no-navbar"));
  });

  it("translate chinese to pinyin", async () => {
    const config = await configOf("中文", {pinyinNav: true}).ready();
    expect(config).toEqual(expected("chinese"))
  })

  it("sort file and folder by prefix", async () => {
    const config = await configOf("sort").ready();
    // console.log(JSON.stringify(config))
    expect(config).toEqual(expected("sort"))
  })
});
