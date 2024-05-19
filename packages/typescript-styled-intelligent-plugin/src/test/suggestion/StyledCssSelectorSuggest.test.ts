

import TsHelp from '../../service/tsHelp';
import CssSelectorParser from '../../parser/cssSelectorParser';
import { languageService } from '../utils/createTsLanguageService';
import * as ts from 'typescript/lib/tsserverlibrary'
import 'mocha'
import { DefinitionConfig, getPath, verifyDefinitions } from '../utils/utils';
import assert from 'assert';







let tsHelp = new TsHelp(ts, languageService);
let cssSelectorParser = new CssSelectorParser(ts, languageService, tsHelp)
let program = languageService.getProgram()
describe('StyledCssSelectorSuggest base', () => {


  let filePath = getPath('example/base.tsx')
  let file = program?.getSourceFile(filePath);
  let text = file?.getFullText();
  it(`should css className index equal`, () => {
    let pos = new DefinitionConfig(`index`, `className='`, text,).getStart()
    let result = cssSelectorParser.getStyledTemplateSelectorByDomSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`.index`, ``, text,`{`),
    ]
    verifyDefinitions(result,definitionConfigs)
  })

  it('should css className user equal', () => {
    let pos =  new DefinitionConfig(`user`, `className='`, text,` user2'`).getStart()
    let result = cssSelectorParser.getStyledTemplateSelectorByDomSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`.user`, ``, text,`,.user2{`),
      new DefinitionConfig(`.user`, ``, text,`{/*testuser1*/`),
      new DefinitionConfig(`.user`, ``,text,`.user2{`),
      new DefinitionConfig(`.user`, ``,text,`+.name{`),
      new DefinitionConfig(`.user`, ``,text,`{/*testuser2*/`),
      // new DefinitionConfig(`.user'`, ``,text,`.user2{`),
    ]
   verifyDefinitions(result,definitionConfigs)
  })

  it('show className  user2 slibling equal', () => {

    let pos =  new DefinitionConfig(`user2`, `className='user `, text,`'>`).getStart()
    let result = cssSelectorParser.getStyledTemplateSelectorByDomSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`.user2`, `.user,`, text,`{`),
      new DefinitionConfig(`.user2`, `&`, text,`,.testUser2{`),
      new DefinitionConfig(`.user2`, `.user`, text,`{`),
    ]
    verifyDefinitions(result,definitionConfigs)
  })
  it('show  css className user2 equal', () => {

    let pos =  new DefinitionConfig(`user2`, `className='`, text,`'`).getStart()
    let result = cssSelectorParser.getStyledTemplateSelectorByDomSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`.user2`, `div `, text,`{`),
      new DefinitionConfig(`.user2`, `.user,`, text,`{`),
    ]
    verifyDefinitions(result,definitionConfigs)
  })
  it(`test css  + select`, () => {
    let pos = new DefinitionConfig(`name`, `className=' `, text,` testSiblingSelector`).getStart()
    let result = cssSelectorParser.getStyledTemplateSelectorByDomSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`.name`, `.user+`, text,`{`),
      new DefinitionConfig(`.name`, `&+`, text,`{`),
    ]
    verifyDefinitions(result, definitionConfigs)
  })

})



describe(`css cross file`,()=>{

  let filePath = getPath('example/crossComponent.tsx')
  let fileOtherPath = getPath('example/crossFile.tsx')
  let file = program?.getSourceFile(filePath);
  let fileOther = program?.getSourceFile(fileOtherPath);
  let text = file?.getFullText();
  let textOther = fileOther?.getFullText()
  it(`show cross file selector`, () => {
    let pos = new DefinitionConfig(`user-name`, `className="`, textOther).getStart()
    let result = cssSelectorParser.getStyledTemplateSelectorByDomSelector(fileOtherPath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`.user-name`, ``, text,`{/*test-username*/`),
    ]
    verifyDefinitions(result, definitionConfigs)
  })
})