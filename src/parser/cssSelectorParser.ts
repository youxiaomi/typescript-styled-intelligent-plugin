


type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript'
import { getScssService, TemplateStringContext } from '../service/cssService'
import TsHelp from '../service/tsHelp'
import { findResult, flatten, omitUndefined, unique } from '../utils/utils'
import extractCssSelectorWorkWrap, { JsxElementNode,CandidateTextNode } from './extractCssSelector'
import * as CssNode from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import { extractStyleSheetSelectorWorkWrap } from './extractStyleSheet'
import  { getTagVariableDeclarationNode, TemplateHelper } from '../utils/templateUtil'

type StyledComponentNode = {
  type: 'styledElement',
  tsNode: ts.Node,
  scssText: string,
  parent: StyledComponentNode[]
}


export default class CssSelectorParser{

  constructor(typescript: Ts,languageService: ts.LanguageService,tsHelp: TsHelp){
    this.typescript = typescript
    this.languageService = languageService
    this.tsHelp = tsHelp
  }
  typescript:Ts
  languageService: ts.LanguageService
  tsHelp: TsHelp
  /**
   * extracting the dom node css selector
   */
  parseCssSelector = (node: ts.JsxElement | undefined):JsxElementNode[]=>{
    let languageService = this.languageService
    if(!node || node.kind != ts.SyntaxKind.JsxElement){
      return []
    }
    const extractSelectorNode =  extractCssSelectorWorkWrap({
      node,languageService,tsHelp:this.tsHelp
    })

    console.log(extractSelectorNode)
    // let aa = this.flatClassNameChildrenNodes(extractSelectorNode)
    // console.log(aa);
    return extractSelectorNode
  }
  /**
   * 获取某个字符串的存在的styledComponent组件节点
   */
  getStyledComponentNode = (fileName: string,pos:number)=>{
    let program = this.languageService.getProgram()
    let sourceFile = program?.getSourceFile(fileName);
    if(!sourceFile){
      return 
    }
    let node = this.tsHelp.findNode(sourceFile,pos) as ts.Node;
    if(!node){
      return 
    }
    if(node.kind != ts.SyntaxKind.StringLiteral){
      return
    }
    let stringNode = node as ts.StringLiteral

    let styledNode = []
    node = node.parent

    const workVariableDeclarationwork = (node:ts.VariableDeclaration)=>{
      let stringReferences = this.tsHelp.getReferences(fileName,node.getStart());
      let stringNodeReferences = stringReferences.map(reference=>{
        return this.tsHelp.findNode(sourceFile!,reference.textSpan.start)
      })
      let result = stringNodeReferences.map(referenceNode=>{
        return findStyledNode(referenceNode!)
      }).filter(item => item) as StyledComponentNode[][]
      return unique(flatten(result),(pre,current)=>{
        return pre.tsNode == current.tsNode
      })
    }
    const workJsxAttribute = (node:ts.JsxAttribute)=>{
      let { name } = node
      if(name.escapedText == 'className'){
        return findStyledNode(node.parent)
      }
    }
    const workJsxOpeningElement = (node:ts.JsxOpeningElement):StyledComponentNode[] | undefined=>{
      let identifier = this.tsHelp.getJsxOpeningElementIdentier(node);
      if(identifier){
        let definitions = this.tsHelp.getDefinition(fileName,identifier.pos);
        let isCustomeJsxElement = definitions.find(node=>this.tsHelp.isCustomJsxElement(node))
        if(isCustomeJsxElement){
          let referenceNodes = this.tsHelp.getReferenceNodes(fileName,identifier.pos) as  ts.Node[]
          let {scssText} = findResult(referenceNodes,this.tsHelp.getStyledTemplateScss) || {}
          if(scssText){
            return [
              {
                type: 'styledElement',
                scssText: scssText,
                tsNode: node.parent,
                parent: node.parent && node.parent.parent && findStyledNode(node.parent.parent) || []
              }
            ]
          }else{
            return node.parent && node.parent.parent && findStyledNode(node.parent.parent) || undefined
          }
        }else{
          //   ts
          // }
          return node.parent && node.parent.parent && findStyledNode(node.parent.parent) || undefined
        }
      }
    }
    const workJsxElement = (node: ts.JsxElement)=>{
      return findStyledNode(node)
    }
    const findStyledNode = (node:ts.Node):StyledComponentNode[]|undefined=>{
      var aa = sourceFile;var a1  = this;
      console.log(ts.SyntaxKind[node.kind],node.getFullText());
      //CallExpression getAge()
      switch(node.kind){
        case ts.SyntaxKind.VariableDeclaration:
          return workVariableDeclarationwork(node as ts.VariableDeclaration);
        // case ts.SyntaxKind.ArrowFunction:
        //   return workArrowFunction(node as ts.ArrowFunction,child);
        // case ts.SyntaxKind.ConditionalExpression:
        //   // return workConditionalExpression(node as ts.ConditionalExpression,child)
        // case ts.SyntaxKind.Identifier:
        // case ts.SyntaxKind.ReturnStatement:
        // case ts.SyntaxKind.ArrowFunction:
        // case ts.SyntaxKind.FunctionDeclaration:
        // case ts.SyntaxKind.Block:
        // case ts.SyntaxKind.CallExpression:
        // case ts.SyntaxKind.TemplateSpan:
        // case ts.SyntaxKind.TemplateExpression:
        // case ts.SyntaxKind.JsxExpression:
        // case ts.SyntaxKind.JsxAttributes:
        //   return findStyledNode(node.parent);
        case ts.SyntaxKind.JsxAttribute:
          return workJsxAttribute(node as ts.JsxAttribute);
        case ts.SyntaxKind.JsxOpeningElement:
          return workJsxOpeningElement(node as ts.JsxOpeningElement)
        case ts.SyntaxKind.JsxElement:
          return workJsxOpeningElement((node as ts.JsxElement).openingElement)
        case ts.SyntaxKind.JsxClosingElement:
          return undefined
        default:
          return findStyledNode(node.parent)
      }
    }

    let _node = findStyledNode(node)
    // let aa = this.parseCssSelector(node[0].tsNode)
    // let aa = this.parseCssSelector(node[0].parent[0].tsNode)
    // if(aa){
      this.getSelectors(_node!,stringNode)
    // }
    // console.log(aa);


    //todo  查找dom点击节点
    // while(node){
    //   console.log(ts.SyntaxKind[node.kind]);

    //   // node = node?.parent
    // }
    let references = this.languageService.getReferencesAtPosition(fileName,pos)
    
    references?.map(reference=>{
      let sourceFile = program?.getSourceFile(reference.fileName)
      let node = this.tsHelp.findNode(sourceFile!, reference.textSpan.start)
      console.log(node);
      
    })
  }

  flatClassNameChildrenNodes(node){
    // wait optmize
    // const flatArrayFn = flatten
    const flatArrayFn = (node)=>{
      let flatArray:any = []
      if(Array.isArray(node)){
        node.map((item)=>{
          let flatItem = flattenNodes(item)
          if(Array.isArray(flatItem)){
            flatArray = [...flatArray,...flatItem]
          }else{
            flatArray = [...flatArray,flatItem]
          }
        })
        return flatArray
      }else{
        return node
      }
    }
    const flattenNodes = (node)=>{
      if(node.tsNode && node.tsNode.kind == ts.SyntaxKind.JsxElement){
        let arrays = node.children || []
        let className = node.className || []
        let flatArray:any[] = []
        arrays.map((item)=>{
          let flatItem = flattenNodes(item)
          if(Array.isArray(flatItem)){
            flatArray = [...flatArray,...flatItem]
          }else{
            flatArray = [...flatArray,flatItem]
          }
        })
        node.children = flatArray
        node.className = flatArrayFn(className)
        return node
      }else{
        return flatArrayFn(node)
      } 
    }

    return flattenNodes(node)

  }
  /**
   * 从js语法中提取styleSheet中css selector
   * 
   */
  getSelectors = (styledComponentNode:StyledComponentNode[],sourceSelector:ts.StringLiteral)=>{
    let isElement = (node:JsxElementNode)=>{
      return node.type == 'styledElement' || node.type == 'intrinsicElements'
    }
    console.log(styledComponentNode);
    const findCandidateSelector = (parseCssSelectors):CandidateTextNode[]  => {
      let result: CandidateTextNode[] = []
      const matchNode = (parseCssSelectors: JsxElementNode[]) => {
        parseCssSelectors.forEach(cssSelector => {
          if (cssSelector.type == "styledElement" || cssSelector.type == "intrinsicElements") {
            let { selectors = [], children = [] } = cssSelector
            selectors.forEach(selector => {
              let { type, selectorType, children = [] } = selector
              console.log(selector);
              children.forEach(selectorNode => {
                console.log(selectorNode.text || selectorNode.tsNode.getText());
                console.log(sourceSelector.text);
                const isSame = (selectorNode, sourceSelector) => {
                  return selectorNode.tsNode == sourceSelector
                }
                if (isSame(selectorNode, sourceSelector)) {
                  console.log(selectorNode);
                  result.push(selectorNode)
                }
              })
            })
            return matchNode(children)
          }
        })
      }
      matchNode(parseCssSelectors)
      return result
    }

    const getCandidateSelector = (node:StyledComponentNode)=>{
      let result1:CandidateTextNode[]  = []
      type CondidateCssSelector = {
        tsNode: ts.Node,
        styledNode: ts.Node,
        template: ts.TemplateLiteral

      }
      let result: CandidateSelector[] = []


      if(node.type == 'styledElement'){
        if(node.scssText.match(sourceSelector.text)){
          // let parseCssSelectors = this.parseCssSelector(node.tsNode as ts.JsxElement)
          let parseCssSelectors = this.parseCssSelector(node.tsNode as ts.JsxElement);
          let cssService = getScssService()
          let cssScan = cssService.getStyleSheetScanByJsxElementNode(parseCssSelectors[0],sourceSelector);
          let cssText = cssService.getDefaultCssTextDocument(cssScan.getText())
          let styleSheet = cssService.getScssStyleSheet(cssText)

          let tsNode = parseCssSelectors[0].tsNode as ts.JsxElement
          let identiferName = this.tsHelp.getJsxOpeningElementIdentier(tsNode.openingElement)
          let styledDefintions =  this.tsHelp.getDefinitionLastNodeByIdentiferNode(identiferName!)
          let { scssText = '',template } = this.tsHelp.getStyledTemplateScss(styledDefintions) || {}
          let context = new TemplateStringContext(template!,this.tsHelp)
          let doc = cssService.generateCssTextDocument(context)
          let currentStyledComponentStyleSheet = cssService.getScssStyleSheet(doc)
          let cssNodes =  cssService.findSelectorTreeBySelector(currentStyledComponentStyleSheet,styleSheet);
          let candidateSelectors: CandidateSelector[]  = cssNodes.map(cssNode=>{
            return new CandidateSelector(cssNode, template!)
          })


          console.log(candidateSelectors);
          result = result.concat(candidateSelectors)
          // let candidateSelectors = findCandidateSelector(parseCssSelectors)
          // result = result.concat(candidateSelectors)
        }
      }
      if(node.parent && Array.isArray(node.parent)){
        node.parent.forEach((node)=>{
          let candidateSelectors =  getCandidateSelector(node)
          result = result.concat(candidateSelectors)
        })
      }
      return result
    }


    let aa = flatten(styledComponentNode.map(getCandidateSelector))
    //候选selector


    // getScssService
    return aa

  }

  getSelectorCandidateByCssNode(fileName: string, position: number){
    let program = this.languageService.getProgram()
    let sourceFile = program?.getSourceFile(fileName);
    let cssService = getScssService()


    // const sourceHelper = new StandardTemplateSourceHelper(
    //   this.typescript,
    //   {tags:['styled'],enableForStringWithSubstitutions: true},
    //   new StandardScriptSourceHelper(this.typescript,this.project),
    //   {
    //     log:()=>{}
    //   }
    //   )
  // }

    let templateNode = this.tsHelp.findNode(sourceFile!,position)
    // let templateNode2 = findNode(this.typescript, sourceFile!,position)
    let templateStringContext = new TemplateStringContext(templateNode as ts.TemplateLiteral,this.tsHelp)
    let cssTextDocument = cssService.generateCssTextDocument(templateStringContext);
    let templateNodeStyleSheet = cssService.getScssStyleSheet(cssTextDocument);
    let targetStyleSheet = extractStyleSheetSelectorWorkWrap(templateNodeStyleSheet,position,cssTextDocument);

    // let matchStyleSheet = extractStyleSheetSelectorWorkWrap(templateNodeStyleSheet,position)
    console.log(templateNode);
    let tagVariableDeclarationNode = getTagVariableDeclarationNode(templateNode)

    if(tagVariableDeclarationNode){
      let referenceNodes = omitUndefined(this.tsHelp.getReferenceNodes(fileName, tagVariableDeclarationNode.pos));
      let cssSelectorDomNodes = this.parseCssSelector(referenceNodes[0] as ts.JsxElement);
      cssSelectorDomNodes.map( cssSelectorDomNode =>{
        let { } = cssSelectorDomNode
        if(cssSelectorDomNode.type == 'styledElement'){
          let { children = [], selectors = [] } = cssSelectorDomNode
          let cssScan = cssService.getStyleSheetScanByJsxElementNode(cssSelectorDomNode);
          let cssText = cssScan.getText()
          let cssdoc = cssService.getDefaultCssTextDocument(cssText)
          let styleSheet = cssService.getScssStyleSheet(cssdoc)
          let result = cssService.findSelectorTreeBySelector(targetStyleSheet!,styleSheet)
          result.forEach(res =>{
            let textNode = cssScan.getTextNode(cssdoc.getOffsetInFile(res.offset))
            if(textNode?.node.type =='selectorNode'){
              let tsNode = textNode?.node.tsNode
              let fileOffset = tsNode.getSourceFile().getFullText().slice(tsNode.pos)
            }
          })

          if(children.length){

          }
        }
       
      })


      // referenceNodes.map(node=>{
      //   this.parseCssSelector(node as ts.JsxElement)

      // })
    }

    // let templateUtil =  new TemplateUtil(this.typescript, new TemplateHelper(this.typescript,this.languageService))
    // templateUtil.getTemplate(fileName,position)

    // extractStyleSheetSelectorWorkWrap
    // cssService.getCssSelectorNode

  }

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

class CandidateSelector {
  constructor(cssNode: CssNode.Node, templateNode: ts.TemplateLiteral ){
    this.cssNode = cssNode
    this.templateNode = templateNode
  }
  cssNode: CssNode.Node
  templateNode : ts.TemplateLiteral
  


}


// containerKind:
// undefined
// containerName:
// ''
// contextSpan:
// {start: 533, length: 158}
// failedAliasResolution:
// false
// fileName:
// 'example/index.tsx'
// isAmbient:
// false
// isLocal:
// true
// kind:
// 'function'
// name:
// 'ShowMemeber'
// textSpan:
// {start: 519, length: 11}
// unverified:
// false



// containerKind:
// undefined
// containerName:
// 'JSX.IntrinsicElements'
// contextSpan:
// {start: 141545, length: 83}
// failedAliasResolution:
// false
// fileName:
// 'example/node_modules/@types/react/index.d.ts'
// isAmbient:
// true
// isLocal:
// false
// kind:
// 'property'
// name:
// 'div'
// textSpan:
// {start: 141545, length: 3}
// unverified:
// false