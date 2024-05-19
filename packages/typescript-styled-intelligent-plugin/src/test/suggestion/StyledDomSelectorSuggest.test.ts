// const chai = import('chai');
import TsHelp from '../../service/tsHelp';
import CssSelectorParser from '../../parser/cssSelectorParser';
import { languageService } from '../utils/createTsLanguageService';
import * as ts from 'typescript/lib/tsserverlibrary'
import 'mocha'
import assert from 'assert'
import path from 'path';
import { DefinitionConfig, getPath, verifyDefinitions } from '../utils/utils';




let tsHelp = new TsHelp(ts, languageService);
let cssSelectorParser = new CssSelectorParser(ts, languageService, tsHelp)
let program = languageService.getProgram()

describe('StyledDomSelectorSuggest base', () => {


  let filePath = getPath('example/base.tsx')
  let file = program?.getSourceFile(filePath);
  let text = file?.getFullText();



  it(`should className index equal`, () => {
    let pos = text?.search(`.index{`) || 0
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`index`, `className='`, text),
    ]
    verifyDefinitions(result,definitionConfigs)
  })

  it('should className user equal', () => {
    let pos = text?.search(`user,.user2`) || 0
   
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`user`, `className='`, text,` user2'`),
      new DefinitionConfig(`user`, `className='`, text,`'>`),
      new DefinitionConfig(`user'`, `className='test  `,text),
    ]
   verifyDefinitions(result,definitionConfigs)

  })

  it('show className user2 equal', () => {

    let pos = text?.search(`user2,.testUser2`) || 0
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`user2`, `className='user `, text),
    ]
    assert.equal(result?.definitions?.length, 1)
    verifyDefinitions(result,definitionConfigs)
  })

  it(`test dom + select`, () => {
    let pos = new DefinitionConfig(`name`, `&+.`, text).getStart()
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`name`, ``, text,` testSiblingSelector`),
    ]
    verifyDefinitions(result, definitionConfigs)
  })
  it(`test class method render`,()=>{
    let pos = new DefinitionConfig(`testMethod`, `#`, text).getStart()
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`testMethod`, `id='`, text,),
    ]
    verifyDefinitions(result, definitionConfigs)
  })
  it(`test class selector sibling`,()=>{
    
    let pos = new DefinitionConfig(`user2`, `.user.`, text).getStart()
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`user2`, `className='user `, text,),
    ]
    verifyDefinitions(result, definitionConfigs)
  })
  it(`test selector of parent element `,()=>{
    let pos = new DefinitionConfig(`user2`, `div .`, text,`{}`).getStart()
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`user2`, `className='`, text,`'>{/*user2 mark1*/}`),
    ]
    verifyDefinitions(result, definitionConfigs)
  })
})




describe(`dom cross file`,()=>{

  let filePath = getPath('example/crossComponent.tsx')
  let fileOtherPath = getPath('example/crossFile.tsx')
  let file = program?.getSourceFile(filePath);
  let fileOther = program?.getSourceFile(fileOtherPath);
  let text = file?.getFullText();
  let textOther = fileOther?.getFullText()
  it(`show cross file selector`, () => {
    let pos = new DefinitionConfig(`user-name`, `.`, text).getStart()
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`user-name`, `className="`, text),
      new DefinitionConfig(`user-name`, `className="`, textOther),
    ]
    verifyDefinitions(result, definitionConfigs)
  })
})