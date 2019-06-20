const getConfig = require("./index");

const configOf = (name, options = {}) => getConfig(`${__dirname}/../docs/example-${name}`, options);
const expected = name => require(`${__dirname}/../docs/example-${name}.json`);

describe("getConfig", () => {
  it("should create config", () => {
    expect(configOf("standard")).toEqual(expected("standard"));
  });

  it("should throw for missing README.md in Navbar", () => {
    expect(() => configOf("missing-readme", { skipEmptyNavbar: false })).toThrow("README.md file cannot be found");
  });

  it("should skip Navbar item for missing README.md", () => {
    expect(configOf("missing-readme")).toEqual(expected("missing-readme"));
  });

  it("should skip Navbar item for missing README.md", () => {
    expect(configOf("no-navbar")).toEqual(expected("no-navbar"));
  });
});

console.log(require("util").inspect(configOf("simple-nav"), { depth: null, showHidden: false, colors: true }));

const a = {
  nav: [],
  sidebar: [
    { title: "Guide", children: ["01.guide/"] },
    {
      title: "Api",
      children: [{ title: "Classes", children: ["02.api/classes/member"] }]
    }
  ]
};
