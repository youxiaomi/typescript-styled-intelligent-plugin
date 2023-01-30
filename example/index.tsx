
import React from 'react'
import styled from 'styled-components'


var bb = 123
const getAge = ()=>{
  let   aa = 'a123'
  let bb = aa ? 'user1' : 'b123'
  return a ? aa :      bb      
}
var User = styled.div`
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
  .user2{

  }
`

var roots = {
  aaa:'aaa',
}


var Member = styled.div`
 
  .user,.bbbb,.bbb div.member{
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
  }
`

var a = true

var ShowMemeber = (props:any)=>{



  return <div>
    <Member id='testid' className={`bbbb member ${u} aaaa`}>
      <div className={`member-age ${getAge()}`}></div>
    </Member>
  </div>
}

var u:string = 'user1'
var getAA = ()=>{
  return 'user8'
}
const AA = () => {

  return <div>
    <User className={`user2 ${u} user9 ${getAA()}`}>
    
      <div  className='user'>
        
      </div>
      <div  className=' user2 user user3 user2 '>
        <div className={ 'user2' }></div>
        <div className={'   user1     user3 '}>
          <div id='user5'></div>
        </div>
        tom
      </div>
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