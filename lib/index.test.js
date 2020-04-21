const getConfig = require("./index");

const configOf = (name, options = {}) => getConfig(`${__dirname}/../docs/example-${name}`, options);
const expected = name => require(`${__dirname}/../docs/example-${name}.json`);

describe("getConfig", () => {
  it("should create config.", () => {
    expect(configOf("standard")).toEqual(expected("standard"));
  });

  it("should create config without adding readme to first group.", () => {
    expect(configOf("standard", { addReadMeToFirstGroup: false })).toEqual(expected("standard-no-readme-move"));
  });

  it("should throw for missing README.md in Navbar.", () => {
    expect(() => configOf("missing-readme", { skipEmptyNavbar: false })).toThrow("README.md file cannot be found");
  });

  it("should skip Navbar item for missing README.md.", () => {
    expect(configOf("missing-readme")).toEqual(expected("missing-readme"));
  });

  it("should not fail when a folder only has subdirectories.", () => {
    expect(configOf("deep-readme")).toEqual(expected("deep-readme"));
  });

  it("should skip Navbar item for missing README.md.", () => {
    expect(configOf("no-navbar")).toEqual(expected("no-navbar"));
  });

  it("translate chinese to pinyin.", async () => {
    expect(configOf("中文", { pinyinNav: true })).toEqual(expected("chinese"));
  });

  it("sort file and folder by prefix.", async () => {
    expect(configOf("sort")).toEqual(expected("sort"));
  });

  it("should create with README.md in root.", () => {
    expect(configOf("with-root-readme")).toEqual(expected("with-root-readme"));
  });
});
