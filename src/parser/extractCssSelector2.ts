


// type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript/lib/tsserverlibrary'
import { CallExpressionChain, DomSelector, JsxElementNode, JsxElementSelector } from '../factory/nodeFactory'
import logger from '../service/logger'
import TsHelp from '../service/tsHelp'
import { findResult, flatten, unique, omitUndefined, noop } from '../utils/utils'
import { containerNames, cssSelectors } from './types'


type JsxElementUnion = JsxElementNode | JsxElementSelector
// type ExtractCssSelectorWorkScope = {
//   jsxElementNode?: JsxElementNode,
//   jsxChildren?: boolean
//   jsxAttrName?: string 
//   callExpressionChain?: CallExpressionChain,
//   scope?: ExtractCssSelectorWorkScope
// }

enum runtimeStage {
  undefined,
  jsxAttr,
  children
}



class ExtractCssSelectorWorkScope{
  jsxElementNode?: JsxElementNode
  runtimeStage?: runtimeStage
  jsxAttrName?: string
  callExpressionChain?: CallExpressionChain
  scope?: ExtractCssSelectorWorkScope
  parentScope?: ExtractCssSelectorWorkScope
  addChildScope(name,value){
    this.scope = this.scope || new ExtractCssSelectorWorkScope();
    this.scope[name] = value
  }
  addJsxAttrNameToScope(value: string){
    this.addChildScope('jsxAttrName',value)
  }
  addRuntimeStageToScope(value:runtimeStage){
    this.addChildScope('runtimeStage',value)
  }
  addJsxElementNodeToScope(jsxElementNode: JsxElementNode){
    this.addChildScope('jsxElementNode',jsxElementNode)
  }
  addCallExpressionChainToScope(value: CallExpressionChain){
    this.addChildScope('callExpressionChain',value)
  }
  addParentScope(parent:ExtractCssSelectorWorkScope){
    this.addChildScope('parentScope',parent)
  }
  getChildScope(){
    let scope =  this.scope ||  new ExtractCssSelectorWorkScope();
    if(!scope.parentScope){
      scope.parentScope = this 
    }
    return scope
  }
  deleteChildScope(){
    this.scope = undefined
  }
  getCurrentStage(){
    return this.getParentScopeProp('runtimeStage')
  }
  getJsxAttrName(){
    return this.getParentScopeProp('jsxAttrName')
  }
  getParentScopeProp(propName){
    let scope = this.scope || this
    while(scope && !scope[propName]){
      if(scope.parentScope){
        scope = scope.parentScope
      }else{
        return 
      }
    }
    return scope && scope[propName] || undefined
  }
  getJsxElementNode(){
    return this.getParentScopeProp('jsxElementNode')
    // let scope = this.scope || this
    // while(scope && !scope.jsxElementNode){
    //   if(scope.parentScope){
    //     scope = scope.parentScope
    //   }else{
    //     return 
    //   }
    // }
    // return scope?.jsxElementNode
  }
  isChildStage(){
    return this.getCurrentStage() == runtimeStage.children
  }
  isJsxAttrStage(){
    return this.getCurrentStage() == runtimeStage.jsxAttr
  }

}






export default function extractCssSelectorWorkWrap({ node, languageService, tsHelp, typescript }: { node: ts.Node, languageService: ts.LanguageService, tsHelp: TsHelp, typescript: typeof ts }): JsxElementNode[] {
  const sourceFile = node.getSourceFile()
  let fileName = sourceFile.fileName
  let ts = typescript
  function extractCssSelectorWorkWithScope(node: ts.Node | undefined, scope: ExtractCssSelectorWorkScope): (JsxElementNode | JsxElementSelector)[] {
    // scope = scope || {}
    // const { jsxElementNode, callExpressionChain } = scope

    if (!node) {
      return []
    }
    logger.info(ts.SyntaxKind[node.kind], "----------"); console.log(node.getFullText());
    extractCssSelectorWork(node)
    function extractVariableStatement(node: ts.VariableStatement) {
      return ts.forEachChild(node.declarationList, extractCssSelectorWork) || []
    }
    function extractVariableDeclaration(node: ts.VariableDeclaration) {
      let { initializer } = node
      return extractCssSelectorWork(initializer)
    }
    function extractArrowFunction(node: ts.ArrowFunction) {
      let { body } = node
      return extractCssSelectorWork(body);
    }
    function extractBlock(node: ts.Block) {
      let { statements = [] } = node
      let returnStatements = statements.filter(statement => {
        return statement.kind == ts.SyntaxKind.ReturnStatement
      }) as ts.ReturnStatement[]

      let results: JsxElementUnion[] = []
      returnStatements.forEach((statement) => {
        let expressionResult = extractCssSelectorWorkWithScope(statement.expression, scope) || []
        results = [...results, ...expressionResult]
      })
      return results
    }
    function extractConditionalExpression(node: ts.ConditionalExpression) {

      let { whenFalse, whenTrue } = node
      let nodes = [
        whenFalse,
        whenTrue
      ].filter(item => item);
      let references = nodes.map(node => {
        return extractCssSelectorWork(node) || []
        // return (languageService.getDefinitionAtPosition(fileName,node.pos+1)||[]).filter(reference =>  reference)
      })

      return flatten(references)
    }
    function extractJsxAttributes(node: ts.JsxAttributes) {
      const { properties } = node

      properties.forEach(property => {
        if (property.kind == ts.SyntaxKind.JsxAttribute) {
          let { name, initializer } = property
          let attrName = name.escapedText.toString()
          scope.addJsxAttrNameToScope(attrName)
          scope.addRuntimeStageToScope(runtimeStage.jsxAttr)
          let attrValues = extractCssSelectorWorkWithScope(initializer as ts.JsxExpression,scope.getChildScope());
          scope.deleteChildScope()
          // _extraInfo.jsxAttrName = undexfined
          // attrValues.forEach(value => {
          //   jsxElementNode.addAttribute(attrName, value as JsxElementNode)
          // })
        }
        if (property.kind == ts.SyntaxKind.JsxSpreadAttribute) {

        }

      })
      return []
    }
    function extractJsxElement2(node: ts.JsxElement) {
      logger.info(node.getFullText())
      let sourceFile = node.getSourceFile()
      let parentJsxElementNode = scope.getJsxElementNode();
      const jsxAttrName = scope.jsxAttrName
      let jsxElementNode =  new JsxElementNode(node, 'styledElement');
      if(scope.isChildStage()){
        jsxElementNode.addParent(parentJsxElementNode)
        parentJsxElementNode && parentJsxElementNode.addChild(jsxElementNode)
      }
      if(scope.isJsxAttrStage()){
        parentJsxElementNode && parentJsxElementNode.addAttribute(scope.jsxAttrName ||'' ,jsxElementNode)
      }
      // if(parentJsxElementNode){
      //   jsxElementNode.addParent(parentJsxElementNode)
      //   parentJsxElementNode.addChild(jsxElementNode)
      // }else{
      //   parentJsxElementNode = jsxElementNode 
      // }
      const openingElement = node.openingElement;
      const children = node.children
      // let identiferNode = tsHelp.getDefinitionLastNodeByIdentiferNode(node.openingElement);
      let tagName = openingElement.tagName.getText()
      let identiferNode = tsHelp.getJsxOpeningElementIdentier(node.openingElement);
      let identiferNodeReference = (tsHelp.getReferenceNodes(sourceFile.fileName, identiferNode.getStart()) || [])[0];
      //instrinsic ele
      const { attributes } = openingElement
     
      scope.addJsxElementNodeToScope(jsxElementNode)
      if (identiferNodeReference) {
        extractCssSelectorWorkWithScope(attributes,scope.getChildScope())
        scope.addRuntimeStageToScope(runtimeStage.children)
        children.forEach((child) => {
          extractCssSelectorWorkWithScope(child,scope.getChildScope())
        })
        scope.addRuntimeStageToScope(runtimeStage.undefined)

        let node = identiferNodeReference as ts.FunctionDeclaration;
        let { body } = node;
      }
      scope.deleteChildScope()
      return []





    }

    // function extractJsxElement(node: ts.JsxElement): JsxElementNode {
    //   let sourceFile = node.getSourceFile()
    //   let { attributes } = node.openingElement;
    //   let program = languageService.getProgram()
    //   // extractJsxElement2(node)
    //   // let identiferNode = ts.forEachChild(node.openingElement,(node)=>{
    //   //   if(node.kind == ts.SyntaxKind.Identifier){
    //   //     return node
    //   //   }
    //   // }) as ts.Node
    //   let identiferNode = tsHelp.getDefinitionLastNodeByIdentiferNode(node.openingElement);
    //   // let isIntrinsicElement = true
    //   console.log(node.getFullText(), '-----');
    //   let identiferNodeReferences = languageService.getDefinitionAtPosition(sourceFile.fileName, identiferNode.getStart()) || []
    //   // let defineNodes = identiferNodeReferences.map(identiferNode =>{
    //   //   let sourceFile = program?.getSourceFile(identiferNode.fileName)
    //   //   return tsHelp.findNode(sourceFile!,identiferNode.contextSpan?.start!)
    //   // })
    //   let identiferNodeReference = (languageService.getDefinitionAtPosition(sourceFile.fileName, identiferNode.getStart()) || [])[0]

    //   // let isStyledComponentElement = !!identiferNodeReferences.find(tsHelp.isStyledComponentElement);
    //   let isStyledComponentElement = tsHelp.isStyledComponentElement(identiferNodeReference)

    //   // let isIntrinsicElement = !!identiferNodeReferences?.find(tsHelp.isIntrinsicElement);
    //   let isIntrinsicElement = tsHelp.isIntrinsicElement(identiferNodeReference)


    //   // let customDefineElement = identiferNodeReferences?.filter(tsHelp.isFunctionComponent) || [];
    //   console.log(ts.ScriptKind[identiferNode.kind]);


    //   let customDefineElement = tsHelp.isFunctionComponent(identiferNodeReference);
    //   // let isFucntion
    //   if (tsHelp.isFunctionComponent(identiferNodeReference)) {


    //   }



    //   let customComponentDefine = [identiferNodeReference].map(defineNode => {
    //     let sourceFile = program?.getSourceFile(defineNode.fileName)
    //     if (!sourceFile || !defineNode.contextSpan) {
    //       return
    //     }
    //     return tsHelp.findNodeByRange(sourceFile, defineNode.contextSpan?.start, defineNode.contextSpan.start + defineNode.contextSpan.length)
    //   }) || []

    //   // let customComponentRenderChildrenwithoutStyled = customComponentDefine.map(extractCssSelectorWork).filter(node => {
    //   let _customComponentRenderChildren = customComponentDefine.map((node) => {
    //     return extractCssSelectorWork(node) || []
    //   })
    //   let customComponentRenderChildren = flatten(_customComponentRenderChildren, { deep: true });
    //   const isFunctionComponentElementChildren = (node) => {
    //     return node && node.tsNode.kind != ts.SyntaxKind.TaggedTemplateExpression
    //   }
    //   let customComponentRenderChildrenWithoutStyled = customComponentRenderChildren.filter(node => {
    //     // console.log(identiferNode.getText(),);

    //     if (Array.isArray(node)) {
    //       return node.filter(isFunctionComponentElementChildren).length
    //     }
    //     return isFunctionComponentElementChildren(node)
    //   })
    //   let customComponentStyled = customComponentRenderChildren.filter(node => {
    //     return !isFunctionComponentElementChildren(node)
    //   })


    //   const getSelectors = (node: ts.JsxAttribute): JsxElementSelector[] => {
    //     let selectorAttributions: any[] = ['className', 'id']
    //     let escapedTextSelector = node.name.escapedText.toString()
    //     if (selectorAttributions.includes(node.name.escapedText)) {
    //       let resultInit = extractCssSelectorWork(node.initializer)
    //       let selectors = resultInit || []
    //       let currentNode: JsxElementSelector = {
    //         type: escapedTextSelector == 'className' ? 'classNameSelector' : 'idSelector',
    //         tsNode: node.initializer as ts.Node,
    //         children: [],
    //       }
    //       selectors = selectors.map(selector => {
    //         selector.parent = currentNode
    //         return selector
    //       })
    //       currentNode.children = selectors
    //       return [
    //         currentNode
    //       ]

    //     }
    //     return []
    //   }

    //   let selectors = ts.forEachChild(attributes, (node) => getSelectors(node as ts.JsxAttribute), (nodes) => flatten(nodes.map((node) => getSelectors(node as ts.JsxAttribute)))) || []
    //   let children = ts.forEachChild(node, extractCssSelectorWork, extractCssSelectorWorkNodes) || []


    //   children = children.filter(child => child)
    //   // children = flatten(children,{deep: true})

    //   if (isIntrinsicElement) {
    //     selectors.unshift({
    //       // type:  cssSelectors.element,
    //       type: 'selectorNode',
    //       selectorType: 'element',
    //       tsNode: identiferNode,
    //     })
    //   } else {
    //     if (isStyledComponentElement) {
    //       let tsNode = customComponentStyled[0].tsNode as ts.TaggedTemplateExpression
    //       let tag = tsNode.tag as any
    //       tag && tag.name && selectors.unshift({
    //         type: 'selectorNode',
    //         selectorType: 'element',
    //         // :  cssSelectors.element,
    //         // tsNode: tsNode.tag.name,
    //         tsNode: tag.name,
    //       })
    //     } else {

    //     }
    //     console.log(identiferNode);
    //   }
    //   const currentNode: JsxElementNode = {
    //     type: isIntrinsicElement ? "intrinsicElements" : "styledElement",
    //     // selectors: flatten(selectors,{deep:true}),
    //     selectors: selectors as JsxElementSelector[],
    //     children: [...children, ...customComponentRenderChildrenWithoutStyled],
    //     tsNode: node,
    //   }
    //   currentNode.children = (currentNode.children || []).map(child => {
    //     child.parent = currentNode
    //     return child
    //   })
    //   currentNode.selectors = currentNode.selectors.map(selector => {
    //     selector.parent = currentNode
    //     return selector
    //   })
    //   return currentNode
    // }
    // function extractJsxAttribution(node: ts.JsxAttribute):JsxElementNode[]{
    //   let selectorAttributions:any[] = ['className','id']
    //   let escapedTextSelector = node.name.escapedText  as string
    //   if(selectorAttributions.includes(node.name.escapedText)){
    //     let resultInit = extractCssSelectorWork(node.initializer)
    //     // let selectors = flatten(resultInit,{deep:true}) || []
    //     let selectors = resultInit
    //     // if(!Array.isArray(selectors)){
    //     //   selectors = [selectors] 
    //     // }
    //     return [
    //       {
    //         type: "selectorNode",
    //         tsNode: node.initializer as ts.Node,
    //         selectorType: cssSelectors[escapedTextSelector],
    //         children: selectors
    //       }
    //     ]
    //     // return selectors.map(selector=>{
    //     //   return {
    //     //     // type: cssSelectors[escapedTextSelector],
    //     //     type: "selector",
    //     //     tsNode: selector.tsNode,
    //     //   }
    //     // })
    //   }
    //   return []
    // }
    function extractJsxExpress(node: ts.JsxExpression) {
      return extractCssSelectorWork(node.expression)
    }
    function extractTemplateExpression(node: ts.TemplateExpression): [] {
      let { head, templateSpans} = node
      const  jsxElementNode = scope.getJsxElementNode()
      const  jsxAttrName = scope.getJsxAttrName()
      // let templateSpansNodes = flatten(templateSpans.map((node) => extractCssSelectorWork(node) || []))
      templateSpans.map((node) => extractCssSelectorWork(node) || [])
      if(scope.isJsxAttrStage()){
        let domSelector = new DomSelector(head, typescript);

        domSelector.selectors.forEach(selector => {
          let eleSelector = new JsxElementSelector(head,jsxElementNode!,jsxAttrName!)
          eleSelector.text = selector.text
          eleSelector.offset = selector.offset
          // templateSpansNodes.unshift(eleSelector)
          jsxElementNode.addSelector(eleSelector)
        })
      }
      


      //   templateSpansNodes.unshift({
      //     type: "textNode",
      //     text: selector.text,
      //     offset: selector.offset,
      //     tsNode: head
      //   })
      // })
      // return templateSpansNodes
      return []
    }
    function extractTemplateSpan(node: ts.TemplateSpan) {
      let { literal, expression } = node
      const  jsxElementNode = scope.getJsxElementNode()
      const  jsxAttrName = scope.getJsxAttrName()
      extractCssSelectorWork(expression) || []
      if(scope.isJsxAttrStage()){
        let domSelector = new DomSelector(literal, typescript)
        domSelector.selectors.forEach(selector => {
          let eleSelector = new JsxElementSelector(literal,jsxElementNode,jsxAttrName)
          eleSelector.text = selector.text
          eleSelector.offset = selector.offset
          // templateSpanNode.unshift(eleSelector)
          jsxElementNode.addSelector(eleSelector)
        })
      }
      // if(literal.text.trim()){
      //   // templateSpanNode.push(literal)
      //   templateSpanNode.push({
      //     type: "textNode",
      //     text: literal.text.trim(),
      //     tsNode: literal,
      //   })
      // }
      return []
    }
    function extractIdentifier(node: ts.Identifier) {
      let definitionNodes = tsHelp.getDefinitionNodes(fileName, node.getStart());
      let validNodes = definitionNodes.filter((refNode) => {
        return refNode
      })
      let result = validNodes.map((node) => extractCssSelectorWork(node) || [])
      return flatten(result)
      let nodes = validNodes.map(node => {
        // return tsServer.findNodeByRange(node)
      })
    }
    function extractCallExpression(node: ts.CallExpression) {
      let { expression, arguments: _arguments } = node
      // let callExpression =  new CallExpressionChain(node)
      scope.addCallExpressionChainToScope(new CallExpressionChain(node))
      // _extraInfo.callExpressionChain.setParent(scope?.callExpressionChain);


      let functionNode = omitUndefined(tsHelp.getDefinitionNodes(fileName, node.getStart()))[0];
      // function parseFunction(node: ts.FunctionDeclaration, _arguments: ts.NodeArray<ts.Expression>) {
      //   let { body } = node
      //   let results = extractCssSelectorWork(body, _extraInfo);


      //   let newResults: JsxElementUnion[] = []
      //   results?.forEach(result => {
      //     if (result.tsNode && result.tsNode.parent == functionNode && result.type == 'tsNode' && result.tsNode.kind == ts.SyntaxKind.Parameter) {
      //       let paramsResults = extractCssSelectorWork(_arguments[0])//
      //       if (paramsResults) {
      //         newResults = newResults.concat(paramsResults)
      //       }
      //       return
      //     }
      //     newResults.push(result)
      //   })
      //   return newResults
      // }
      if (expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
        if ((expression as ts.PropertyAccessExpression).name.escapedText == 'map') {
          return extractCssSelectorWork(_arguments[0])
        }
      }
      //TODO params jsxelement
      let results = extractCssSelectorWorkWithScope(node, scope.getChildScope());
      return results
      // return parseFunction(functionNode as ts.FunctionDeclaration, _arguments)
      // return  extractCssSelectorWork(expression)
    }
    function extractVariableDeclarationList(node: ts.VariableDeclarationList) {
      return ts.forEachChild(node, extractCssSelectorWork) || []
    }
    function extractFirstStatement(node: ts.VariableStatement) {
      // extractCssSelectorWork(node.expression)
      // let { literal ,expression} = node
      let { declarationList } = node
      // extractCssSelectorWork(declarationList)
      return ts.forEachChild(declarationList, extractCssSelectorWork) || []
    }


    function extractStringLiteral(node: ts.StringLiteral): JsxElementNode[] {
      let { text, } = node
      let classNames: JsxElementNode[] = []
      const  jsxElementNode = scope.getJsxElementNode()
      const  jsxAttrName = scope.getJsxAttrName()
      if(scope.isJsxAttrStage()){
        let domSelector = new DomSelector(node, typescript)
        domSelector.selectors.forEach(selector => {
          let eleSelector = new JsxElementSelector(node,jsxElementNode,jsxAttrName)
          eleSelector.text = selector.text
          eleSelector.offset = selector.offset
          // templateSpanNode.unshift(eleSelector)
          jsxElementNode.addSelector(eleSelector)
          // classNames.push({
          //   type: "textNode",
          //   text: selector.text,
          //   offset: selector.offset,
          //   tsNode: node,
          // })
        })
  
      }
      return []
      // return classNames
      // return [
      //   {
      //     type: "textNode",
      //     text: text,
      //     tsNode: node,
      //   }
      // ]
    }
    function extractNoSubstitutionTemplateLiteral(node): JsxElementNode[] {
      return extractStringLiteral(node as ts.StringLiteral)
    }
    function extractTaggedTemplateExpression(node: ts.TaggedTemplateExpression){
      const { tag, template } = node
      let tagName = ''
      // todo
      //  ts.PropertyAccessExpression  ts.SyntaxKind.CallExpression  
      // args identifier -> ts.TaggedTemplateExpression 
      // args identifier -> ts.FunctionDeclartion->
      let templateString = ''

      if(node.tag.kind == ts.SyntaxKind.StringLiteral){
        // let tagName = node.tag.name.escapedText.toString()

        return []
      }
      if(node.tag.kind == ts.SyntaxKind.CallExpression){
        const tag = node.tag as  ts.CallExpression
        const {  arguments:_args,expression   } = (node.tag as  ts.CallExpression)
        const _extraInfo = {...scope}
        // _extraInfo.callExpressionChain = new CallExpressionChain(tag);
        // _extraInfo.callExpressionChain.setParent(scope?.callExpressionChain)
        extractCssSelectorWork(_args[0])
        return []
      }

      return []
      function getExtendStyled(node: ts.TaggedTemplateExpression) {
        const { tag, template } = node
        if (tag.kind == ts.SyntaxKind.CallExpression) {
          let { expression, arguments: _arguments } = tag as ts.CallExpression;
          if (expression.getText() == 'styled') {
            let styledComponentIndentifer = _arguments[0]
            let styledComponentNode = tsHelp.getDefinitionLastNodeByIdentiferNode(styledComponentIndentifer);
            if (styledComponentNode.kind == ts.SyntaxKind.FirstStatement) {
              let { declarationList } = styledComponentNode as ts.VariableStatement
              return ts.forEachChild(declarationList, (node) => {
                if (node.kind == ts.SyntaxKind.VariableDeclaration) {
                  let variableDeclarationNode = node as ts.VariableDeclaration
                  if (variableDeclarationNode.initializer && variableDeclarationNode.initializer?.kind == ts.SyntaxKind.TaggedTemplateExpression) {
                    return getExtendStyled(variableDeclarationNode.initializer as ts.TaggedTemplateExpression)
                  }
                }
              }) as JsxElementNode
            }
          }
          throw new Error('tag give fail')
        } else {
          const _tag = tag as ts.PropertyAccessExpression
          tagName = _tag.name.escapedText.toString()
          //
          // templateString += '/n'
          // templateString += template.getFullText()
        }
      }
      getExtendStyled(node)




      //todo  提取css对象 关联上同级className
      // return {
      //   type: "TaggedTemplateExpression",
      //   tagName: tagName,
      //   tag: tag,
      //   tsNode: node,
      //   // templateString
      // }
      // extractCssSelectorWork(node.expression)
      // let { literal ,expression} = node

    }


    function extractArrayLiteralExpression(node: ts.ArrayLiteralExpression) {
      const { elements } = node
      let result = omitUndefined(elements.map((node)=>{
        return extractCssSelectorWork(node)
      }))
      return flatten(result)
    }


    // extractJsxElement2

    function extractCssSelectorWork(node: ts.Node | undefined,){



      switch (node?.kind) {
        case ts.SyntaxKind.VariableStatement:
          return extractVariableStatement(node as ts.VariableStatement);
        case ts.SyntaxKind.VariableDeclaration:
          return extractVariableDeclaration(node as ts.VariableDeclaration);
        case ts.SyntaxKind.ArrowFunction:
        case ts.SyntaxKind.FunctionDeclaration:
          return extractArrowFunction(node as ts.ArrowFunction)
        case ts.SyntaxKind.Block:
          return extractBlock(node as ts.Block)
        case ts.SyntaxKind.ConditionalExpression:
          return extractConditionalExpression(node as ts.ConditionalExpression)
        case ts.SyntaxKind.JsxElement:
          return extractJsxElement2(node as ts.JsxElement);
        case ts.SyntaxKind.JsxAttributes:
          return extractJsxAttributes(node as ts.JsxAttributes);
        case ts.SyntaxKind.JsxExpression:
          return extractJsxExpress(node as ts.JsxExpression)
        case ts.SyntaxKind.TemplateExpression:
          return extractTemplateExpression(node as ts.TemplateExpression)
        case ts.SyntaxKind.TemplateSpan:
          return extractTemplateSpan(node as ts.TemplateSpan);
        case ts.SyntaxKind.Identifier:
          return extractIdentifier(node as ts.Identifier);
        case ts.SyntaxKind.CallExpression:
          return extractCallExpression(node as ts.CallExpression);
        case ts.SyntaxKind.VariableDeclarationList:
          return extractVariableDeclarationList(node as ts.VariableDeclarationList);
        case ts.SyntaxKind.FirstStatement:
          return extractFirstStatement(node as ts.VariableStatement);
        case ts.SyntaxKind.StringLiteral:
          return extractStringLiteral(node as ts.StringLiteral);
        case ts.SyntaxKind.FirstTemplateToken:
          return extractNoSubstitutionTemplateLiteral(node as ts.NoSubstitutionTemplateLiteral);
        case ts.SyntaxKind.TaggedTemplateExpression:
          return extractTaggedTemplateExpression(node as ts.TaggedTemplateExpression)
        // case ts.SyntaxKind.PropertyAccessExpression:
        //   return extractPropertyAccessExpression(node as ts.PropertyAccessExpression)
        case ts.SyntaxKind.ArrayLiteralExpression:
          return extractArrayLiteralExpression(node as ts.ArrayLiteralExpression);
        // case ts.SyntaxKind.JsxAttribute:
        //   return extractJsxAttribute(node as ts.JsxAttribute)
        case ts.SyntaxKind.Parameter:
          return []
        default:
          return []
      }
    }
    // extractCssSelectorWork(node)
    return []
  }
  function extractCssSelectorWorkNodes(nodes: ts.NodeArray<ts.Node>) {
    // return flatten(nodes.map((node) => extractCssSelectorWorkWithScope(node) || []))
  }
  let rootJsxElementNode = new JsxElementNode(node, 'styledElement');
  let scope = new ExtractCssSelectorWorkScope()
  scope.addJsxElementNodeToScope(rootJsxElementNode)
  scope.addRuntimeStageToScope(runtimeStage.children)
  scope.addParentScope(scope)
  extractCssSelectorWorkWithScope(node, scope.getChildScope()) as JsxElementNode[]
  return [rootJsxElementNode]
}