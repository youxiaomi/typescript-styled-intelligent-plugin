
import React, { PropsWithChildren } from 'react'
import styled from 'styled-components'



var bb = 123
const getAge = ()=>{
  let   aa = 'a123'
  let bb = aa ? 'user1' : 'b123'
  return a ? aa :      bb      
}



var User2  = styled.div`



`
var elements = [
  <div className='user'>123</div>,
  // <div className='user'>123</div>,
  <div className='user user22'>123</div>,
]
var User4 = (props:any)=>{
  return <div>
     { props.children }
     { props.content }
     { elements }
  </div>
}
// var elements = [
//   <div className='user'>123</div>,
//   // <div className='user'>123</div>,
//   <div className='user user22'>123</div>,
// ]
var testObjs = {
  elements:{
    elements: elements
  },
  bbb:123
}
class TestClass {
  user = 'user'
}
let Test = new TestClass()
class UserClass extends React.Component<any>{
  renderUser(){

    return <div className='render-user'>
      { this.props.children }
    </div>
  }
  renderEle(ele:any){
    return <div>{ ele }</div>
  }
  render(){
    var _this = this
    var props = _this.props
    var elements = testObjs.elements
    let {elements:ele,bbb} = testObjs
    return <div className='user-class'>
      {/* {  this.renderUser() } */}
      { _this.props.children }
      { this.props.ele}
      { this.renderEle(this.props.ele)}
      {  this.renderEle(ele.elements) }
    </div>
  }

}




var User3666 = (props:any)=>{

  return <User2 className='user3-wrap'>
    {/* <div>{ props.children }</div>
    <div className='user333' >{ Test.user }</div> */}
    {/* <UserClass ele={elements} ></UserClass> */}
    <UserClass>
      <div>{ props.children }</div>
    </UserClass>
    {/* <User4 content={<UserClass/>}>
      { props.children }
    </User4> */}
    {/* <User4 ele={ props.children }></User4> */}
    {/* <User5></User5> */}
  </User2>
}
var User9999s = styled.div`
  .user{}
`
var User9999 = ()=>{
  return <User9999s>
    <User3666 name='user3666'> <div className='user6666-inner'></div> </User3666>
  </User9999s>

}


// var User = styled.div`
var User = styled(User2)`
  .b123{
    .user666{}
  }

  .user{
    .user1{

    }
  }
  .user{
    &.user2.user3{

    }
    .user1{
      #user5{
        
      }
    }
  }
  .user22,.user3{
    .age{
      .age2{

      }
      .age2{

      }
    }
  }
`
var User5 = ()=>{
  return <User>
    {/* <User3>
      <div className='user3-inner'></div>
    </User3> */}
  </User>
}


var roots = {
  aaa:'aaa',
}


var Member = styled.div`
 
  /* .user,.bbbb,.bbb div.member{
    color: blue;
    .user1{
      width:120px
    }
  }
  .user,.user1{
    color:red;

    width: ${p=>p ? '100px':'110px'};
    height: ${p=>p ? '100':'110'}px;
  }
  .b123{
    color:red;
  }
  .member{
    height: 120px;
  } */
`

var a = true

var ShowMemeber:React.FC<React.PropsWithChildren> = (props)=>{

  return <div>
    <Member id='testid' className={`bbbb member ${u} aaaa`}>
      <div className={`b123`}></div>
      { props.children }
      {/* <div className={`b123 ${getAge()} member`}></div> */}
    </Member>
  </div>
}

var u:string = 'user1'
var getAA = ()=>{
  return u == 'u' ?  'user' : 'user3'
}
var aa = ['a']

function renderElement(ele:any){
  return elements

  // return renderElement2()
  function renderAge(){
    return ele
  }
  // return renderAge()
}
function renderElement2(){
  return <div className='user'>123</div>
}
var ele = <div className='user'>1111</div>

const User22 = styled.div`
  .user22{

  }
`

const AA = () => {
  function renderUser5(){
    return <div id='user5'></div>
  }
  return <div>
    <User className={`user2 ${u} user9`}>
      <ShowMemeber>
        <div className='user666'></div>
      </ShowMemeber>
    <User22>
      { renderElement(ele) }
    </User22>  
      {/* { renderElement2() } */}
      { aa.map(a=>{
        return <div  className='user'></div>
      }) }
      { <div  className='user'></div> }
      <div  className='user'>
        <div className='user1'>
          <div id='user5'></div>
        </div>
      </div>
      <div className={`user22 user3 ${ u ? 'user' : 'user3' }  ${getAA()}`}></div>
      <div  className=' user22 user user3 user2 '>
        
        <div className={` user222   user3   `}>
          <div className='age'>
            <div className='age2'> </div>
          </div>
        </div>
        tom
      </div>
      <div id='user5'></div>
      {renderUser5()}
        {/* <ShowMemeber>

      </ShowMemeber>
      { ShowMemeber({}) } */}
      {/* <div id='testid' className='user'> */}
      {/* <div className='name'>tom</div>
      <div className='age'>age</div> */}
    </User>
    {/* <div>

    </div>
    <User className='user user2'>
      <div className='name name2'>tom</div>
      <div className='name'>tom</div>
      <div className='age'>age</div>
    </User> */}
  </div>
}