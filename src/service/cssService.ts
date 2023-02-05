

import { getSCSSLanguageService ,TextDocument,} from 'vscode-css-languageservice'
import * as ts from 'typescript/lib/tsserverlibrary'
import { NodeType,Node,RuleSet}  from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import * as Nodes from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import { flatten, omitUndefined } from '../utils/utils'
import { JsxElementNode, JsxElementSelector,CandidateTextNode, StyledElement } from '../parser/extractCssSelector'
import * as substituter from 'typescript-styled-plugin/lib/_substituter'
import TsHelp from './tsHelp'

import StyleSheetScan from '../parser/styleSheetScan'
import { CssSelectorNode, TargetSelector } from '../factory/nodeFactory'
import { isReadable } from 'stream'

const scssLanguageService = getSCSSLanguageService()




//iterator
class NodeSelectorGenerator{
  currentSimpleSelectorIndex = -1
  selector:Node
  declarationGenerators: NodeGenerator[]
  parent:Node
  declarations:Node[]
  declartionsParent:Node
  matchSource:Node|undefined
  constructor(Selector:Node,declarations,selectorParent:Node,declartionsParent:Node){
    this.selector = Selector
    this.parent = selectorParent
    this.declarations = declarations
    this.declartionsParent = declartionsParent
    this.declarationGenerators = declarations
      .filter(declaration => declaration.type == NodeType.Ruleset)
      .map(declaration=>{
        return new NodeGenerator(declaration,declartionsParent)
      })
  }
  getNode = (simpleSelectorSource:Node) =>{
    let simpleSelectors = this.selector.getChildren()
    if(this.currentSimpleSelectorIndex < simpleSelectors.length){
      this.currentSimpleSelectorIndex++
    }
    let currentSimpleSelector = simpleSelectors[this.currentSimpleSelectorIndex];
    if(currentSimpleSelector){
      //这个下面children 也会多个  &.user  children = [&,.user]
      // let currentSimpleChildren = currentSimpleSelector.getChildren()
      // let simpleSelectorChildrenTarget = simpleSelectorTarget.getChildren()

      let targetText = currentSimpleSelector.getText()
      let sourceText = simpleSelectorSource.getText()
      if (targetText == sourceText) {
        this.matchSource = simpleSelectorSource
        return currentSimpleSelector
      } else {
        return this.getNode(simpleSelectorSource)
      }
    }else{
      if(this.declarationGenerators.length){
        return this.declarationGenerators = this.declarationGenerators.filter(declaration=>{
          return declaration.getNode(simpleSelectorSource)
        })
      }else{
        return undefined
      }
      
    }
  }
  // findNodes =(simpleSelectorTarget:Node) =>{
  //   return this.getNode(simpleSelectorTarget)
  // }
  getCurrentNodes = ():Node[]=>{
    return this.getSelectNodes(true)
    // let simpleSelectors = this.selector.getChildren()
    // let currentSimpleSelector = simpleSelectors[this.currentSimpleSelectorIndex];
    // if(currentSimpleSelector){
    //   return [currentSimpleSelector]
    // }else{
    //   let nodes = this.declarationGenerators.map(gen => gen.getCurrentNodes())
    //   let _nodes= flatten(nodes.filter(item => item))
    //   return _nodes
    // }
  }
  getSelectNodes = (isNeedSourceNode = false)=>{
    let simpleSelectors = this.selector.getChildren()
    let currentSimpleSelector = simpleSelectors[this.currentSimpleSelectorIndex];
    if(currentSimpleSelector){
      if(isNeedSourceNode && this.matchSource){
        if(!this.declarationGenerators.length && this.matchSource){
          return [this.matchSource]
        }else{
          return []
        }
      }
      return [currentSimpleSelector]
    }else{
      let nodes = this.declarationGenerators.map(gen => gen.getCurrentNodes(isNeedSourceNode))
      let _nodes= flatten(nodes.filter(item => item))
      return _nodes
    }
  }
  getMatchSourceNode = ()=>{
    return this.getSelectNodes(true)
  }
  clone = ()=>{
    const cloneInstance = new NodeSelectorGenerator(this.selector,this.declarations,this.parent,this.declartionsParent)
    cloneInstance.currentSimpleSelectorIndex = this.currentSimpleSelectorIndex
    cloneInstance.declarationGenerators = this.declarationGenerators.map(gen => gen.clone())
    cloneInstance.matchSource = this.matchSource
    return cloneInstance
  }
}
//iterator
class NodeGenerator{
  currentRuleSet:Node
  // currentSelectorIndex = 0
  selectorGenerators:NodeSelectorGenerator[] = [];
  parent?:Node
  constructor(ruleSet:Node,parent?:Node){
    this.parent = parent
    this.currentRuleSet = ruleSet
    let [nodeUndefined,nodeDeclarations] = this.currentRuleSet.getChildren();
    let nodeSelectors = nodeUndefined.getChildren()
    let declarations = nodeDeclarations.getChildren()
    this.selectorGenerators = nodeSelectors.map(selecotr=>{
      return new NodeSelectorGenerator(selecotr,declarations,nodeUndefined,ruleSet)
    })
  }
  getNode = (simpleSelectorSource:Node)=>{

    console.log(this.currentRuleSet.getText(),'------target');
    console.log(simpleSelectorSource.getText(),'-----simple');
    return this.selectorGenerators = this.selectorGenerators.filter(gen=>{
      return gen.getNode(simpleSelectorSource)
    })
  }
  // findNodes =(simpleSelectorSource:Node) =>{
  //   return this.getNode(simpleSelectorSource)
  // }
  getCurrentNodes = (isNeedSourceNode = false):Node[]=>{
    let nodes = this.selectorGenerators.map(gen =>{
      return isNeedSourceNode ? gen.getMatchSourceNode() : gen.getCurrentNodes()
      // return gen.getCurrentNodes()
    })
    let _nodes:Node[] = []
    let nodesFlatten =  flatten(nodes.filter(item => item))
    nodesFlatten.forEach(node=>{
      if(!_nodes.find(item => item == node)){
        _nodes.push(node)
      }
    })
    return _nodes
  }
  clone(){
    const cloneInstance = new NodeGenerator(this.currentRuleSet,this.parent);
    cloneInstance.selectorGenerators = this.selectorGenerators.map(gen=>{
      return gen.clone()
    })
    return cloneInstance
  }
}


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



        // return templateStringContext.toPosition(offset)
        // const pos = context.toPosition(this.fromVirtualDocOffset(offset, context));
        // return this.toVirtualDocPosition(pos);
        // 会有偏移量
        return {
          line: 0,
          character: 0,
        }
      },
      offsetAt: (position: ts.LineAndCharacter) => {
        // return templateStringContext.toOffset(position)
        // const offset = context.toOffset(this.fromVirtualDocPosition(p));
        // return this.toVirtualDocOffset(offset, context);
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
    
    // let doc:TextDocument = {
    //   uri: 'untitled://embedded.scss',
    //   languageId: 'scss',
    //   version: 1,
    //   getText: () => addRoot ? `:root{${scssText}}` : scssText,
    //   // getText: () => `${scssText}`,
    //   positionAt: (offset: number) => {
    //     // const pos = context.toPosition(this.fromVirtualDocOffset(offset, context));
    //     // return this.toVirtualDocPosition(pos);
    //     // 会有偏移量
    //     debugger
    //     return {
    //       line: 0,
    //       character: 0,
    //     }
    //   },
    //   offsetAt: (position) => {
    //     // const offset = context.toOffset(this.fromVirtualDocPosition(p));
    //     // return this.toVirtualDocOffset(offset, context);
    //     debugger
    //     return 0
    //   },
    //   lineCount: scssText.split(/\n/g).length + 1,
    // }


    let styleSheet = scssLanguageService.parseStylesheet(doc) as Nodes.Stylesheet
    // let [ruleSet] = styleSheet.getChildren();

    return styleSheet
  }
  getRootRuleset = (styleSheet:Node):Nodes.RuleSet => {
    let [ruleSet] = styleSheet.getChildren()
    return ruleSet as Nodes.RuleSet
  }
  findSelectorTree(rootNode:Node,pos:number){
    const interationNode = (_node:Node)=>{
      return this.forEachChild(_node,(node)=>{
        let startPos = node.offset
        let endPos =  node.offset+length
        if(startPos> pos && pos < endPos){
          return interationNode(node)
        }
      })
    }
    return interationNode(rootNode)
  }
  getRulesetsOfDeclartions(NodeDeclarations:Nodes.Declarations | undefined){
    if(!NodeDeclarations){
      return []
    }
    let declarations = NodeDeclarations.getChildren()
    return declarations.filter(declartion => declartion.type == NodeType.Ruleset) as RuleSet[]
  }
  /**
   *  匹配目标样式表最深层重叠部分
   */
  findSelectorTreeBySelector(targetStyleSheet:Node, sourceStyleSheet:Node,isNeedSourceSelector = false):any[]{

    let targetGenerator = new NodeGenerator(this.getRootRuleset(targetStyleSheet));
    let sourceRuleSet = this.getRootRuleset(sourceStyleSheet);
    const getNodes = (targetGenerator:NodeGenerator, sourceRuleSet:Nodes.RuleSet)=>{
      // let [ undefinedNode,declartionNode ]  = sourceRuleSet.getChildren()
      // let [ undefinedNode ]  = sourceRuleSet.getChildren()
      let sourceDeclartionNode = sourceRuleSet.getDeclarations()
      // let sourceSelectors = undefinedNode.getChildren()
      let sourceSelectors = sourceRuleSet.getSelectors().getChildren();
      let sourceDeclarationRuleSets = this.getRulesetsOfDeclartions(sourceDeclartionNode);
      const recursiveSelector = (targetGeneratorClone:NodeGenerator,selector:Node)=>{
        let simpleSelectors = selector.getChildren();
        return !simpleSelectors.find(simpleSelector => targetGeneratorClone.getNode(simpleSelector).length == 0)
      }
      let _selectors =  sourceSelectors.map(selector=>{
        let targetGeneratorClone = targetGenerator.clone()
        let hasSelector = recursiveSelector(targetGeneratorClone,selector);
        if(!hasSelector){
          return undefined
        }
        if(sourceDeclarationRuleSets.length){
          let result = sourceDeclarationRuleSets.map(ruleSet=>{
            return getNodes(targetGeneratorClone.clone(),ruleSet)
          }).filter(item => item)
          return flatten(result)
        }else{
          return targetGeneratorClone.getCurrentNodes(isNeedSourceSelector)
        }
      }).filter(item => item)
      return flatten(_selectors)
    }
    let nodes = getNodes(targetGenerator,sourceRuleSet)
    console.log(nodes);
    return nodes
  }
  forEachChild(node: Node,cbNodes:(node:Node)=>Node|undefined){
    let chidlren = node.getChildren()
    let result = chidlren.map(cbNodes).filter(item => item) as  Node[]
    return result.length ? result : undefined
  }
  /** 解析css样式表selector,感觉没啥用 */
  getCssSelectorNode(node: Node){


    // return extractStyleSheetSelectorWork(node)
    function iterationNode(node: Node){
      let nodes = node.getChildren()
      var aa = NodeType
    
      // if(node.type == NodeType.Ruleset){
      //   extractSelector(nodes[0] as Nodes.Selector)
      //   // extractSelector(nodes[1])
      // }
      // switch(node.type){
      //   case NodeType.Ruleset:
      //     return extractRuleset(node);
      //   case NodeType.Undefined:
      //     return extractUndefine(node);
      //   case NodeType.Selector:
      //     return extractSelector(node);
      // }
      return {
        text: node.getText(),
        type: NodeType[node.type],
        pos: node.offset,
        end: node.offset+node.length,
        children: nodes.map(node=>{
          return iterationNode(node)
        }),
        cssNode: node,
        
      }
    }
    let classNameNodes = iterationNode(node)
    console.log(classNameNodes)
    return classNameNodes
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
    const generateClassName = (selector:CandidateTextNode)=>{
      let tsNode = selector.tsNode as ts.StringLiteral

      let text = `.${selector.text || tsNode.text.trim()}`
      styleSheetNodeScan.setText(text,selector)
    }
    const generateId = (selector:CandidateTextNode)=>{
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
      // console.log(ts.SyntaxKind[selector.tsNode.kind]);
          
      if(selector.selectorType == 'className'){
        return (selector.children || []).map(generateClassName)
      }
      if(selector.selectorType == 'id'){
        return (selector.children || []).map(generateId)
      }
      if(selector.selectorType == "element"){
        return [generateElement(selector)]
      }
      return []
    }
    function extractTargetSelectorStylesheet(node: StyledElement, targetSelector:TargetSelector){
      function findTargetDomSelector(node: StyledElement,targetSelector:TargetSelector){
        let selector = node.selectors.find(selector=>{
          if(selector.selectorType == 'className' || selector.selectorType == 'id'){
            let selectorDom = (selector.children || []).find(item => {
              return item.offset <= targetSelector.selectorStart && item.offset + item.text.length >= targetSelector.selectorStart
            });
            if(selectorDom){
              selector.children = [selectorDom]
            }
            return selectorDom
          }
        })
        if(selector){
          node.children = []
          node.selectors = [selector]
        }else{
          let hasChildSelector =  node.children?.find(child=>{
            return  findTargetDomSelector(child as StyledElement,targetSelector)
          })
          node.selectors = hasChildSelector ? node.selectors :  []
        }
        return node.selectors.length
      }
      findTargetDomSelector(node ,targetSelector)
      return node
    }


    if(targetSelector){
      node = extractTargetSelectorStylesheet(node as StyledElement,targetSelector)
    }
    const generateSelectorNode = (node:JsxElementNode,targetSelector?: TargetSelector) =>{
      if(node.type == 'styledElement' || node.type == 'intrinsicElements'){
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
        if (isSame && (targetNode.siblings.size || sourceNode.siblings.size)) {
          if (targetNode.siblings.size != sourceNode.siblings.size) {
            isSame = false
          } else {
            let targetSiblings = Array.from(targetNode.siblings)
            for (let sibling of sourceNode.siblings) {
              let notFound = !targetSiblings.find(targetSibling => targetSibling.nodeText == sibling.nodeText)
              if (notFound) {
                isSame = false
                break
              }
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
