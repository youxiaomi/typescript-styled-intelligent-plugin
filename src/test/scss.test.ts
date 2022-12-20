

import { describe ,suite} from "mocha"
import * as assert from "assert"
import { getScssService } from "../service/cssService"
import { extractStyleSheetSelectorWorkWrap } from "../parser/extractStyleSheet"
import { getSCSSLanguageService ,TextDocument,} from 'vscode-css-languageservice'
const scssLanguageService = getSCSSLanguageService()



// describe('Array', function () {
//   describe('#indexOf()', function () {
//     it('should return -1 when the value is not present', function () {
     
//     });
//   });
// });
const testText5 = `
  .shop .goods.goods-v2 .goods-v3.goods-v4,.shop  .name .name2,   #container{
    .goods.goods-v2,.name,   #container{
                
    }
    color:red;
    .member{
      width:100px;
      .age{
        color:red;
      }
      color:red;
    }
    .name{
      color:blue;
    }
    div{
      .age{
        color:blue;
      }
    }
  }
`
const testText = `
  .user{
      .age{

      }
  }
`
const test11 = `div,#testid,.member,.bbbb,.user1,.aaaa{.b123{}}`
const test12 = `
  .user,.user1,.b123{
    color:red;

    width: ${p=>p ? '100px':'110px'};
    color: blue;
  }
  .b123{
    color:red;
  }
`
const testText9 = `
  .user{
    .age{}
  }
  .age{

  }
`
const testText3 = `
  color:red;
  .shop.name{
    .name2{
      .member{

      }
    }
  }
  .user {

  }

`

const testText2 = `
  .shop .shop2{

    .name .name2 .member,.name .name2{

      .age{
        点这个下面生效
      }
    }
  }
  .shop .shop2,shop .shop2{
    .age{
      点这个上面不生效
    }
  }
  .name .name2{
    .member{

    }
  }
`

// var aa = <div class='shop'>
//   <div class='.age'></div>
// </div>

const scssService = getScssService();

let styleSheet = scssLanguageService.parseStylesheet(scssService.getDefaultCssTextDocument(test11))
let styleSheet2 = scssLanguageService.parseStylesheet(scssService.getDefaultCssTextDocument(test12))


// let nodes= scssService.getCssSelectorNode(styleSheet);

// let node = nodes.children[0].children[1].children[0]
// console.log(node);

scssService.findSelectorTreeBySelector(styleSheet,styleSheet2,true)


// extractStyleSheetSelectorWorkWrap(styleSheet as any,styleSheet.getText().indexOf('name1'))
