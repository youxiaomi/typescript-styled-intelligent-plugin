
# Typescript-styled-intelligent-plugin
### A styled-components plugins
[中文](./README-zh_CN.md)
### Description
typescript-styled-intelligent-plugin is an auxiliary tool that enhances the functionality of styled-components by implementing intelligent navigation use CSS selectors.


This repo has two projects:

- `packages/typescript-styled-intelligent-plugin` is a Typescript Plugin 
  - `packages/typescript-styled-intelligent-plugin/example` is a example use Typescript-styled-intelligent-plugin
- `packages/vscode-styled-intelligent-plugin` is a vscode Plugin (this is based on the typescript-styled-intelligent-plugin)
![](https://raw.githubusercontent.com/youxiaomi/typescript-styled-intelligent-plugin/main/documentation/example.png)
![](https://raw.githubusercontent.com/youxiaomi/typescript-styled-intelligent-plugin/main/documentation/preview.gif)


### Usage

#### With VSCode (recommend)
download the lastest vsix file from release pages. open vscode , press F1 and input ‘vsix’ in VScode,then select ‘install from vsix’。  
enjoy!   
see  packages/vscode-styled-intelligent-plugin

#### With TypeScript  
install  Typescript-styled-intelligent-plugin

```
npm install --save-dev git+https://github.com/youxiaomi/typescript-styled-intelligent-plugin.git
```

Then add a plugins section to your tsconfig.json or jsconfig.json
```
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typescript-styled-intelligent-plugin"
      }
    ]
  }
}
```

Finally, run the Select TypeScript version command in VS Code to switch to use the workspace version of TypeScript for VS Code's JavaScript and TypeScript language support

#### TODO
css selector autocomplete