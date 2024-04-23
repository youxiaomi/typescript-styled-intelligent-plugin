

import styled  from "styled-components";
import React from 'react'
import { PageView } from "./crossComponent";


const User = ()=>{

  return <div className="user-name"></div>
}



const Page = ()=>{

  return <PageView className="page">
    <User></User>
  </PageView>
}