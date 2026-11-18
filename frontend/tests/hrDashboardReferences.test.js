import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default || traverseModule;
const browserGlobals = new Set(["window", "document", "localStorage", "console", "URL", "fetch", "Blob", "FileReader", "Image", "setTimeout", "clearTimeout", "requestAnimationFrame", "crypto"]);
const directory = new URL("../src/final_hr_dashboard/", import.meta.url);
for (const file of readdirSync(directory).filter((name) => /\.(jsx|js)$/.test(name) && !name.endsWith(".test.js"))) {
  test(`${file} has no undefined application references`, () => {
    const ast = parse(readFileSync(new URL(file, directory), "utf8"), { sourceType: "module", plugins: ["jsx"] });
    const missing = new Set();
    traverse(ast, { ReferencedIdentifier(path) {
      const name = path.node.name;
      if (!path.scope.hasBinding(name) && !browserGlobals.has(name)) missing.add(`${name}:${path.node.loc.start.line}`);
    } });
    assert.deepEqual([...missing], []);
  });
}
