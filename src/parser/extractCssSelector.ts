


// type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript/lib/tsserverlibrary'
import {  DomSelector, JsxElementNode, JsxElementSelector } from '../factory/nodeFactory'
import logger from '../service/logger'
import TsHelp from '../service/tsHelp'
import { findResult, flatten, unique, omitUndefined, noop } from '../utils/utils'
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

class CustomObject {
  constructor(readonly values: any){

  }
}

interface ExtractCssSelectorWorkScopeInterface{

  jsxElementNode?: JsxElementNode
  runtimeStage?: runtimeStage
  jsxAttrName?: string
  callExpression?: {
    tsNode: ts.Node,
    expression: ts.Expression,
    args?: ts.NodeArray<ts.Expression>;
    props?: CustomObject
    functionDeclartion?: ts.ArrowFunction | ts.FunctionDeclaration,
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
    !this.scope.parentScope && (this.scope.parentScope = this)
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
    this.scope =  this.scope ||  new ExtractCssSelectorWorkScope();
    let scope = this.scope
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
  }
  getClassDeclarationScope(classDeclaration: ts.ClassDeclaration):ExtractCssSelectorWorkScope|undefined{
    if(this.callExpression && this.callExpression.classDeclaration == classDeclaration){
      return this
    }else{
      return this.parentScope?.getClassDeclarationScope(classDeclaration)
    }
  }
  getFunctionDeclartionScope(functionDeclartion: ts.FunctionDeclaration | ts.ArrowFunction):ExtractCssSelectorWorkScope|undefined{
    if(this.callExpression && this.callExpression.functionDeclartion == functionDeclartion){
      return this
    }else{
      return this.parentScope?.getFunctionDeclartionScope(functionDeclartion)
    }
  }
  getJsxElementNode(){
    return this.getParentScopeProp('jsxElementNode')
  }
  isJsxAttrStage(){
    return this.getCurrentStage() == runtimeStage.jsxAttr
  }

}






export default function extractCssSelectorWorkWrap({ node, languageService, tsHelp, typescript }: { node: ts.Node, languageService: ts.LanguageService, tsHelp: TsHelp, typescript: typeof ts }): JsxElementNode[] {
  const sourceFile = node.getSourceFile()
  let ts = typescript
  let rootJsxElementNode: JsxElementNode|undefined
  const styledElements:JsxElementNode[] = []
  function extractCssSelectorWorkWithScope(node: ts.Node | undefined, scope: ExtractCssSelectorWorkScope) {
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
      let { initializer,name } = node
      if(ts.isIdentifier(name)){
        return extractCssSelectorWork(initializer)
      }
      if(ts.isBindingName(name)){
        let { elements } = name

      }
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
    function parseSelector(attributes: ts.JsxAttributes,scope:ExtractCssSelectorWorkScope){
      attributes.properties.forEach(property=>{
        if(property.kind == ts.SyntaxKind.JsxAttribute){
          let { name,initializer }   = property
          if(['className','id'].includes(property.name && property.name?.getText())){
            scope.addJsxAttrNameToScope(name.getText())
            extractCssSelectorWorkWithScope(initializer,scope.getChildScope());
            scope.addJsxAttrNameToScope(undefined)
            scope.deleteChildScope()
          }
        }
      })
    }
    function parseChildren(children,scope){
      children.forEach(child=>{
        extractCssSelectorWorkWithScope(child,scope)
      })
    }
    
    function extractJsxElement2(node: ts.JsxElement| ts.JsxSelfClosingElement) {
      logger.info(node.getFullText())
      let sourceFile = node.getSourceFile()
      let openingElement =  node.kind == ts.SyntaxKind.JsxElement ?   node.openingElement : node;
      const children =  node.kind == ts.SyntaxKind.JsxElement ? node.children : []
     
      let identiferNodeDefine = tsHelp.getJsxOpeningElementDefineNode(openingElement);
      let isCustomJsxElement = false
      let isInstrinsicElement = true
      if(identiferNodeDefine){
        let defines = tsHelp.getDefinition(identiferNodeDefine.getSourceFile().fileName, identiferNodeDefine.getStart())
        isCustomJsxElement =  tsHelp.isCustomJsxElement(defines)
        isInstrinsicElement =  !isCustomJsxElement
      }
      let parentJsxElementNode = scope.getJsxElementNode();
      if(isInstrinsicElement){
        let jsxElementNode =  new JsxElementNode(node, "intrinsicElement");
        jsxElementNode.addParent(parentJsxElementNode)
        parentJsxElementNode && parentJsxElementNode.addChild(jsxElementNode)
        scope.addJsxElementNodeToScope(jsxElementNode)
        if( node.kind == ts.SyntaxKind.JsxElement){
          parseSelector(node.openingElement.attributes,scope.getChildScope()) 
        }
        parseChildren(children,scope.getChildScope())
      }
      if(isCustomJsxElement){
        const attributeObjs:object = {}
        if( node.kind == ts.SyntaxKind.JsxElement){
          node.openingElement.attributes.properties.forEach(property=>{
            if (property.kind == ts.SyntaxKind.JsxAttribute) {
              let { name, initializer  } = property
              attributeObjs[name.escapedText.toString()] = initializer
            }
          })
        }
        if (identiferNodeDefine) {
          // scope.addJsxElementNodeParameterToScope()
          scope.addCallExpressionToScope({
            tsNode: node,
            expression: openingElement,
            props: new CustomObject({
              children: children,
              ...attributeObjs,
            })
          })
          extractCssSelectorWorkWithScope(identiferNodeDefine,scope.getChildScope())
        }
      }
      scope.deleteChildScope()
      return []

    }

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
      return []
    }

     /**
     * this.props.user 
     * this.renderUser 
     * _props=props   user = _props.user
     * 
     * _user = user
     * age = _user.age
     */
    function getPropertyAccessExpression(node:ts.PropertyAccessExpression){
      const { expression, name} = node
      if(ts.isPropertyAccessExpression(node.expression)){
        let objectLiteralNode = getPropertyAccessExpression(expression as  ts.PropertyAccessExpression);
        if(!objectLiteralNode){
          return
        }
        return getObjectValueByName(objectLiteralNode,name);
      }else{
        let objectLiteralNode = getIdentifier(expression as ts.Identifier)
        if(!objectLiteralNode){
          return
        }
        return getObjectValueByName(objectLiteralNode,name);
      }

    }
		function isObject(objectLiteral: ts.ObjectLiteralExpression|object): objectLiteral is object{
			return typeof objectLiteral == 'object'
		}

    function getObjectValueByName(objectInfo: ts.ClassDeclaration | ts.ObjectLiteralExpression| CustomObject,name: ts.Node){
      // let objectLiteral = getObjectLiteral(identifierNode);
      let nameText = name.getText()
			if(objectInfo instanceof CustomObject &&  isObject(objectInfo)){
				return objectInfo.values[name.getText()]
			}
			if(ts.isObjectLiteralExpression(objectInfo)){
				const { properties } = (objectInfo as ts.ObjectLiteralExpression) 
				let value = properties.find(property=>{
					return property.name?.getText() == name.getText()
				})
        if(value && ts.isPropertyAssignment(value)){
          return value.initializer
        }
				return value as ts.Node
			}
			if(ts.isClassDeclaration(objectInfo)){
				const { members  } = (objectInfo as ts.ClassDeclaration) 
        let callScope = scope.getClassDeclarationScope(objectInfo);
				const  { props, } = callScope?.callExpression || {}
				if(nameText == 'props'){
					return props;
				}else{
					let methodMember = members.find(member => member.name?.getText() == nameText)
					if(methodMember){
            if(methodMember.kind == ts.SyntaxKind.MethodDeclaration){
              return methodMember
            }
            if(methodMember.kind == ts.SyntaxKind.PropertyDeclaration){
              return (methodMember as ts.PropertyDeclaration).initializer
            }
						// return methodMember
					}
				}
			}
    }
    function getParameter(node: ts.ParameterDeclaration):CustomObject| ts.Expression | undefined {
      let currentCallExpression = node.parent
      if (ts.isFunctionDeclaration(currentCallExpression) || ts.isArrowFunction(currentCallExpression) || ts.isMethodDeclaration(currentCallExpression)) {
        // let currentScope = scope.getScope('callExpression');
        let currentScope = scope.getFunctionDeclartionScope(currentCallExpression as ts.FunctionDeclaration)
        if (currentScope?.scope == currentScope) currentScope = undefined
        if (currentScope) {
          const  { props ,expression,args = []}  = currentScope.callExpression || {}
          if(expression){
            if (expression?.kind == ts.SyntaxKind.JsxOpeningElement) {
              return props
            }else if(ts.isCallExpression(expression)){
              const { parameters } = currentCallExpression
              let paramsIndex = parameters.findIndex(p => p.name.getText() == node.name.getText());
              if(paramsIndex >-1){
                return args[paramsIndex]
              }
              // return args.find(arg=>{
              //   return arg.getText() == node.getText()
              // })
            }else {
  
              logger.info()
            }
          }
        }
      }
      return
    }
    function isObjectOrObjectLiteral(obj:  CustomObject | ts.Node): obj is (CustomObject |ts.ObjectLiteralExpression){
      return  obj instanceof CustomObject || ts.isObjectLiteralExpression(obj)
    }
    /**
     * object   this.props.name
     * Objectliteral   user.name
     * parameter 
     * objectBindingPattern 
     */
    function getIdentifier(node:ts.Node){
      logger.info(node.getFullText())
      let defNode = tsHelp.getDefinitionNode(node) as (ts.Node);
      if(!defNode){
        return
      }
      logger.info(defNode.getFullText())
      if(ts.isVariableStatement(defNode)){
        const {  declarationList  } = defNode
        let value
        declarationList.declarations.forEach(declaration=>{
          const {  name,initializer  } = declaration
          if(!initializer || !(ts.isIdentifier(initializer) || initializer.kind == ts.SyntaxKind.ThisKeyword || ts.isObjectLiteralExpression(initializer))){
            return 
          }
          if(ts.isObjectBindingPattern(name)){
            let existName = name.elements.find(element=>{
              return element.name.getText() == node.getText()
            })
            if(!existName){
              return
            }
            if(ts.isObjectLiteralExpression(initializer)){
              value = initializer
              return
            }
            // let objectLiteralNode = getObjectLiteral(initializer as ts.Identifier)
            let initializerValue  = getIdentifier(initializer as ts.Identifier)
           
            if(initializerValue){
              if(isObjectOrObjectLiteral(initializerValue)){
                value = getObjectValueByName(initializerValue,existName.propertyName || existName.name)
              }
            }
          }else{
            if(name.getText() != node.getText()){
                return
            }
            if(ts.isObjectLiteralExpression(initializer)){
              value = initializer
              return
            }
            value =  getIdentifier(initializer as ts.Identifier)
					}
        })
        return value
      }
      if(ts.isPropertyAccessExpression(defNode)){
        return getPropertyAccessExpression(defNode)
      }
      if(ts.isParameter(defNode)){
	      return getParameter(defNode);
      }
      // if(ts.isNewExpression(defNode)){
      //   return undefined
      // }
      if(defNode.kind == ts.SyntaxKind.ThisKeyword){
        let container = ts.getThisContainer(node,false,false);
        if(container.kind == ts.SyntaxKind.MethodDeclaration){
          if(container.parent.kind == ts.SyntaxKind.ClassDeclaration){
            let classDeclarationScope = scope.getClassDeclarationScope(container.parent);
            const  {  classDeclaration,props}  = classDeclarationScope?.callExpression || {}
            if(classDeclaration){
              let objectInfo:object = {
                props: props,
              }
              let { members } = classDeclaration
              members.forEach(member=>{
                let nameText = member.name?.getText()
                if(!nameText){
                  return
                }
                if(ts.isMethodDeclaration(member)){
                  objectInfo[nameText] = member.body
                }
              })
              return new CustomObject(objectInfo)
            }
          }
        }
      }
      return defNode
    }
    function extractIdentifier(node: ts.Identifier) {
      let defNode = getIdentifier(node)
			if(defNode){
				return extractCssSelectorWork(defNode)
			}else{

        let definitionNodes = tsHelp.getDefinitionNodes(node.getSourceFile().fileName, node.getStart());
        definitionNodes.forEach(extractCssSelectorWork)
				// return extractCssSelectorWork(node)
      }



      // let definitionNodes = tsHelp.getDefinitionNodes(node.getSourceFile().fileName, node.getStart());
      // let validNodes = definitionNodes.filter((refNode) => {
      //   return refNode
      // })
      // // let {title,...reset} = props  dotdotdot
      // // node.getText() == 'title'
      // let result = validNodes.map((node) => extractCssSelectorWork(node) || [])
      // return flatten(result)
    }
    function extractCallExpression(node: ts.CallExpression) {
      let { expression, arguments: _arguments } = node
      scope.addCallExpressionToScope({
        tsNode: node,
        expression:node,
        args: _arguments
      })
      if (expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
        if ((expression as ts.PropertyAccessExpression).name.escapedText == 'map') {
          return extractCssSelectorWorkWithScope(_arguments[0],scope.getChildScope())
        }
      }
      let results = extractCssSelectorWorkWithScope(node.expression, scope.getChildScope());
      scope.deleteChildScope();
      return results
    }
    function extractVariableDeclarationList(node: ts.VariableDeclarationList) {
      return ts.forEachChild(node, extractCssSelectorWork) || []
    }
    function extractFirstStatement(node: ts.VariableStatement) {
      // extractCssSelectorWork(node.expression)
      // let { literal ,expression} = node
      let { declarationList } = node
      // extractCssSelectorWork(declarationList)
      return extractCssSelectorWork(declarationList[0])
      // return ts.forEachChild(declarationList, extractCssSelectorWork) || []
    }


    function extractStringLiteral(node: ts.StringLiteral) {
      let { text, } = node
      const  jsxElementNode = scope.getJsxElementNode()
      const  jsxAttrName = scope.getJsxAttrName()
      if(scope.isJsxAttrStage()){
        let domSelector = new DomSelector(node, typescript)
        domSelector.selectors.forEach(selector => {
          let eleSelector = new JsxElementSelector(node,jsxElementNode,jsxAttrName)
          eleSelector.text = selector.text
          eleSelector.offset = selector.offset
          jsxElementNode.addSelector(eleSelector)
        })
  
      }
    }
    function extractNoSubstitutionTemplateLiteral(node) {
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
      let parentScope = scope.getScope('jsxElementNode')
      let callExpressionScope = scope.getScope('callExpression')
      let parentJsxElementNode = parentScope?.jsxElementNode
      let jsxElementNode =  new JsxElementNode(callExpressionScope?.callExpression?.tsNode || node, "styledElement");
      styledElements.push(jsxElementNode)
      if(!parentJsxElementNode){
        parentJsxElementNode = rootJsxElementNode = jsxElementNode
      }else{
        jsxElementNode.addParent(parentJsxElementNode)
        parentJsxElementNode && parentJsxElementNode.addChild(jsxElementNode)
      }
      scope.addJsxElementNodeToScope(jsxElementNode)
      let  { callExpression } = callExpressionScope || {}

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
          const {   attributes   } = callExpression.expression as  ts.JsxOpeningElement
          let { children = [] } = callExpression.props?.values || {}
          parseSelector(attributes,scope.getChildScope())
          parseChildren(children,scope.getChildScope())
        }
      
      }

      if(node.tag.kind == ts.SyntaxKind.StringLiteral){
        // let tagName = node.tag.name.escapedText.toString()

        return 
      }
      if(node.tag.kind == ts.SyntaxKind.CallExpression){
        const tag = node.tag as  ts.CallExpression
        const {  arguments:_args,expression   } = (node.tag as  ts.CallExpression)
        const _extraInfo = {...scope}
        // _extraInfo.callExpressionChain = new CallExpressionChain(tag);
        // _extraInfo.callExpressionChain.setParent(scope?.callExpressionChain)
        extractCssSelectorWork(_args[0])
        if(callExpression){
          const {   attributes   } = callExpression.expression as  ts.JsxOpeningElement
          let { children = [] } = callExpression.props?.values || {} 
          // parseSelector(attributes,scope.getChildScope())
          parseChildren(children,scope.getChildScope())
        }
        return 
      }

      return 
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
			let result = getPropertyAccessExpression(node)
      if(result){
        extractCssSelectorWork(result)
      }
      return
      // extractCssSelectorWork(expression);
      // if(expression.kind == ts.SyntaxKind.PropertyAccessExpression){
      //   scope.addPropertyAccessExpress(node)
      //   extractCssSelectorWorkWithScope(expression,scope.getChildScope());
      //   scope.deleteChildScope()
      // }else{
      //   let defineNode = tsHelp.getDefinitionNodes(sourceFile.fileName,expression.getStart())[0];
      //   if(!defineNode){
      //     defineNode = tsHelp.getReferenceNodes(sourceFile.fileName,expression.getStart())[0]
      //   }
      //   if(!defineNode){
      //     return
      //   }
      //   if(defineNode.kind == ts.SyntaxKind.Parameter){
      //     let currentCallExpression = defineNode.parent
      //     if(currentCallExpression.kind == ts.SyntaxKind.FunctionDeclaration || currentCallExpression.kind == ts.SyntaxKind.ArrowFunction){
      //       // let currentScope = scope.getScope('callExpression');
      //       let currentScope = scope.getFunctionDeclartionScope(currentCallExpression as ts.FunctionDeclaration)
      //       if(currentScope?.scope == currentScope)currentScope = undefined
      //       if(currentScope){
      //         let { props = {},expression,args = [],functionDeclartion  } = currentScope?.callExpression || {}
      //         if(expression?.kind == ts.SyntaxKind.JsxOpeningElement){
      //           let value = props[nameText];
      //           if(Array.isArray(value)){
      //             value.forEach(extractCssSelectorWork)
      //           }
      //         }else{
      //           logger.info()
      //         }
      //       }
      //     }
      //     return
      //   }
      //   function parseClassDeclaration(node: ts.ClassDeclaration){
      //     let { members } = node
      //     let currentCallExpression = node
      //     let currentScope = scope.getClassDeclarationScope(currentCallExpression as ts.ClassDeclaration)
      //     if(currentScope?.scope == currentScope)currentScope = undefined
      //     if(currentScope){
      //       let { props = {},expression,tsNode  } = currentScope?.callExpression || {}
      //       if(expression?.kind == ts.SyntaxKind.JsxOpeningElement){
      //         if(nameText == 'props'){
      //           let nextProperty = scope.getScope('propertyAccessExpression')
      //           let nextNameText = nextProperty?.propertyAccessExpression?.name?.getText()
      //           if(nextNameText){
      //             let value = props[nextNameText];
      //             extractCssSelectorWork(value)
      //           }
      //         }else{
      //           let methodMember = members.find(member => member.name?.getText() == nameText)
      //           if(methodMember && methodMember.kind == ts.SyntaxKind.MethodDeclaration){
      //             extractCssSelectorWork((methodMember as ts.MethodDeclaration).body)
      //           }
      //         }
      //       }else{
      //         logger.info()
      //       }
            
      //     }
      //   }
      //   if(defineNode.kind == ts.SyntaxKind.ClassDeclaration){
      //     parseClassDeclaration(defineNode as ts.ClassDeclaration)
      //     return
      //   }
      //   scope.addPropertyAccessExpress(node)
      //   extractCssSelectorWorkWithScope(defineNode,scope.getChildScope());
      //   scope.deleteChildScope()
      //   logger.info(defineNode)
      // }


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
      function parsePropsValue(propsValue){
        let propertyScope = scope.getScope('propertyAccessExpression');
        let propertyName = propertyScope?.propertyAccessExpression?.name?.getText();
        if(propertyName){
          let value = propsValue[propertyName]
          extractCssSelectorWork(value)
        }
        propertyScope && (propertyScope.propertyAccessExpression = undefined)
      }
      if(container.kind == ts.SyntaxKind.MethodDeclaration){
        if(container.parent.kind == ts.SyntaxKind.ClassDeclaration){
          let classDeclarationScope = scope.getClassDeclarationScope(container.parent);
          let propertyScope = scope.getScope('propertyAccessExpression');
          if(propertyScope && classDeclarationScope){
            let propertyName = propertyScope.propertyAccessExpression?.name?.getText()
            if(propertyName == 'props'){
              let props = classDeclarationScope?.callExpression?.props
              let propsValue = props
              propertyScope.propertyAccessExpression = undefined
              parsePropsValue(propsValue)
              // extractCssSelectorWork(propsValue)
            }
          }
        }
      }
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
    function extractImportDeclaration(node: ts.ImportDeclaration){
      const  { importClause,   }  = node
      if(importClause){
        let  { name } =  importClause
        if(name){
          let moduleDefine = tsHelp.getDefinitionNodes(name.getSourceFile().fileName,name.getStart())[0];
          if(moduleDefine){

          }
        }
      }
    }
    function extractCssSelectorWork(node: ts.Node | undefined,){
      if(Array.isArray(node)){
        return node.map(extractCssSelectorWork)
      }
      let nodeText = node?.getText();
      let nodeKind = node?.kind && ts.SyntaxKind[node?.kind]
      logger.info(nodeText)
      
      switch (node?.kind) {
        case ts.SyntaxKind.VariableStatement:
          return extractVariableStatement(node as ts.VariableStatement);
        case ts.SyntaxKind.VariableDeclaration:
          return extractVariableDeclaration(node as ts.VariableDeclaration);
        case ts.SyntaxKind.ClassDeclaration:
          return extractClassDeclaration(node as ts.ClassDeclaration)
        case ts.SyntaxKind.ArrowFunction:
        case ts.SyntaxKind.FunctionDeclaration:
        case ts.SyntaxKind.MethodDeclaration:
          return extractArrowFunction(node as ts.ArrowFunction)
        case ts.SyntaxKind.Block:
          return extractBlock(node as ts.Block)
        case ts.SyntaxKind.ConditionalExpression:
          return extractConditionalExpression(node as ts.ConditionalExpression)
        case ts.SyntaxKind.JsxElement:
        case ts.SyntaxKind.JsxSelfClosingElement:
          return extractJsxElement2(node as ts.JsxElement);
        case ts.SyntaxKind.SyntaxList:
        case ts.SyntaxKind.JsxFragment:
          return parseChildren(node.getChildren(),scope)
        case ts.SyntaxKind.JsxAttributes:
          return extractJsxAttributes(node as ts.JsxAttributes);
        case ts.SyntaxKind.JsxExpression:
          return extractJsxExpress(node as ts.JsxExpression)
        case ts.SyntaxKind.TemplateExpression:
          return extractTemplateExpression(node as ts.TemplateExpression)
        case ts.SyntaxKind.TaggedTemplateExpression:
          return extractTaggedTemplateExpression(node as ts.TaggedTemplateExpression)
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
       
        case ts.SyntaxKind.PropertyAccessExpression:
          return extractPropertyAccessExpression(node as ts.PropertyAccessExpression)
        case ts.SyntaxKind.ArrayLiteralExpression:
          return extractArrayLiteralExpression(node as ts.ArrayLiteralExpression);
        case ts.SyntaxKind.ObjectLiteralExpression:
          return extractObjectLiteralExpression(node as ts.ObjectLiteralExpression);
        case ts.SyntaxKind.ImportDeclaration:
          return extractImportDeclaration(node as ts.ImportDeclaration)
        //todo
        // case ts.SyntaxKind.NewExpression:
        //   return extractJsxAttribute(node as ts.JsxAttribute)
        case ts.SyntaxKind.Parameter:
          return 
        case ts.SyntaxKind.ExportAssignment:
          return extractCssSelectorWork((node as ts.ExportAssignment).expression)
        case ts.SyntaxKind.ParenthesizedExpression:
          return extractCssSelectorWork((node as ts.ParenthesizedExpression).expression)
        case ts.SyntaxKind.BinaryExpression:
          extractCssSelectorWork((node as ts.BinaryExpression).left);
          extractCssSelectorWork((node as ts.BinaryExpression).right)
          return
        default:
          logger.warn('empty----',node && ts.SyntaxKind[node?.kind],nodeText)
          return 
      }
    }
    // extractCssSelectorWork(node)
    return 
  }
  let scope = new ExtractCssSelectorWorkScope()
  // scope.addJsxElementNodeToScope(rootJsxElementNode)
  // scope.addRuntimeStageToScope(runtimeStage.children)
  // scope.addParentScope(scope)
  extractCssSelectorWorkWithScope(node, scope.getChildScope()) as JsxElementNode[]
  // scope.deleteChildScope()
  // let rootJsxElementNode = scope.getChildScope()?.jsxElementNode as any
  // if(rootJsxElementNode){
  //   return [rootJsxElementNode]
  // }
  return styledElements
}