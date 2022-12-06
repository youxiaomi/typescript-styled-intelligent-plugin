// import * as ts from 'typescript/lib/tsserverlibrary';
import * as ts from 'typescript';


export class TemplateHelper  {
    constructor(
        private readonly typescript: typeof ts,
        private readonly languageService: ts.LanguageService
        // private readonly project: ts.server.Project
    ) { }

    public getNode(fileName: string, position: number) {
        const sourceFile = this.getSourceFile(fileName);
        return sourceFile && findNode(this.typescript, sourceFile, position);
    }

    public getAllNodes(fileName: string, cond: (n: ts.Node) => boolean): ReadonlyArray<ts.Node> {
        const sourceFile = this.getSourceFile(fileName);
        return sourceFile ? findAllNodes(this.typescript, sourceFile, cond) : [];
    }

    // public getLineAndChar(fileName: string, position: number): ts.LineAndCharacter {
    public getLineAndChar(fileName: string, position: number){
        // const scriptInto = this.project.getScriptInfo(fileName);
        // if (!scriptInto) {
        //     return { line: 0, character: 0 };
        // }
        // const location = scriptInto.positionToLineOffset(position);
        // return { line: location.line - 1, character: location.offset - 1 };
    }

    public getOffset(fileName: string, line: number, character: number) {
        // const scriptInto = this.project.getScriptInfo(fileName);
        // if (!scriptInto) {
        //     return 0;
        // }
        // return scriptInto.lineOffsetToPosition(line + 1, character + 1);
    }

    private getProgram() {
        return this.languageService.getProgram();
    }

    private getSourceFile(fileName: string) {
        const program = this.getProgram();
        return program ? program.getSourceFile(fileName) : undefined;
    }
}


export interface TemplateSettings {
  /**
   * Set of tags that identify which tagged templates to process.
   *
   * The tag string may be matched at either the start or the end of the template's tag.
   */
  readonly tags: ReadonlyArray<string>;

  /**
   * Should templates with substitutions be processed?
   *
   * Defaults to false.
   */
  readonly enableForStringWithSubstitutions?: boolean;

  /**
   * Retrieve a string that is used internally in place of the substitution expression.
   *
   * @param templateString The raw template string with all `${substitution}` in place.
   * @param start Start index of the range in `templateString` to replace.
   * @param end End index of the range in `templateString` to replace.
   *
   * @return Replacement string. Must be the of length `end - start`.
   */
  getSubstitution?(
      templateString: string,
      start: number,
      end: number
  ): string;

  /**
   * Retrieve a string that is used internally in place of the substitution expression.
   *
   * If this is implemented, `getSubstitution` will not be called.
   *
   * @param templateString The raw template string with all `${substitution}` in place.
   * @param spans List of placeholder spans.
   *
   * @return Replacement string. Must be the exact same length as the input string
   */
  getSubstitutions?(
      templateString: string,
      spans: ReadonlyArray<{ start: number, end: number }>
  ): string;
}


interface TemplateContext {
  // readonly typescript: typeof ts;

  /**
   * Name of the file the template is in.
   */
  readonly fileName: string;

  /**
   * Contents of the template string.
   *
   * Has substitutions already replaced.
   */
  readonly text: string;

  /**
   * Raw contents of the template string.
   *
   * Still has substitutions in place.
   */
  readonly rawText: string;

  /**
   * AST node.
   */
  readonly node: ts.TemplateLiteral;

  /**
   * Map a location from within the template string to an offset within the template string
   */
  toOffset(location: ts.LineAndCharacter): number;

  /**
   * Map an offset within the template string to a location within the template string
   */
  toPosition(offset: number): ts.LineAndCharacter;
}


export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function relative(from: ts.LineAndCharacter, to: ts.LineAndCharacter): ts.LineAndCharacter {
    return {
        line: to.line - from.line,
        character: to.line === from.line ? to.character - from.character : to.character,
    };
}

export function findNode(
    typescript: typeof ts,
    sourceFile: ts.SourceFile,
    position: number
): ts.Node | undefined {
    function find(node: ts.Node): ts.Node | undefined {
        if (position >= node.getStart() && position < node.getEnd()) {
            return typescript.forEachChild(node, find) || node;
        }
    }
    return find(sourceFile);
}

export function findAllNodes(
    typescript: typeof ts,
    sourceFile: ts.SourceFile,
    cond: (n: ts.Node) => boolean
): ReadonlyArray<ts.Node> {
    const result: ts.Node[] = [];
    function find(node: ts.Node) {
        if (cond(node)) {
            result.push(node);
            return;
        } else {
            typescript.forEachChild(node, find);
        }
    }
    find(sourceFile);
    return result;
}

export function isTaggedLiteral(
    typescript: typeof ts,
    node: ts.NoSubstitutionTemplateLiteral,
    tags: ReadonlyArray<string>
): boolean {
    if (!node || !node.parent) {
        return false;
    }
    if (node.parent.kind !== typescript.SyntaxKind.TaggedTemplateExpression) {
        return false;
    }
    const tagNode = node.parent as ts.TaggedTemplateExpression;
    return isTagged(tagNode, tags);
}

export function isTagged(node: ts.TaggedTemplateExpression, tags: ReadonlyArray<string>): boolean {
  const text = node.tag.getText();
  return tags.some(tag =>
      text === tag
      || new RegExp(`$${escapeRegExp(tag)}\\s*^`).test(text)
      || text.startsWith(tag + '.')
      || text.endsWith('.' + tag)
      || text.startsWith(tag + '(')
      || text.startsWith(tag + '<')
      || text.startsWith(tag + '[')
  );
}

// const defaultConfiguration: StyledPluginConfiguration = {
const defaultConfiguration  = {
  tags: ['styled', 'css', 'extend', 'injectGlobal', 'createGlobalStyle', 'keyframes'],
  // validate: true,
  // lint: {
  //     emptyRules: 'ignore',
  // },
  // emmet: {},
};


export default class TemplateUtil {
  constructor(
      private readonly typescript: typeof ts,
      private readonly helper: TemplateHelper,
      templateStringSettings?: TemplateSettings,
      // private readonly helper: ScriptSourceHelper,
  ) {
    this.templateStringSettings = templateStringSettings  || defaultConfiguration
   }
   templateStringSettings: TemplateSettings
  public getTemplate(
      fileName: string,
      position: number
  ) {
      const node = this.getValidTemplateNode(
          this.templateStringSettings,
          this.helper.getNode(fileName, position));
      if (!node) {
          return undefined;
      }

      // Make sure we are inside the template string
      if (position <= node.pos) {
          return undefined;
      }

      // Make sure we are not inside of a placeholder
      if (node.kind === this.typescript.SyntaxKind.TemplateExpression) {
          let start = node.head.end;
          for (const child of node.templateSpans.map(x => x.literal)) {
              const nextStart = child.getStart();
              if (position >= start && position <= nextStart) {
                  return undefined;
              }
              start = child.getEnd();
          }
      }
      return node
      // return new StandardTemplateContext(
      //     this.typescript,
      //     fileName,
      //     node,
      //     this.helper,
      //     this.templateStringSettings);
  }

  public getAllTemplates(
      fileName: string
  ): ReadonlyArray<TemplateContext> {
      const out: TemplateContext[] = [];
      for (const node of this.helper.getAllNodes(fileName, n => this.getValidTemplateNode(this.templateStringSettings, n) !== undefined)) {
          const validNode = this.getValidTemplateNode(this.templateStringSettings, node);
          if (validNode) {
              // out.push(new StandardTemplateContext(this.typescript, fileName, validNode, this.helper, this.templateStringSettings));
          }
      }
      return out;
  }

//   public getRelativePosition(
//       context: TemplateContext,
//       offset: number
//   ): ts.LineAndCharacter {
//       const baseLC = this.helper.getLineAndChar(context.fileName, context.node.getStart() + 1);
//       const cursorLC = this.helper.getLineAndChar(context.fileName, offset);
//       return relative(baseLC, cursorLC);
//   }

  private getValidTemplateNode(
      templateStringSettings: TemplateSettings,
      node: ts.Node | undefined
  ): ts.TemplateLiteral | undefined {
      if (!node) {
          return undefined;
      }
      switch (node.kind) {
          case this.typescript.SyntaxKind.TaggedTemplateExpression:
              if (isTagged(node as ts.TaggedTemplateExpression, templateStringSettings.tags)) {
                  return (node as ts.TaggedTemplateExpression).template;
              }
              return undefined;

          case this.typescript.SyntaxKind.NoSubstitutionTemplateLiteral:
              if (isTaggedLiteral(this.typescript, node as ts.NoSubstitutionTemplateLiteral, templateStringSettings.tags)) {
                  return node as ts.NoSubstitutionTemplateLiteral;
              }
              return undefined;

          case this.typescript.SyntaxKind.TemplateHead:
              if (templateStringSettings.enableForStringWithSubstitutions && node.parent && node.parent.parent) {
                  return this.getValidTemplateNode(templateStringSettings, node.parent.parent);
              }
              return undefined;

          case this.typescript.SyntaxKind.TemplateMiddle:
          case this.typescript.SyntaxKind.TemplateTail:
              if (templateStringSettings.enableForStringWithSubstitutions && node.parent && node.parent.parent) {
                  return this.getValidTemplateNode(templateStringSettings, node.parent.parent.parent);
              }
              return undefined;

          default:
              return undefined;
      }
  }
}