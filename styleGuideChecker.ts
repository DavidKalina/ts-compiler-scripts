import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

const BASE_DIR = path.resolve("../../flowty/packages/web"); // Adjust this to your project's root directory if necessary

const ASSET_RULE = /.*\.(jpg|jpeg|png|gif|svg|webp)$/;

const isComponent = (sourceFile: ts.SourceFile): boolean => {
  let isComp = false;

  const visit = (node: ts.Node) => {
    // Check for JSX elements
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      isComp = true;
      return;
    }

    // Check for React class components
    if (
      ts.isClassDeclaration(node) &&
      node.heritageClauses &&
      node.heritageClauses.some((hc) =>
        hc.types.some(
          (t) =>
            t.expression.getText(sourceFile) === "React.Component" ||
            t.expression.getText(sourceFile) === "React.PureComponent"
        )
      )
    ) {
      isComp = true;
      return;
    }

    // Check for React functional components (by type)
    if (
      ts.isVariableDeclaration(node) &&
      node.type &&
      (node.type.getText(sourceFile) === "React.FC" ||
        node.type.getText(sourceFile) === "React.FunctionComponent")
    ) {
      isComp = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return isComp;
};

const isContextFile = (sourceFile: ts.SourceFile): boolean => {
  let isContext = false;
  const visit = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier.getText(sourceFile).includes("react") &&
      node.importClause
    ) {
      const namedBindings = node.importClause.namedBindings;
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        for (const element of namedBindings.elements) {
          if (element.name.getText(sourceFile) === "createContext") {
            isContext = true;
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return isContext;
};

const categorizeTSFile = (filePath: string): string => {
  const program = ts.createProgram([filePath], {});
  const sourceFile = program.getSourceFile(filePath);

  if (!sourceFile) return "";

  if (isContextFile(sourceFile)) {
    return "contexts";
  }

  if (isComponent(sourceFile)) {
    return "components";
  }
  // Extend with more categorizations based on the file's content...

  return ""; // Default
};

const moveFile = (src: string, targetDir: string) => {
  const target = path.join(targetDir, path.basename(src));
  if (src !== target) {
    fs.renameSync(src, target);
    console.log(`Moved: ${src} -> ${target}`);
  }
};

const checkDirectory = (directory: string) => {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const currentPath = path.join(directory, file);

    if (fs.statSync(currentPath).isDirectory()) {
      checkDirectory(currentPath);
    } else {
      if (ASSET_RULE.test(file)) {
        moveFile(currentPath, path.join(BASE_DIR, "src", "assets"));
      } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        const category = categorizeTSFile(currentPath);
        if (category) {
          moveFile(currentPath, path.join(BASE_DIR, "src", category));
        }
      }
    }
  }
};

checkDirectory(BASE_DIR);
