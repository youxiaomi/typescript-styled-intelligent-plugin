

import { getSCSSLanguageService ,TextDocument,} from 'vscode-css-languageservice'
import * as ts from 'typescript/lib/tsserverlibrary'
import { NodeType,Node,RuleSet}  from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import * as Nodes from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import { flatten, omitUndefined } from '../utils/utils'
// import { JsxElementNode, JsxElementSelector,JsxElementNode, StyledElement } from '../parser/extractCssSelector'
// import {} from
import * as substituter from 'typescript-styled-plugin/lib/_substituter'
import TsHelp from './tsHelp'

import StyleSheetScan from '../parser/styleSheetScan'
import { CssSelectorNode, JsxElementNode, JsxElementSelector, TargetSelector } from '../factory/nodeFactory'
import { isReadable } from 'stream'
import logger from './logger'

const scssLanguageService = getSCSSLanguageService()


function  getPlaceholderSpans(node: ts.TemplateExpression) {
  const spans: Array<{ start: number, end: number }> = [];
  const stringStart = node.getStart() + 1;

  let nodeStart = node.head.end - stringStart - 2;
  for (const child of node.templateSpans.map(x => x.literal)) {
      const start = child.getStart() - stringStart + 1;
      spans.push({ start: nodeStart, end: start });
      nodeStart = child.getEnd() - stringStart - 2;
  }
  return spans;
}
export class TemplateStringContext{
  constructor(
    readonly node: ts.TemplateLiteral,
    readonly tsHelp: TsHelp,
    readonly typescript: typeof ts,
  ){

  }
  getFileName(){
    return this.node.getSourceFile().fileName
  }
  getText(){
    let ts = this.typescript
    let text = this.node.getText().slice(1,-1);
    if(this.node.kind == ts.SyntaxKind.NoSubstitutionTemplateLiteral){
      return text
    }
    return substituter.getSubstitutions(text,getPlaceholderSpans(this.node))
    // return this.node.getText();
  }
  getRawText(){
    let ts = this.typescript
    let text = this.node.getText()
    if(this.node.kind == ts.SyntaxKind.NoSubstitutionTemplateLiteral){
      return text
    }
    return '`'+substituter.getSubstitutions(text.slice(1,-1),getPlaceholderSpans(this.node))+'`'
  }
  toOffset(location: ts.LineAndCharacter): number{

    return 0
  }
  toPosition(offset: number): ts.LineAndCharacter{

    return {
      line: 0,
      character: 0
    }
  }
}

const amendStyleSheet = (text,tagName?:string)=>{
  let startOffset = 0
  if(text[0] == '`'){
    text = text.slice(1,-1)
    startOffset = -1
  }
  if(tagName){
    text = `${tagName}{${text}}`
    // text = tagName+'{'+text+'}'
    startOffset += (tagName.length + 1)
  }
  let isExistRoot = !!text.slice(0,5).match(':root')
  if(!isExistRoot){
    startOffset += 6
  }
  return {
    // text: isExistRoot ? text : ':root{'+text+'}',
    text: isExistRoot ? text : `:root{${text}}`,
    startOffset,
  }
}

export type CssTextDocument =  TextDocument & {
  getOffsetInFile:(offset:number)=>number
}

class ScssService {

  getDefaultCssTextDocument(text){
    let {text:cssText,startOffset} = amendStyleSheet(text)
    let doc:CssTextDocument = {
      uri: 'untitled://embedded.scss',
      languageId: 'scss',
      version: 1,
      getText: () => cssText,
      // getText: () => `${scssText}`,
      positionAt: (offset: number) => {
        offset -= startOffset
        return {
          line: 0,
          character: 0,
        }
      },
      offsetAt: (position: ts.LineAndCharacter) => {
    
        return 0
      },
      lineCount: text.split(/\n/g).length + 1,
      getOffsetInFile:(offset:number)=> {
        return offset - startOffset
      },
    }

    return doc
  }

  generateCssTextDocument(templateStringContext:TemplateStringContext){

    let text = templateStringContext.getRawText();
    // let isExistRoot = !!text.slice(0,5).match(':root')
    let tagName = templateStringContext.tsHelp.getTag(templateStringContext.node)
    if(!tagName){
      console.log(tagName);
      templateStringContext.tsHelp.getTag(templateStringContext.node)
    }
    let {text:cssText,startOffset} = amendStyleSheet(text,tagName)
    let doc:CssTextDocument = {
      uri: 'untitled://embedded.scss',
      languageId: 'scss',
      version: 1,
      getText: () =>cssText,
      // getText: () => `${scssText}`,
      positionAt: (offset: number) => {
        offset -= startOffset
        return templateStringContext.toPosition(offset)
        // const pos = context.toPosition(this.fromVirtualDocOffset(offset, context));
        // return this.toVirtualDocPosition(pos);
        // 会有偏移量
        // return {
        //   line: 0,
        //   character: 0,
        // }
      },
      offsetAt: (position: ts.LineAndCharacter) => {
        return templateStringContext.toOffset(position)
        // const offset = context.toOffset(this.fromVirtualDocPosition(p));
        // return this.toVirtualDocOffset(offset, context);
      },
      lineCount: cssText.split(/\n/g).length + 1,
      getOffsetInFile:(offset:number)=> {
        return templateStringContext.node.getStart() + offset - startOffset
      },
    }

    return doc

  }
  fromatText(doc:TextDocument,){
    return scssLanguageService.format(doc,undefined,{tabSize:2,insertSpaces:true,newlineBetweenSelectors:false})[0].newText
  }
  getScssStyleSheet(doc:TextDocument,addRoot = true) {
    let styleSheet = scssLanguageService.parseStylesheet(doc) as Nodes.Stylesheet

    return styleSheet
  }
  getRootRuleset = (styleSheet:Node):Nodes.RuleSet => {
    let [ruleSet] = styleSheet.getChildren()
    return ruleSet as Nodes.RuleSet
  }
  getRulesetsOfDeclartions(NodeDeclarations:Nodes.Declarations | undefined){
    if(!NodeDeclarations){
      return []
    }
    let declarations = NodeDeclarations.getChildren()
    return declarations.filter(declartion => declartion.type == NodeType.Ruleset) as RuleSet[]
  }
  /**
   *  把dom节点选中的selector 转换为styleSheet，没有selector就转换所有子节点
   */
  getStyleSheetScanByJsxElementNode = (node:JsxElementNode,targetSelector?: TargetSelector)=>{
    /**
     *  root:{
     *    .a{
     *        .b .c{
     *          
     *        }
     *    }
     *  }
     */
    
    const styleSheetNodeScan = new StyleSheetScan()
    const generateClassName = (selector:JsxElementSelector)=>{
      let tsNode = selector.tsNode as ts.StringLiteral

      let text = `.${selector.text || tsNode.text.trim()}`
      styleSheetNodeScan.setText(text,selector)
    }
    const generateId = (selector:JsxElementSelector)=>{
      let tsNode = selector.tsNode as ts.StringLiteral
      let text = `#${tsNode.text.trim()}`
      styleSheetNodeScan.setText(text,selector)
    }
    const generateElement = (selector:JsxElementSelector)=>{
      let tsNode = selector.tsNode as ts.Identifier

      let text =  `${tsNode.text.trim()}`
      styleSheetNodeScan.setText(text,selector)
    }
    const generateSelectorText = (selector:JsxElementSelector)=>{
          
      if(selector.type == "classNameSelector"){
        return generateClassName(selector)
      }
      if(selector.type == "idSelector"){
        return generateId(selector)
      }
      if(selector.type == "elementSelector"){
        generateElement(selector)
      }
      return []
    }
    function extractTargetSelectorStylesheet(node: JsxElementNode, targetSelector:TargetSelector){
      function findTargetDomSelector(node: JsxElementNode,targetSelector:TargetSelector){
        logger.info(node.tsNode.getText())
        let selector = node.selectors.find(selector=>{
          if(selector.type == "classNameSelector" || selector.type == "idSelector"){
            return selector.offset <= targetSelector.selectorStart && selector.offset + selector.text.length >= targetSelector.selectorStart
          }
        })
        if(selector){
          node.children = []
          return true
        }else{
          let children =  node.children?.find(child=>{
            return  findTargetDomSelector(child as JsxElementNode,targetSelector)
          })
          node.selectors = children ? node.selectors :  []
          node.children = children ? [children] :  []
        }
        return node.children.length
      }
      findTargetDomSelector(node ,targetSelector)
      return node
    }


    if(targetSelector){
      node = extractTargetSelectorStylesheet(node as JsxElementNode,targetSelector)
    }
    const generateSelectorNode = (node:JsxElementNode,targetSelector?: TargetSelector) =>{
      if(node.type == 'styledElement' || node.type == 'intrinsicElement'){
        const { type ,children = []}  = node
        let selectors = node.selectors
        // if(targetSelector){
        //   let _selectorsResult = node.selectors.map(selector=>{
        //     // console.log(selector.tsNode.getFullText());
            
        //     if(selector.selectorType == 'className' || selector.selectorType == 'id'){
        //       let child = (selector.children || []).find(item => {
        //         return item.offset <= targetSelector.selectorStart && item.offset + item.text.length >= targetSelector.selectorStart
        //         // return item.tsNode == sourceSelectorNode
        //       });
        //       let _selector = {...selector}
        //       if(child){
        //         _selector.children = [child]
        //         return _selector
        //       }
        //     }
        //     // if(selector.tsNode == sourceSelectorNode){ //element selector
        //     //   return selector
        //     // }
        //   })
        //   let _selectors = omitUndefined(_selectorsResult)
        //   if(_selectors.length){
        //     _selectors.forEach((selector)=>{
        //       let text = generateSelectorText(selector);
        //       styleSheetNodeScan.setText('{',{type:'braceOpen'})
        //       styleSheetNodeScan.setText('}',{type:"braceClose"})
        //     })
        //     return true
        //   }
        // }
        // 多class可以并集，生成  .user.age

        selectors.map(generateSelectorText)
        if(selectors.length){
          styleSheetNodeScan.setText('{',{type:'braceOpen'})
        }
        // let selectorStrings = flatten(selectorResults).join(',')
        let isExist = false
        for(let node of children){
          generateSelectorNode(node,targetSelector)
          // if(targetSelector && isExist){
          //   break
          // }
        }
        // let childrenSelectors = childrenSelectorResults.join(``)
        if(selectors.length){
          styleSheetNodeScan.setText('}',{type:"braceClose"})
        }
        // return isExist
        // return `${selectorStrings}{${childrenSelectors}}`
      }
    }
    generateSelectorNode(node,targetSelector)
    return styleSheetNodeScan
    // return generateSelectorNode(node,sourceSelectorNode)
  }
  matchCssSelectorNodes(targeTree: CssSelectorNode,sourceTree: CssSelectorNode,isMatchTarge = false){
    let matchSourceNodes: Set<CssSelectorNode> = new Set()
    let matchTargetNodes: Set<CssSelectorNode> = new Set()
    iterationNode(targeTree, sourceTree)
    return {
      matchSourceNodes,
      matchTargetNodes,
    }
    function iterationNode(targetNode: CssSelectorNode, sourceNode: CssSelectorNode) {
      // while(sourceNode){

      let isSame = isSameNode(targetNode, sourceNode)
      if (isSame) {
        let isCombinator = sourceNode.combinatorSibling || sourceNode.combinatorParent || targetNode.combinatorParent || targetNode.combinatorSibling
        if (isCombinator && targetNode.parent && sourceNode.parent) {
          isSame = isSameNode(targetNode.parent, sourceNode.parent)
        }
      }
      let targetChildren = targetNode.children
      let sourceChildren = sourceNode.children
      if (isSame) {
        if (targetChildren.size && sourceChildren.size) {
          sourceChildren.forEach(sourceChild => {
            targetChildren.forEach(targetChild => {
              iterationNode(targetChild, sourceChild)
            })
          })
        } else {
          // targetNode.addMatchNode(sourceNode)
          // sourceNode.addMatchNode(targetNode)
          if(isMatchTarge){
            if(!targetChildren.size){
              matchSourceNodes.add(sourceNode)
            }
          }else{
            matchSourceNodes.add(sourceNode)
          }
          matchTargetNodes.add(targetNode)
        }
      } else {
        sourceChildren.size && sourceChildren.forEach(sourceChild => {
          iterationNode(targetNode, sourceChild)
        })
      }
      function isSameNode(targetNode: CssSelectorNode, sourceNode: CssSelectorNode) {
        let sourceCssNode = sourceNode.node
        let targetCssNode = targetNode.node
        let isSame = targetCssNode.type == sourceCssNode.type && sourceNode.nodeText == targetNode.nodeText
        let sourceSiblings = Array.from(sourceNode.parent?.children || []);
        if (isSame && targetNode.siblings.size) {
          let targetSiblings = Array.from(targetNode.siblings)
          for (let sibling of targetSiblings) {
            let notFound = !sourceSiblings.find(sourceSibling => sourceSibling.nodeText == sibling.nodeText)
            if (notFound) {
              isSame = false
              break
            }
          }
        }
        return isSame
      }
    }
  }
  getSelectorIdentierOffset(node: Nodes.Node){
    let types = [
      NodeType.ClassSelector,
      NodeType.Identifier 
    ]
    if(types.includes(node.type)){
      node.offset++
    }
    return node.offset
  }
}

export const getScssService = ()=>{
  return new ScssService()
}
