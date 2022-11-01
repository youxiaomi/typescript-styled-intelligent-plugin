

import { describe ,suite} from "mocha"
import * as assert from "assert"
import { getScssService } from "../service/scssService"



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
  .shop,.shop .shop2{
    .name .name2{
      .member{
        
      }
    }
  }
`

const testText9 = `
  .member{

  }
`
const testText3 = `
  .shop .name{
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

let styleSheet = scssService.getScssStyleSheet(testText)
let styleSheet2 = scssService.getScssStyleSheet(testText3)

let nodes= scssService.getClassNameNode(styleSheet);

let node = nodes.children[0].children[1].children[0]
console.log(node);

scssService.findSelectorTreeBySelector(styleSheet,styleSheet2)
