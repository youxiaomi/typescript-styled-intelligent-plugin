

import styled  from "styled-components";
import React from 'react'

export const PageView = styled.div`
  &.page{
    .user-name{

    }
  }
`

const User = ()=>{

  return <div className="user-name"></div>
}



const Page = ()=>{

  return <PageView className="page">
    <User></User>
  </PageView>
}