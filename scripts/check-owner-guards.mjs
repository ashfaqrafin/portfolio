#!/usr/bin/env node
/* CI guard: every server action must begin with `await requireOwner()`.

   Scans app/ and lib/ for modules with a top-level "use server" directive and for
   functions with an inline "use server" directive, and fails when one of those
   functions does not start with exactly `await requireOwner();`.
   Allow-listed (public by necessity): signOutAction, signInWithGitHub. */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIRS = ["app", "lib"];
const ALLOW = new Map([
  ["signOutAction", "app/studio/actions.ts"],
  ["signInWithGitHub", "app/signin/actions.ts"],
]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) yield p;
  }
}

const hasUseServer = (stmts) => {
  for (const s of stmts) {
    if (!ts.isExpressionStatement(s) || !ts.isStringLiteral(s.expression)) return false;
    if (s.expression.text === "use server") return true;
  }
  return false;
};
const skipDirectives = (stmts) => {
  let i = 0;
  while (i < stmts.length && ts.isExpressionStatement(stmts[i]) && ts.isStringLiteral(stmts[i].expression)) i++;
  return stmts.slice(i);
};
const startsWithGuard = (body) => {
  if (!body || !ts.isBlock(body)) return false;
  const first = skipDirectives(body.statements)[0];
  if (!first || !ts.isExpressionStatement(first)) return false;
  const e = first.expression;
  return (
    ts.isAwaitExpression(e) &&
    ts.isCallExpression(e.expression) &&
    ts.isIdentifier(e.expression.expression) &&
    e.expression.expression.text === "requireOwner" &&
    e.expression.arguments.length === 0
  );
};

const failures = [];
const checked = [];

function check(name, fn, rel) {
  if (ALLOW.get(name) === rel) {
    checked.push(`${rel}#${name} (allow-listed)`);
    return;
  }
  if (!startsWithGuard(fn.body)) failures.push(`${rel}: action "${name}" does not begin with \`await requireOwner()\``);
  else checked.push(`${rel}#${name}`);
}

for (const dir of DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("use server")) continue;
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

    if (hasUseServer(sf.statements)) {
      // module-level: every export is a server action
      for (const s of sf.statements) {
        const exported = s.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        if (ts.isFunctionDeclaration(s) && exported) check(s.name?.text ?? "default", s, rel);
        else if (ts.isVariableStatement(s) && exported) {
          for (const d of s.declarationList.declarations) {
            const init = d.initializer;
            if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) check(d.name.getText(sf), init, rel);
            else failures.push(`${rel}: export "${d.name.getText(sf)}" in a "use server" module is not a function it can check`);
          }
        } else if (ts.isExportDeclaration(s) || ts.isExportAssignment(s)) {
          failures.push(`${rel}: re-exports from a "use server" module are not allowed (they hide the guard)`);
        }
      }
    }

    // inline "use server" functions anywhere in the file
    const visit = (node) => {
      if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) && node.body && ts.isBlock(node.body)) {
        if (node.parent !== sf && hasUseServer(node.body.statements)) {
          const name = node.name?.getText(sf) ?? (ts.isVariableDeclaration(node.parent) ? node.parent.name.getText(sf) : "(inline)");
          check(name, node, rel);
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sf, visit);
  }
}

if (!checked.some((c) => c.startsWith("app/studio/actions.ts#save"))) failures.push("sanity: did not find the studio's save action; is the scan broken?");

for (const c of checked) console.log(`  ok  ${c}`);
if (failures.length) {
  for (const f of failures) console.error(`  FAIL ${f}`);
  console.error(`\ncheck:guards failed: ${failures.length} problem(s)`);
  process.exit(1);
}
console.log(`\ncheck:guards passed: ${checked.length} server action(s) checked`);
