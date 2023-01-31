


type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript'
import { getScssService, TemplateStringContext } from '../service/cssService'
import TsHelp from '../service/tsHelp'
import { findResult, flatten, omitUndefined, unique } from '../utils/utils'
import extractCssSelectorWorkWrap, { JsxElementNode,CandidateTextNode, JsxElementSelector } from './extractCssSelector'
import * as CssNode from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import { extractStyleSheetSelectorWorkWrap } from './extractStyleSheet'
import  {  TemplateHelper } from '../utils/templateUtil'
import { createStyleSheetAbstractSyntaxTree, TargetSelector } from '../factory/nodeFactory'
import { JsxParser, ParentReferenceNode } from './jsxParser'
import { NodeType } from '../utils/cssNodes'

export type StyledComponentNode = {
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

    // console.log(extractSelectorNode)
    // let aa = this.flatClassNameChildrenNodes(extractSelectorNode)
    // console.log(aa);
    return extractSelectorNode
  }
  getSelectorPostion = (stringNode: ts.StringLiteral)=>{
    let text = stringNode.getFullText()
    text.slice(0)

  }
  /**
   * 获取某个字符串的存在的styledComponent组件节点
   */
  getStyledComponentNode = (fileName: string,pos:number):ts.DefinitionInfoAndBoundSpan | undefined=>{
    let program = this.languageService.getProgram()
    let sourceFile = program?.getSourceFile(fileName);
    if(!sourceFile){
      return 
    }
    let node = this.tsHelp.findNode(sourceFile,pos) as ts.Node;
    if(!node){
      return 
    }
    //todo TemplateHead   LastTemplateToken
    // if(node.kind != ts.SyntaxKind.StringLiteral && node.kind != ts.SyntaxKind.TemplateHead && node.kind != ts.SyntaxKind.LastTemplateToken && node.kind != ts.SyntaxKind.TemplateMiddle){
    //   return
    // }
    if(!TargetSelector.isValidSelector(node)){
      return undefined
    }
    let targetSelector = new TargetSelector(node, pos)
    // let stringNode = node as ts.StringLiteral
    // let selectors = stringNode.getText().split(' ').map(item => item.trim())
    // node = node.parent

    // const workVariableDeclarationwork = (node:ts.VariableDeclaration)=>{
    //   let stringReferences = this.tsHelp.getReferences(fileName,node.getStart());
    //   let stringNodeReferences = stringReferences.map(reference=>{
    //     return this.tsHelp.findNode(sourceFile!,reference.textSpan.start)
    //   })
    //   let result = stringNodeReferences.map(referenceNode=>{
    //     return findStyledNode(referenceNode!)
    //   }).filter(item => item) as StyledComponentNode[][]
      
    //   return unique(flatten(result),(pre,current)=>{
    //     return pre.tsNode == current.tsNode
    //   })
    // }
    // const workJsxAttribute = (node:ts.JsxAttribute)=>{
    //   let { name } = node
    //   if(name.escapedText == 'className' || name.escapedText == 'id'){
    //     return findStyledNode(node.parent)
    //   }
    // }
    // const workJsxOpeningElement = (node:ts.JsxOpeningElement):StyledComponentNode[] | undefined=>{
    //   let identifier = this.tsHelp.getJsxOpeningElementIdentier(node);
    //   if(identifier){
    //     let definitions = this.tsHelp.getDefinition(fileName,identifier.pos);
    //     let isCustomeJsxElement = definitions.find(node=>this.tsHelp.isCustomJsxElement(node))
    //     if(isCustomeJsxElement){
    //       let referenceNodes = this.tsHelp.getReferenceNodes(fileName,identifier.pos) as  ts.Node[]
    //       let {sassText} = findResult(referenceNodes,this.tsHelp.getStyledTemplateScss) || {}
    //       if(sassText){
    //         return [
    //           {
    //             type: 'styledElement',
    //             scssText: sassText,
    //             tsNode: node.parent,
    //             parent: node.parent && node.parent.parent && findStyledNode(node.parent.parent) || []
    //           }
    //         ]
    //       }else{
    //         return node.parent && node.parent.parent && findStyledNode(node.parent.parent) || undefined
    //       }
    //     }else{
    //       return node.parent && node.parent.parent && findStyledNode(node.parent.parent) || undefined
    //     }
    //   }
    // }
    // // const workJsxElement = (node: ts.JsxElement)=>{
    // //   return findStyledNode(node)
    // // }
    // const findStyledNode = (node:ts.Node):StyledComponentNode[]|undefined=>{
    //   console.log(ts.SyntaxKind[node.kind],node.getFullText());
    //   switch(node.kind){
    //     case ts.SyntaxKind.VariableDeclaration:
    //       return workVariableDeclarationwork(node as ts.VariableDeclaration);
    //     case ts.SyntaxKind.JsxAttribute:
    //       return workJsxAttribute(node as ts.JsxAttribute);
    //     case ts.SyntaxKind.JsxOpeningElement:
    //       return workJsxOpeningElement(node as ts.JsxOpeningElement)
    //     case ts.SyntaxKind.JsxElement:
    //       return workJsxOpeningElement((node as ts.JsxElement).openingElement)
    //     case ts.SyntaxKind.JsxClosingElement:
    //       return undefined
    //     default:
    //       return findStyledNode(node.parent)
    //   }
    // }
    const jsxParser = new JsxParser(this.typescript,this.languageService,this.tsHelp)
    let styledComponentNode  = jsxParser.findStyledNodeOfParent(node,fileName)
    // let styledComponentNode = findStyledNode(node) || []
    let definitions = this.getSelectors(styledComponentNode!, targetSelector);
    if(!definitions.length){
      return undefined
    }
    return {
      definitions:definitions,
      textSpan:{
        start: targetSelector.selectorStart,
        length: targetSelector.selectorText.length
      }
    }
    // let references = this.languageService.getReferencesAtPosition(fileName,pos)
    
    // references?.map(reference=>{
    //   let sourceFile = program?.getSourceFile(reference.fileName)
    //   let node = this.tsHelp.findNode(sourceFile!, reference.textSpan.start)
    //   console.log(node);
    // })
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
  getSelectors = (styledComponentNode:ParentReferenceNode[],targetSelector:TargetSelector)=>{
    // let isElement = (node:JsxElementNode)=>{
    //   return node.type == 'styledElement' || node.type == 'intrinsicElements'
    // }
    // console.log(styledComponentNode);
    const getCandidateSelector = (node:ParentReferenceNode)=>{
      let result: ts.DefinitionInfo[] = []


      if(node.type == 'styledElement'){
        let { sassText } = this.tsHelp.getStyledTemplateScss(node.referenceNode) || {}
        if(sassText && sassText.match(targetSelector.selectorText)){
          // let parseCssSelectors = this.parseCssSelector(node.tsNode as ts.JsxElement)
          let parseCssSelectors = this.parseCssSelector(node.tsNode as ts.JsxElement);
          let cssService = getScssService();
          let cssScan = cssService.getStyleSheetScanByJsxElementNode(parseCssSelectors[0],targetSelector);
          // new TemplateStringContext();
          let formatStyleSheet = cssService.fromatText(cssService.getDefaultCssTextDocument(cssScan.getText()))
          let cssDoc = cssService.getDefaultCssTextDocument(formatStyleSheet)
          let styleSheet = cssService.getScssStyleSheet(cssDoc)

          let tsNode = parseCssSelectors[0].tsNode as ts.JsxElement
          let identiferName = this.tsHelp.getJsxOpeningElementIdentier(tsNode.openingElement)
          let styledDefintions =  this.tsHelp.getDefinitionLastNodeByIdentiferNode(identiferName!)
          let { sassText = '',template,TaggedTemplateNode } = this.tsHelp.getStyledTemplateScss(styledDefintions) || {}
          let context = new TemplateStringContext(template!,this.tsHelp)
          let doc = cssService.generateCssTextDocument(context)
          let currentStyledComponentStyleSheet = cssService.getScssStyleSheet(doc)
          // let cssNodes =  cssService.findSelectorTreeBySelector(currentStyledComponentStyleSheet,styleSheet);
          //
          // let cssNodes =  cssService.findSelectorTreeBySelector(styleSheet,currentStyledComponentStyleSheet,true);
          let targetTree = createStyleSheetAbstractSyntaxTree(currentStyledComponentStyleSheet)
          let sourceTree = createStyleSheetAbstractSyntaxTree(styleSheet)

          const  { matchSourceNodes,matchTargetNodes } =  cssService.matchCssSelectorNodes(targetTree,sourceTree);

          let cssNodes = Array.from(matchTargetNodes).map(item => item.node)
          cssNodes = unique(cssNodes,(pre,current)=>pre.offset == current.offset);
          cssNodes = cssNodes.filter(item => {
            let selectorText = item.getText()

            if([NodeType.ClassSelector,NodeType.IdentifierSelector].includes(item.type)){
              selectorText = selectorText.slice(1)
            }
            return selectorText == targetSelector.selectorText
          })
          let fileName = context.getFileName();


          const definitions: ts.DefinitionInfo[] = cssNodes.map(node=>{
            return {
              fileName,
              kind: ts.ScriptElementKind.string,
              name:'',
              containerKind: ts.ScriptElementKind.string,
              containerName:'',
              textSpan:{
                // start: doc.getOffsetInFile(cssService.getSelectorIdentierOffset(node)),
                start: doc.getOffsetInFile(node.offset),
                length: node.length
              }
            }
          })

          console.log(definitions);
          result = result.concat(definitions)
          // let candidateSelectors = findCandidateSelector(parseCssSelectors)
          // result = result.concat(candidateSelectors)
        }
      }
      // all parent styledElement
      // if(node.parent && Array.isArray(node.parent)){
      //   node.parent.forEach((node)=>{
      //     let candidateSelectors =  getCandidateSelector(node)
      //     result = result.concat(candidateSelectors)
      //   })
      // }
      return result
    }


    let definitions = flatten(styledComponentNode.map(getCandidateSelector))
    //候选selector

    return definitions
    // getScssService

  }

  getSelectorCandidateByCssNode(fileName: string, position: number):ts.DefinitionInfoAndBoundSpan | undefined{
    let program = this.languageService.getProgram()
    let sourceFile = program?.getSourceFile(fileName);
    let cssService = getScssService()
   
    // let templateNode = this.tsHelp.findNode(sourceFile!,position)
    let templateNode = this.tsHelp.getTemplateNode(sourceFile!,position)
    let templateStringContext = new TemplateStringContext(templateNode as ts.TemplateLiteral,this.tsHelp)
    let cssTextDocument = cssService.generateCssTextDocument(templateStringContext);
    let templateNodeStyleSheet = cssService.getScssStyleSheet(cssTextDocument);
    let {styleSheet: targetStyleSheet,targetNode } = extractStyleSheetSelectorWorkWrap(templateNodeStyleSheet,position,cssTextDocument) || {};
    
    const definitions: ts.DefinitionInfo[] = []
    // let matchStyleSheet = extractStyleSheetSelectorWorkWrap(templateNodeStyleSheet,position)
    // console.log(templateNode);
    let tagVariableDeclarationNode = this.tsHelp.getTagVariableDeclarationNode(templateNode)

    if(tagVariableDeclarationNode){
      let referenceNodes = omitUndefined(this.tsHelp.getReferenceNodes(fileName, tagVariableDeclarationNode.pos));
      referenceNodes = referenceNodes.filter(item => item.kind == ts.SyntaxKind.JsxElement);

      const findDefinition = (referenceNode) => {
        let cssSelectorDomNodes = this.parseCssSelector(referenceNode as ts.JsxElement);
        cssSelectorDomNodes.map(cssSelectorDomNode => {
          if (cssSelectorDomNode.type == 'styledElement') {
            let { children = [], selectors = [] } = cssSelectorDomNode
            let cssScan = cssService.getStyleSheetScanByJsxElementNode(cssSelectorDomNode);
            let cssText = cssScan.getText()
            let cssdoc = cssService.getDefaultCssTextDocument(cssText)
            let styleSheet = cssService.getScssStyleSheet(cssdoc);

            // let result = cssService.findSelectorTreeBySelector(targetStyleSheet!,styleSheet) 
            let targetTree = createStyleSheetAbstractSyntaxTree(targetStyleSheet!)
            let sourceTree = createStyleSheetAbstractSyntaxTree(styleSheet)
            let {matchSourceNodes,matchTargetNodes} = cssService.matchCssSelectorNodes(targetTree,sourceTree,true)
            let result = Array.from(matchSourceNodes).map(item => item.node)
            result.forEach(res => {
              let textNode = cssScan.getTextNode(cssdoc.getOffsetInFile(res.offset))
              if (textNode?.node.type == 'selectorNode' || textNode?.node.type == "textNode") {
                let node = textNode.node as CandidateTextNode
                let tsNode = textNode?.node.tsNode
                let fileName = tsNode.getSourceFile().fileName
                definitions.push({
                  fileName: fileName,
                  kind: ts.ScriptElementKind.string,
                  name: '',
                  containerKind: ts.ScriptElementKind.variableElement,
                  containerName: '',
                  textSpan: {
                    start: node.offset,
                    length: node.text.length,
                  }
                })
              }
            })
          }
        })
      }
      referenceNodes.map(findDefinition)
      const definitionInfo: ts.DefinitionInfoAndBoundSpan = {
        definitions:definitions,
        textSpan:{
          start: cssTextDocument.getOffsetInFile(targetNode?.offset || 0),
          length: targetNode?.getText().length || 0,
        }
      }
      return definitionInfo
    }
    return undefined


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