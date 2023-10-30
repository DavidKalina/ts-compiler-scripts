import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

function isReactBootstrapImport(node: ts.Node): boolean {
  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
    return /react-bootstrap/.test(node.moduleSpecifier.getText());
  }
  return false;
}

function getTsxImportReferences(node: ts.Node): string[] {
  const references: string[] = [];
  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
    const importPath = node.moduleSpecifier.text;
    references.push(importPath);
  }
  return references;
}

const bootstrapImportedComponents: Set<string> = new Set();

function traverseTsxFiles(filePath: string, visitedFiles: Set<string>): boolean {
  if (visitedFiles.has(filePath)) {
    return false; // Avoid circular dependencies
  }

  visitedFiles.add(filePath);

  // If the file doesn't exist, try appending .tsx and checking again.
  if (!fs.existsSync(filePath)) {
    filePath = filePath + ".tsx";
  }

  // If the path is a directory, try looking for an index.tsx inside it.
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.tsx");
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return false;
    }
  } else if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  const fileContent = fs.readFileSync(filePath).toString();
  const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);

  let hasReactBootstrapImport = false;

  ts.forEachChild(sourceFile, (node) => {
    if (isReactBootstrapImport(node)) {
      bootstrapImportedComponents.add(filePath);
    }

    getTsxImportReferences(node).forEach((importPath) => {
      const absoluteImportPath = path.resolve(path.dirname(filePath), importPath);
      traverseTsxFiles(absoluteImportPath, visitedFiles);
    });
  });

  if (hasReactBootstrapImport) {
    console.log(`React-Bootstrap import found in: ${filePath}`);
  }

  return hasReactBootstrapImport;
}

// Entry point
const rootTsxFile = "../../flowty-app/packages/web/src/components.tsx";
const visitedFiles = new Set<string>();
traverseTsxFiles(rootTsxFile, visitedFiles);

fs.writeFileSync(
  "bootstrapComponents.json",
  JSON.stringify(Array.from(bootstrapImportedComponents), null, 4)
);
