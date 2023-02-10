


// type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript/lib/tsserverlibrary'
import { CallExpressionChain, DomSelector, JsxElementNode, JsxElementSelector } from '../factory/nodeFactory'
import logger from '../service/logger'
import TsHelp from '../service/tsHelp'
import { findResult, flatten, unique, omitUndefined, noop } from '../utils/utils'
import { containerNames, cssSelectors } from './types'
// import {} from 'typescript/'


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

interface ExtractCssSelectorWorkScopeInterface{

  jsxElementNode?: JsxElementNode
  runtimeStage?: runtimeStage
  jsxAttrName?: string
  callExpression?: {
    tsNode: ts.Node,
    expression:ts.Expression,
    args?: ts.NodeArray<ts.Expression>;
    props?: any
    functionDeclartion?: ts.ArrowFunction,
    classDeclaration?: ts.ClassDeclaration
  },
  propertyAccessExpression?:ts.PropertyAccessExpression
  parentScope?: ExtractCssSelectorWorkScope

}


class ExtractCssSelectorWorkScope implements ExtractCssSelectorWorkScopeInterface{
  jsxElementNode?: JsxElementNode
  jsxElementNodeParameter?:any
  runtimeStage?: runtimeStage
  jsxAttrName?: string
  callExpression?: ExtractCssSelectorWorkScopeInterface['callExpression']
  scope?: ExtractCssSelectorWorkScope
  parentScope?: ExtractCssSelectorWorkScope
  propertyAccessExpression?:ts.PropertyAccessExpression
  addChildScope(name: keyof ExtractCssSelectorWorkScopeInterface,value){
    this.scope = this.scope || new ExtractCssSelectorWorkScope();
    this.scope[name] = value
  }
  addJsxAttrNameToScope(value?: string){
    this.addChildScope('jsxAttrName',value)
    if(value){
      this.addRuntimeStageToScope(runtimeStage.jsxAttr)
    }else{
      this.addRuntimeStageToScope(runtimeStage.undefined)
    }
  }
  addRuntimeStageToScope(value:runtimeStage){
    this.addChildScope('runtimeStage',value)
  }
  addJsxElementNodeToScope(jsxElementNode: JsxElementNode){
    this.addChildScope('jsxElementNode',jsxElementNode)
  }
  // addJsxElementNodeParameterToScope(params = {}){
  //   this.addChildScope('jsxElementNodeParameter',params)
  // }
  addCallExpressionToScope(value: ExtractCssSelectorWorkScope['callExpression']){
    this.addChildScope('callExpression',value)
  }
  addParentScope(parent:ExtractCssSelectorWorkScope){
    this.addChildScope('parentScope',parent)
  }
  addPropertyAccessExpress(node: ts.PropertyAccessExpression){
    this.addChildScope("propertyAccessExpression",node)
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
  getCallExpression(){
    return this.getParentScopeProp('callExpression')
  }
  getParentScopeProp(propName){
    let scope = this.getScope(propName)
    // return scope && scope[propName] || undefined
    return scope && scope[propName] || undefined
  }
  getScope(propName: keyof ExtractCssSelectorWorkScopeInterface):ExtractCssSelectorWorkScope|undefined{
    // let scope: ExtractCssSelectorWorkScope
    if(this[propName]){
      return this
    }else{
      return this.parentScope?.getScope(propName)
    }
    // let scope:ExtractCssSelectorWorkScope =  this 
    // while(scope && !scope[propName]){
    //   if(scope.parentScope){
    //     scope = scope.parentScope
    //   }else{
    //     return 
    //   }
    // }
    // return scope
  }
  getClassDeclarationScope(classDeclaration: ts.ClassDeclaration){
    if(this.callExpression && this.callExpression.classDeclaration == classDeclaration){
      return this
    }else{
      return this.parentScope?.getClassDeclarationScope(classDeclaration)
    }
  }
  getJsxElementNode(){
    return this.getParentScopeProp('jsxElementNode')
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
    // logger.info(ts.SyntaxKind[node.kind], "----------"); console.log(node.getFullText());
    extractCssSelectorWork(node)
    function extractVariableStatement(node: ts.VariableStatement) {
      return ts.forEachChild(node.declarationList, extractCssSelectorWork) || []
    }
    function extractVariableDeclaration(node: ts.VariableDeclaration) {
      let { initializer } = node
      return extractCssSelectorWork(initializer)
    }
    function extractArrowFunction(node: ts.ArrowFunction) {
      let { body, name } = node
      let parentScope =  scope.getScope("callExpression");
      if(parentScope && parentScope.callExpression){
        parentScope.callExpression.functionDeclartion = node
      }
      return extractCssSelectorWork(body);
    }
    function extractBlock(node: ts.Block) {
      let { statements = [] } = node
      let returnStatements = statements.filter(statement => {
        return statement.kind == ts.SyntaxKind.ReturnStatement
      }) as ts.ReturnStatement[]

      let results: JsxElementUnion[] = []
      returnStatements.forEach((statement) => {
        let expressionResult = extractCssSelectorWork(statement.expression) || []
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
    function parseSelector(attributes: ts.JsxAttributes,scope){
      attributes.properties.forEach(property=>{
        if(property.kind == ts.SyntaxKind.JsxAttribute){
          let { name,initializer }   = property
          if(['className','id'].includes(property.name && property.name?.getText())){
            scope.addJsxAttrNameToScope(name.getText())
            extractCssSelectorWorkWithScope(initializer,scope.getChildScope());
            scope.addJsxAttrNameToScope(undefined)
          }
        }
      })
      scope.deleteChildScope()
    }
    function parseChildren(children,scope){
      children.forEach(child=>{
        extractCssSelectorWorkWithScope(child,scope)
      })
    }

    function extractJsxElement2(node: ts.JsxElement) {
      logger.info(node.getFullText())
      let sourceFile = node.getSourceFile()
      let parentJsxElementNode = scope.getJsxElementNode();
      let jsxElementNode =  new JsxElementNode(node, 'styledElement');
      jsxElementNode.addParent(parentJsxElementNode)
      parentJsxElementNode && parentJsxElementNode.addChild(jsxElementNode)
      // if(scope.isChildStage()){
      //   jsxElementNode.addParent(parentJsxElementNode)
      //   parentJsxElementNode && parentJsxElementNode.addChild(jsxElementNode)
      // }
      // if(scope.isJsxAttrStage()){
      //   parentJsxElementNode && parentJsxElementNode.addAttribute(scope.jsxAttrName ||'' ,jsxElementNode)
      // }
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
      let identiferNodeDefine = (tsHelp.getDefinition(sourceFile.fileName, identiferNode.getStart()) || [])[0];
      let isInstrinsicElement =  tsHelp.isIntrinsicElement(identiferNodeDefine)
      let isCustomJsxElement =  tsHelp.isCustomJsxElement(identiferNodeDefine)

      let identiferNodeReference = (tsHelp.getDefinitionNodes(sourceFile.fileName, identiferNode.getStart()) || [])[0];
      //instrinsic ele
      const { attributes } = openingElement
      scope.addJsxElementNodeToScope(jsxElementNode)
      if(isInstrinsicElement){
        parseSelector(attributes,scope.getChildScope()) 
        parseChildren(children,scope.getChildScope())
      }
      if(isCustomJsxElement){
        const attributeObjs:object = {}
        attributes.properties.forEach(property=>{
          if (property.kind == ts.SyntaxKind.JsxAttribute) {
            let { name, initializer  } = property
            attributeObjs[name.escapedText.toString()] = initializer
          }
        })
        if (identiferNodeReference) {
          // scope.addJsxElementNodeParameterToScope()
          scope.addCallExpressionToScope({
            tsNode: node,
            expression: openingElement,
            props: {
              children: children,
              ...attributeObjs,
            }
          })
          extractCssSelectorWorkWithScope(identiferNodeReference,scope.getChildScope())
              // extractCssSelectorWorkWithScope(attributes,scope.getChildScope())
            // scope.addRuntimeStageToScope(runtimeStage.children)
            // children.forEach((child) => {
            //   extractCssSelectorWorkWithScope(child,scope.getChildScope())
            // });
            // scope.addRuntimeStageToScope(runtimeStage.undefined)
        }
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
      scope.addCallExpressionToScope({
        tsNode: node,
        expression,
        args: _arguments
      })
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
      // if (expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
      //   if ((expression as ts.PropertyAccessExpression).name.escapedText == 'map') {
      //     return extractCssSelectorWork(_arguments[0])
      //   }
      // }
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
      let parrentScope = scope.getScope('jsxElementNode')
      let  { jsxElementNode,callExpression } = parrentScope || {}

      if(node.tag.kind == ts.SyntaxKind.PropertyAccessExpression && jsxElementNode){
        let tag = node.tag as ts.PropertyAccessExpression
        let {  expression,name } =  tag
        if(expression.getText() == 'styled'){
          let ele = name.getText();
          let eleSelector = new JsxElementSelector(name,jsxElementNode,ele)
          eleSelector.text = ele
          eleSelector.offset = name.getStart()
          // templateSpanNode.unshift(eleSelector)
          jsxElementNode.addSelector(eleSelector)
        }
        if(callExpression){
          let { children = [] } = callExpression.props || {} //attr selector
          parseChildren(children,scope.getChildScope())
        }
      
      }

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
    function extractPropertyAccessExpression(node: ts.PropertyAccessExpression){
      const { expression , name  } = node;
      let nameText = name.getText()
      let sourceFile = expression.getSourceFile()
      let defineNode = tsHelp.getDefinitionNodes(sourceFile.fileName,expression.getStart())[0];
      if(defineNode.kind == ts.SyntaxKind.Parameter){
        let currentCallExpression = defineNode.parent
        if(currentCallExpression.kind == ts.SyntaxKind.FunctionDeclaration || currentCallExpression.kind == ts.SyntaxKind.ArrowFunction){
          let currentScope = scope.getScope('callExpression');
          if(currentScope?.scope == currentScope)currentScope = undefined
          while(currentScope &&  currentScope?.callExpression?.functionDeclartion != currentCallExpression){
            currentScope = currentScope?.parentScope?.getScope('callExpression');
          }
          if(currentScope){
            let { props = {},expression,args = [],functionDeclartion  } = currentScope?.callExpression || {}
            if(expression?.kind == ts.SyntaxKind.JsxOpeningElement){
              let value = props[nameText];
              if(Array.isArray(value)){
                value.forEach(extractCssSelectorWork)
              }
            }else{
              logger.info()
            }
          }
        }
        return
      }
      if(defineNode.kind == ts.SyntaxKind.ClassDeclaration){
        let currentCallExpression = defineNode
        if(currentCallExpression.kind == ts.SyntaxKind.ClassDeclaration){
          let currentScope = scope.getScope('callExpression');
          if(currentScope?.scope == currentScope)currentScope = undefined
          while(currentScope &&  currentScope?.callExpression?.classDeclaration != currentCallExpression){
            currentScope = currentScope?.parentScope?.getScope('callExpression');
          }
          if(currentScope){
            let { props = {},expression } = currentScope?.callExpression || {}
            if(expression?.kind == ts.SyntaxKind.JsxOpeningElement){
              let value = props[nameText];
              if(Array.isArray(value)){
                value.forEach(extractCssSelectorWork)
              }
            }else{
              logger.info()
            }
            
          }
        }
        return
      }
      scope.addPropertyAccessExpress(node)
      // extractCssSelectorWork(expression);
      if(expression.kind == ts.SyntaxKind.PropertyAccessExpression){
        extractCssSelectorWorkWithScope(expression,scope.getChildScope());
      }else{
        extractCssSelectorWorkWithScope(defineNode,scope.getChildScope());
      }
      scope.deleteChildScope()
      logger.info(defineNode)


    }
    function extractClassDeclaration(node: ts.ClassDeclaration){
      let {  members,name  } = node;
      let parentScope =  scope.getScope("callExpression");
      
      let renderMember = members.find(member => member.name?.getText() == 'render')
      if(renderMember){ 
        if(parentScope && parentScope.callExpression){
          parentScope.callExpression.classDeclaration = node
        }
        if(renderMember.kind == ts.SyntaxKind.MethodDeclaration){
          extractCssSelectorWork((renderMember as ts.MethodDeclaration).body)
        }
      }
    }
    function extractThisKeyword(node: ts.ThisExpression){
      let container = ts.getThisContainer(node,false,false);
      
      if(container.kind == ts.SyntaxKind.MethodDeclaration){
        if(container.parent.kind == ts.SyntaxKind.ClassDeclaration){
          let classDeclarationScope = scope.getClassDeclarationScope(container.parent);
          let propertyScope = scope.getScope('propertyAccessExpression');
          if(propertyScope && classDeclarationScope){
            let propertyName = propertyScope.propertyAccessExpression?.name?.getText()
            if(propertyName == 'props'){
              let props = classDeclarationScope.callExpression.props
              let propsValue = props
              propertyScope.propertyAccessExpression = undefined
              function parsePropsValue(propsValue){
                let propertyScope = scope.getScope('propertyAccessExpression');
                let propertyName = propertyScope?.propertyAccessExpression?.name?.getText();
                if(propertyName){
                  let value = propsValue[propertyName]
                  extractCssSelectorWork(value)
                }
                propertyScope && (propertyScope.propertyAccessExpression = undefined)
              }
              parsePropsValue(propsValue)
              // extractCssSelectorWork(propsValue)
            }
          }
        }
      }
    }
    function extractPropertyAssignment(node: ts.PropertyAssignment){
      extractCssSelectorWork(node.initializer)
    }

    function extractObjectLiteralExpression(node: ts.ObjectLiteralExpression){
      let {  properties  } = node
      let hasPropertyAccessExpressionScope = scope.getScope("propertyAccessExpression");
      let nameText = hasPropertyAccessExpressionScope?.propertyAccessExpression?.name.getText();
      if(!nameText){
        return
      }
      let currentPropertyValue =  properties.find(property=>{
        return property.name?.getText() == nameText
      })
      if(!currentPropertyValue){
        return
      }
      hasPropertyAccessExpressionScope && (hasPropertyAccessExpressionScope.propertyAccessExpression = undefined)
      if(currentPropertyValue.kind == ts.SyntaxKind.PropertyAssignment){
        extractCssSelectorWork((currentPropertyValue as ts.PropertyAssignment).initializer)
      }
    }
    // extractJsxElement2

    function extractCssSelectorWork(node: ts.Node | undefined,){
      if(Array.isArray(node)){
        return node.map(extractCssSelectorWork)
      }

      logger.info(node?.getFullText())
      
      switch (node?.kind) {
        case ts.SyntaxKind.VariableStatement:
          return extractVariableStatement(node as ts.VariableStatement);
        case ts.SyntaxKind.VariableDeclaration:
          return extractVariableDeclaration(node as ts.VariableDeclaration);
        case ts.SyntaxKind.ClassDeclaration:
          return extractClassDeclaration(node as ts.ClassDeclaration)
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
        case ts.SyntaxKind.ThisKeyword:
          return extractThisKeyword(node as ts.ThisExpression);
        case ts.SyntaxKind.StringLiteral:
          return extractStringLiteral(node as ts.StringLiteral);
        case ts.SyntaxKind.FirstTemplateToken:
          return extractNoSubstitutionTemplateLiteral(node as ts.NoSubstitutionTemplateLiteral);
        case ts.SyntaxKind.TaggedTemplateExpression:
          return extractTaggedTemplateExpression(node as ts.TaggedTemplateExpression)
        case ts.SyntaxKind.PropertyAccessExpression:
          return extractPropertyAccessExpression(node as ts.PropertyAccessExpression)
        case ts.SyntaxKind.ArrayLiteralExpression:
          return extractArrayLiteralExpression(node as ts.ArrayLiteralExpression);
        case ts.SyntaxKind.ObjectLiteralExpression:
          return extractObjectLiteralExpression(node as ts.ObjectLiteralExpression);
        // case ts.SyntaxKind.PropertyAssignment:
        //   return extractObjectLiteralExpression(node as ts.ObjectLiteralExpression);
        //todo
        // case ts.SyntaxKind.NewExpression:
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
  // scope.addParentScope(scope)
  extractCssSelectorWorkWithScope(node, scope.getChildScope()) as JsxElementNode[]
  scope.deleteChildScope()
  return [rootJsxElementNode]
}