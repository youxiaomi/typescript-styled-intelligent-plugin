
import React, { PropsWithChildren } from 'react'
import styled from 'styled-components'


const IndexView = styled.div`
  .index{
    .user,.user2{

    }
    .user{
      &.user2,.testUser2{

      }
    }
    .user.user2{

    }
    .user+.name{

    }
    .user{
      &+.name{

      }
      .name{

      }
    }
  }
`

class IndexClass extends React.Component{
  render(){
    return <IndexView>
      <div className='index'>
        <div className='user user2'></div>
        <div className='user'>
          <div className='user2'>
            <div className='name'></div>
          </div>
        </div>
        <div className=' name testSiblingSelector'></div>
        <div className='test  user'>
          <div>
            <div className='name'></div>
          </div>
        </div>
      </div>
    </IndexView>
  }
}

const IndexArrowFunction  = ()=>{
  return <IndexView>

  </IndexView>
}

function IndexFunction (){

  return <IndexView>

  </IndexView>
}





export default ()=>{


  return <div>
    <IndexClass></IndexClass>
    <IndexArrowFunction></IndexArrowFunction>
    <IndexFunction></IndexFunction>
  </div>


}