import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  CompletionList,
  Disposable,
  Definition
} from 'vscode-languageserver/node';
// import * as vscodeNode from 'vscode-languageserver/node'

// import { TextDocument } from 'vscode-languageserver-textdocument';
// let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);


let connection = createConnection(ProposedFeatures.all);


// connection.onInitialize((params)=>{
//   let result: InitializeResult = {
//     capabilities:{
//       textDocumentSync: TextDocumentSyncKind.Full,
//       completionProvider:{
//         resolveProvider: true,
//         allCommitCharacters:['.'],
//         triggerCharacters:['.'],
//       },
//       // hoverProvider:true,
//       definitionProvider:true,
//       typeDefinitionProvider:true,
//       // definitionProvider:true
//     }
//   }
  
//   return result

// })


connection.onInitialized(() => {
  console.log('iniited');
});

// documents.onDidClose(e => {
//   console.log(e);
  
// });

// documents.onDidChangeContent(change => {
  
// });

// connection.onDefinition(async (param)=>{
//   return undefined
// })

// documents.listen(connection)
connection.listen()