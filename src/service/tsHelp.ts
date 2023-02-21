


import * as ts from 'typescript/lib/tsserverlibrary'
import { containerNames } from '../parser/types'
import { getTaggedLiteralName, getTagName, isTaggedLiteral } from '../utils/templateUtil'
import { omitUndefined, unique } from '../utils/utils'

export default class TsHelp {
  constructor(typescript: typeof ts,languageService: ts.LanguageService){
    this.typescript = typescript
    this.languageService = languageService
  }
  typescript:typeof ts
  languageService: ts.LanguageService
  isInReferenceNode = (referenceNode:ts.ReferenceEntry,pos)=>{
    let start = referenceNode.contextSpan?.start || referenceNode.textSpan.start
    let end = start + (referenceNode.contextSpan?.length || referenceNode.textSpan.length)
    return start <= pos && end >= pos
  }
  findNode(sourceFile: ts.SourceFile, position: number){
    let  find = (node: ts.Node): ts.Node | undefined  => {
      if (position >= node.getStart() && position < node.getEnd()) {
        return this.typescript.forEachChild(node, find) || node;
      }
    }
    return find(sourceFile)
  }
  findNodeByRange(sourceFile: ts.SourceFile, startPosition: number,endPosition: number){
    let find = (node: ts.Node): ts.Node | undefined  => {
      if (startPosition == node.getStart() && endPosition == node.getEnd()) {
        return node;
      } else{
        let _node = this.typescript.forEachChild(node, find)
        return  _node;
      }
    }
    let _node = find(sourceFile)
    return _node
  }
  getStyledTemplateNodeNameIdentifier(templateNode){
    return templateNode.parent.parent
  }
  getReferences(fileName,pos:number,noSelf:boolean = true){
    let references =  this.languageService.getReferencesAtPosition(fileName,pos) || []
    return references.filter(reference=>{
      if(noSelf && this.isInReferenceNode(reference,pos)){
        return false
      }
      return reference
    })
  }
  getNodeOfReferences(fileName:string,pos: number,noSelf:boolean = true){
    let references = this.getReferences(fileName,pos);
    let program = this.languageService.getProgram()
    let referenceNodes:ts.Node[] = []
    references?.forEach(reference => {

      let sourceFile = program?.getSourceFile(reference.fileName)
      if (sourceFile) {
        let start = reference.textSpan.start
        let length = reference.textSpan.length
        if(reference.contextSpan){
          return undefined
        }
        // let start = reference.contextSpan?.start || 0
        let end  =  start + length
        const  node = this.findNodeByRange(sourceFile,start, end)
        if(node){
          referenceNodes.push(node)
        }
        return node
      } else {
        return undefined
      }
    })    
    referenceNodes = referenceNodes.filter(reference => {
      if(!reference){
        return false
      }
      if(noSelf){
        return !(pos >= reference.pos  && pos  <= reference.end)
      }
      return true
    })
    referenceNodes = unique(referenceNodes)
    return referenceNodes
  }
  getReferenceNodes(fileName:string,pos: number,noSelf:boolean = true){
    let references = this.getReferences(fileName,pos);
    let program = this.languageService.getProgram()
    let referenceNodes:ts.Node[] = []
    references?.forEach(reference => {

      let sourceFile = program?.getSourceFile(reference.fileName)
      if (sourceFile) {
        let start = reference.textSpan.start
        let length = reference.textSpan.length
        if(!reference.contextSpan){
          return undefined
          // start =  reference.contextSpan?.start || 0 
          // length = reference.contextSpan?.length || 0
        }
        // let start = reference.contextSpan?.start || 0
        let end  =  start + length
        const  node = this.findNodeByRange(sourceFile,start, end)
        if(node){
          referenceNodes.push(node)
        }
        return node
      } else {
        return undefined
      }
    })


    
    referenceNodes = referenceNodes.filter(reference => {
      if(!reference){
        return false
      }
      if(noSelf){
        return !(pos >= reference.pos  && pos  <= reference.end)
      }
      return true
    })
    referenceNodes = unique(referenceNodes)
    return referenceNodes
  }
  getDefinition(fileName,pos:number){
    return  this.languageService.getDefinitionAtPosition(fileName,pos) || []
  }
  getDefinitionNodes(fileName:string,pos:number){
    let definitions = this.getDefinition(fileName,pos)
    let program = this.languageService.getProgram()
    let nodes = definitions.map(definition =>{
      let sourceFile = program?.getSourceFile(definition.fileName)
      if (sourceFile) {
        if(!definition.contextSpan){
          return undefined
        }
        let start = definition.contextSpan?.start || definition.textSpan.start || 0
        let length = (definition.contextSpan?.length  || definition.textSpan.length|| 0 )
        let end  = start + length
        return this.findNodeByRange(sourceFile,start, end)
      } else {
        return undefined
      }
    })
    return omitUndefined(nodes)
  }
  getDefinitionNodesByNode = (node:ts.Node)=>{
    let sourceFile = node.getSourceFile();
    return omitUndefined(this.getDefinitionNodes(sourceFile.fileName,node.getStart()))
  }
  getDefinitionLastNodeByIdentiferNode = (node:ts.Node)=>{
    return  this.getDefinitionNodesByNode(node)[0]
  }
  isCustomJsxElement(nodes: readonly ts.DefinitionInfo[]){
    // return node && node.containerName != 'JSX.IntrinsicElements'
    // return !node || !['StyledComponentBase','JSX.IntrinsicElements','IntrinsicElements'].includes(node.containerName)
    return !nodes.length || !!nodes.find(node=>{
      return !['JSX.IntrinsicElements','IntrinsicElements'].includes(node.containerName)
    })
  }
  isFunctionComponent = (node):boolean=>{
    return node && ![containerNames.JsxIntrinsicElements,containerNames.StyledComponentBase].includes(node.containerName)
  }
  isIntrinsicElement = (defineNode:ts.DefinitionInfo):boolean=>{
    return defineNode.containerName === containerNames.JsxIntrinsicElements
  }
  isStyledComponentElement = (defineNode:ts.DefinitionInfo):boolean=>{
    return defineNode.containerName === containerNames.StyledComponentBase
  }
  getStyledTemplateScss = (node:ts.Node):{sassText:string,TaggedTemplateNode:ts.TaggedTemplateExpression,template: ts.TemplateLiteral}|undefined=>{
    let ts = this.typescript
    if(node.kind == ts.SyntaxKind.FirstStatement){
      let _node = node as ts.VariableStatement
      let { declarationList } = _node
      let { declarations } = declarationList
      let scssText:string = ''
      let TaggedTemplateNode
      let template
      declarations.forEach(declaration=>{
        if(declaration.initializer && declaration.initializer.kind == ts.SyntaxKind.TaggedTemplateExpression){
          let node = declaration.initializer  as ts.TaggedTemplateExpression
          template = node.template
          scssText = node.template.getText();
          scssText = scssText.slice(1,-1)
          TaggedTemplateNode = declaration.initializer
        }
      })
      return {
        sassText: scssText,
        TaggedTemplateNode,
        template: template,
      }
    }
  }
  getDefinitionOfDeclartions(node:ts.Node){
    let definions = this.getDefinition(node?.getSourceFile().fileName, node?.getStart()) || []
    return definions.filter(definion => definion.isAmbient)
  }
  getDefinitionNode(node: ts.Node): ts.Node|undefined{
    let definions = this.getDefinition(node.getSourceFile().fileName, node.getStart()) || [];
    definions = definions.filter(definion => !definion.isAmbient);
    let definion = definions[0]
    if(!definion){
      return 
    }
    let sourceFile = this.languageService.getProgram()?.getSourceFile(definion.fileName);
    // parameter not contextSpan
    // if(!definion.contextSpan){
    //   return undefined
    // }
    let start = definion.contextSpan?.start || definion.textSpan.start|| 0
    let end = start + (definion.contextSpan?.length ||  definion.textSpan.length|| 0)

    return sourceFile && this.findNodeByRange(sourceFile,start,end)
  }
  getJsxOpeningElementDefineNode = (openingElement: ts.JsxOpeningElement | ts.JsxSelfClosingElement):ts.Node => {
    let ts = this.typescript
    let { tagName } = openingElement
    let tsHelp = this
    let node = tagName
    // let defineNode = this.getDefinitionNodes(expression.getSourceFile().fileName, expression.getStart())[0];
    if(ts.isIdentifier(tagName)){
      return  this.getDefinitionNode(tagName) as ts.Node
      // return  ts.last(tsHelp.getReferenceNodes(node.getSourceFile().fileName, node.getStart()));
    }
    return getOpentingElementIdentifer(tagName) as ts.Node
    function getPropertyAccessExpression(node: ts.PropertyAccessExpression) {
      let { expression, name } = node
      if (expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
        return getOpentingElementIdentifer(expression);
      }
      let resNode = getOpentingElementIdentifer(expression);
      if (resNode && resNode.kind == ts.SyntaxKind.ObjectLiteralExpression) {
        let { properties } = (resNode as ts.ObjectLiteralExpression)
        return properties.find(property => {
          return property.name?.getText() == name.getText()
        })
      }
    }
    function getIdentifer(node: ts.Identifier) {
      let defineNode = ts.last(tsHelp.getDefinitionNodes(node.getSourceFile().fileName, node.getStart()));
      return getOpentingElementIdentifer(defineNode)
    }
    function getOpentingElementIdentifer(node): ts.Node | undefined {

      switch (node?.kind) {
        case ts.SyntaxKind.VariableStatement:
        case ts.SyntaxKind.FirstStatement:
          return getOpentingElementIdentifer(ts.last((node as ts.VariableStatement).declarationList.declarations));
        case ts.SyntaxKind.VariableDeclaration:
          return getOpentingElementIdentifer(node.initializer)
        case ts.SyntaxKind.Identifier:
          return getIdentifer(node)
        case ts.SyntaxKind.PropertyAccessExpression:
          return getPropertyAccessExpression(node as ts.PropertyAccessExpression)
        // case ts.SyntaxKind.ObjectLiteralExpression:
        //   return getPropertyAccessExpression(node as ts.ObjectLiteralExpression)
        default:
          return node
      }
    }
  }
  getTag = (node: ts.Node)=>{
    let ts = this.typescript
    switch(node.kind){
      case ts.SyntaxKind.TaggedTemplateExpression: 
        return getTagName(node as ts.TaggedTemplateExpression,['styled'])
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        return getTaggedLiteralName(this.typescript, node as ts.NoSubstitutionTemplateLiteral,['styled'])
      case ts.SyntaxKind.TemplateHead:
        if(node.parent && node.parent.parent){
          return this.getTag(node.parent.parent)
        }
      case ts.SyntaxKind.TemplateExpression:
        return this.getTag(node.parent);
      case ts.SyntaxKind.TemplateMiddle:
      case ts.SyntaxKind.TemplateTail:
        if(node.parent && node.parent.parent){
          return this.getTag(node.parent.parent.parent)
        }
    }
  }
  getTagVariableDeclarationNode = (node: ts.Node | undefined) => {

    let ts = this.typescript
    if (!node) {
      return
    }
  
    switch(node.kind){
      case ts.SyntaxKind.TaggedTemplateExpression: 
      case ts.SyntaxKind.TemplateExpression: 
        return this.getTagVariableDeclarationNode(node.parent)
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        return this.getTagVariableDeclarationNode(node.parent as ts.TaggedTemplateExpression)
      case ts.SyntaxKind.TemplateHead:
        if(node.parent && node.parent.parent){
          return this.getTagVariableDeclarationNode(node.parent.parent)
        }
      case ts.SyntaxKind.TemplateMiddle:
      case ts.SyntaxKind.TemplateTail:
        if(node.parent && node.parent.parent){
          return this.getTagVariableDeclarationNode(node.parent.parent.parent)
        }
      case ts.SyntaxKind.VariableDeclaration:
        return node
    }
    return undefined
  }
  getTemplateNode = (sourceFile: ts.SourceFile,position:number)=>{
    let node = this.findNode(sourceFile,position)
    let ts = this.typescript
    const getTemplateNode = (node:ts.Node)=>{
      switch(node.kind){
        case ts.SyntaxKind.TemplateHead:
          return node.parent;
        case ts.SyntaxKind.LastTemplateToken:
          return getTemplateNode(node.parent);
        case ts.SyntaxKind.TemplateSpan:
          return getTemplateNode(node.parent)
      }
      return node
    }
    return getTemplateNode(node!)
  }


  getPropertyAccessExpressionObjectLiteral(node:ts.PropertyAccessExpression){
    let ts = this.typescript
    const tsHelp = this
    const { SyntaxKind } = ts
    const { expression, name} = node
    let currentExpress = expression
    let currentName = name
    let currentNode: ts.Node|undefined
    const names:ts.MemberName[] = []


    if(expression.kind == SyntaxKind.PropertyAccessExpression){
      return this.getPropertyAccessExpressionObjectLiteral(expression as  ts.PropertyAccessExpression)
    }else{
      return getPropertyAccessExpressionObjectLiteral(node)
    }
    function getPropertyAccessExpressionObjectLiteral(node: ts.PropertyAccessExpression){
      const { expression, name} = node
      // let objectLiteral = getObjectLiteral(expression as ts.Identifier);
      // const { properties } = objectLiteral
      // let value = properties.find(property=>{
      //   return property.name?.getText() == name.getText()
      // })
      return getObjectValueByName(expression as ts.Identifier,name)
    }
    function getObjectLiteral(identifierNode: ts.Identifier):ts.ObjectLiteralExpression{
      // let nodeObjectLiteral = getObject(node);
      let saveNode:ts.Node  = identifierNode;
      let currentNode:ts.Node = identifierNode
      while(currentNode && currentNode != saveNode && !ts.isObjectLiteralExpression(currentNode)){
        saveNode = currentNode
        currentNode = getObject(currentNode)
      }
      return currentNode as ts.ObjectLiteralExpression
    }
    function getObjectValueByName(identifierNode: ts.Identifier,name: ts.Node){
      let objectLiteral = getObjectLiteral(identifierNode);
      const { properties } = objectLiteral
      let value = properties.find(property=>{
        return property.name?.getText() == name.getText()
      })
      return value as ts.Node
    }
    function  getObject(node):ts.Node{
      switch (node?.kind) {
        case SyntaxKind.Identifier:
          return getIdentifier(node);
        case SyntaxKind.VariableDeclaration:
          return getVariableDeclaration(node);
        case SyntaxKind.VariableStatement:
          return node
        default:
          return node
      }
    }
    function getIdentifier(node:ts.Node){
      let name = node.getText()
      let defNode = tsHelp.getDefinitionNode(node) as ts.Node;
      if(ts.isVariableDeclaration(defNode)){
        const { name,initializer } = defNode
        if(ts.isBindingName(name)){
          return getObjectValueByName(initializer as ts.Identifier,name)
        }
      }
      return defNode as ts.Node
    }

    function getVariableDeclaration(node: ts.VariableDeclaration){
      const { initializer, name } = node
      if(ts.isIdentifier(name)){
        return  getObject(initializer)
      }
      if(ts.isBindingName(name)){
        let { elements } = name
        let nodeLiteral = getObject(initializer);
        if(!nodeLiteral){
          // return
        }
        if(ts.isObjectLiteralExpression(nodeLiteral)){

        }
        
      }
      return node
    }

    



  }
}

