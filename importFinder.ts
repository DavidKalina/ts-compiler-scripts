import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

interface ComponentNode {
  name: string;
  children: ComponentNode[];
  hasReactBootstrap: boolean;
  importedBootstrapComponents: string[];
}

const bootstrapComponents: Set<string> = new Set();

function getReactBootstrapImports(node: ts.Node): string[] {
  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
    if (/react-bootstrap/.test(node.moduleSpecifier.getText())) {
      const importClause = node.importClause;
      if (importClause && ts.isNamedImports(importClause.namedBindings as ts.NamedImports)) {
        return (importClause.namedBindings as ts.NamedImports).elements.map((element) =>
          element.name.getText()
        );
      }
    }
  }
  return [];
}

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

// Define the node structure

function traverseTsxFiles(filePath: string, visitedFiles: Set<string>): ComponentNode | null {
  if (visitedFiles.has(filePath)) {
    return null; // Avoid circular dependencies
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
      return null;
    }
  } else if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return null;
  }

  const fileContent = fs.readFileSync(filePath).toString();
  const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);

  let hasReactBootstrapImport = false;
  const children: ComponentNode[] = [];
  let importedComponents: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    const reactBootstrapImports = getReactBootstrapImports(node);

    if (reactBootstrapImports.length > 0) {
      importedComponents = importedComponents.concat(reactBootstrapImports);
      bootstrapComponents.add(filePath);
    }

    if (isReactBootstrapImport(node)) {
      hasReactBootstrapImport = true;
      bootstrapComponents.add(filePath);
    }

    getTsxImportReferences(node).forEach((importPath) => {
      const absoluteImportPath = path.resolve(path.dirname(filePath), importPath);
      const childNode = traverseTsxFiles(absoluteImportPath, visitedFiles);
      if (childNode) {
        children.push(childNode);
      }
    });
  });

  if (!hasReactBootstrapImport && children.length === 0) {
    return null;
  }

  return {
    name: filePath,
    children: children,
    hasReactBootstrap: hasReactBootstrapImport,
    importedBootstrapComponents: importedComponents,
  };
}

const outputDir = "./output";

// Entry point
const rootTsxFile = process.env.ROOT_PATH!;

const visitedFiles = new Set<string>();
const rootNode = traverseTsxFiles(rootTsxFile, visitedFiles);

console.log(`Found ${bootstrapComponents.size} files that import react-bootstrap.`);

// Write the results to a JSON file
if (rootNode) {
  fs.writeFileSync(
    `${outputDir}/bootstrapComponentsHierarchy.json`,
    JSON.stringify(rootNode, null, 4)
  );
}

fs.writeFileSync(
  `${outputDir}/bootstrapComponentsList.json`,
  JSON.stringify(Array.from(bootstrapComponents), null, 4)
);
