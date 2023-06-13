// The module 'vscode' contains the VS Code extensibility API
// Import the module and {reference} it with the alias vscode in your code below
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	let output = vscode.window.createOutputChannel("View Tc Log");
	output.appendLine('Congratulations, your extension "view-tc-log-message" is now active!');
	let locale: string = "";
	var setLocale = function () {
		locale = vscode.workspace.getConfiguration().get('conf.viewTcLogMessage.locale', "");
		if (locale === "") {
			locale = vscode.env.language;
		}
		output.appendLine('locale: ' + locale);
	};
	setLocale();

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => setLocale()));

	var searchMessageFromProperty = vscode.languages.registerHoverProvider({ pattern: '**/*.properties' }, 
	{
		provideHover(document, position, token) {
			const projectPath = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(document.fileName))?.uri.fsPath;
			const projectPathLength = (projectPath !== undefined) ? projectPath.length : 0;
			output.appendLine('Get key from property file...');
			output.appendLine('Workspace: '+projectPath);
			const range = document.getWordRangeAtPosition(position, /([a-zA-Z0-9]+\.)+[a-zA-Z0-9]+(?=\=)/);
			output.appendLine('Line: '+position.line);

			if (typeof range !== 'undefined') {
				const key: string = document.getText(range).slice(0, -1);
				output.appendLine('key: ' + key);
				return new Promise((resolve) => {
					const baseName = path.dirname(document.fileName) + path.sep;
					vscode.workspace.fs.readDirectory(vscode.Uri.file(baseName)).then((res) => {
						res.filter((value) => value[0].endsWith('.java')).map((value) => {
							const fileName = baseName + value[0];
							fs.readFileSync(fileName).toString().split('\n').forEach((line, lineno) => {
								if (line.includes(key)) {
									output.appendLine('filename:' + fileName + ',' + lineno + ':' + line);
									
									let message: vscode.MarkdownString = new vscode.MarkdownString();
									message.isTrusted = true;
									message.supportHtml = true;
									message.appendMarkdown('### '+fileName.slice(projectPathLength+6,-1)+':'+(lineno+1));
									message.appendMarkdown('\n');
									message.appendMarkdown('```java\n');
									message.appendMarkdown(line.trimStart()+"\n");
									message.appendMarkdown('```\n');
									const peekCommandUri = vscode.Uri.parse(
										`command:tc.message.peek.source.location?${encodeURIComponent(JSON.stringify({
											propertiesFileName: document.fileName,
											propertiesPosition: position.line,
											sourceFileName: fileName,
											sourcePosition: lineno,
											sourceLineLength: line.length
										}))}`
									);				
									message.appendMarkdown(`[Peek...](${peekCommandUri})`);
									resolve(new vscode.Hover(message));
								}
							});
						});
					});	
				});
			}
		}
	});
	context.subscriptions.push(searchMessageFromProperty);

	var searchMessageFromSource = vscode.languages.registerHoverProvider('java', {
		provideHover(document, position, token) {
			const projectPath = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(document.fileName))?.uri.fsPath;
			const range = document.getWordRangeAtPosition(position, /\"([a-zA-Z0-9]+\.)+[a-zA-Z0-9]+\"/);

			if (typeof range !== 'undefined') {
				return new Promise((resolve) => {
					const baseName = path.dirname(document.fileName) + path.sep + 'LocalStrings';
					const extName = '.properties';
					const key: string = document.getText(range).slice(1, -1) + "=";
					output.appendLine('key: ' + key);
					let message: vscode.MarkdownString = new vscode.MarkdownString();
					message.isTrusted = true;
					message.supportHtml = true;
					let targetFiles: string[] = [baseName + extName, baseName + '_' + locale + extName];
					if (baseName.includes('modules')) {
						let projectPath = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(document.fileName))?.uri.fsPath + path.sep + "java" + path.sep;
						for(var idx = 0; idx < document.lineCount; idx++) {
							let line = document.lineAt(idx).text;
							if(line.startsWith('package')) {
								const regex = /package (?<package>.+);/;
								const match = regex.exec(line);
								const additionalPath = projectPath+match?.groups?.package.replace(/\./g, path.sep)+path.sep;
								targetFiles.push(additionalPath+'LocalStrings'+extName);
								targetFiles.push(additionalPath+'LocalStrings_'+locale+extName);
							}
						}
					}
					output.appendLine(targetFiles.toString());
					targetFiles.map(fileName => {
							output.appendLine('Target file: '+fileName);
							try {
								const msgs = fs.readFileSync(fileName).toString().split('\n');
								const idx = msgs.findIndex((line) => line.startsWith(key));
								let msg = "";
								output.appendLine("Check start. index: "+idx);
								let checkEOM = (i: number) => {
									if(i < msgs.length) {
										const addLine: string = msgs[i].trimEnd();
										msg = msg + addLine;
										output.appendLine("EOL: " + addLine.slice(-1));
										if(addLine.slice(-1) === "\\") {
											checkEOM(i+1);
										}
									}
								};
								if (idx > 0) { checkEOM(idx); }
								output.appendLine("Check ended. Message: "+msg);
								message.appendMarkdown(msg.slice(key.length));
								message.appendMarkdown('<br>');
							} catch(ex){}
						}
					);

					const peekCommandUri = vscode.Uri.parse(
						`command:tc.message.peek.properties.location?${encodeURIComponent(JSON.stringify({
							fileName: document.fileName,
							key: key,
							position: position.line,
						}))}`
					);
					message.appendMarkdown('<hr>');
					message.appendMarkdown(`[Peek...](${peekCommandUri})`);
					message.appendMarkdown('<br>');

					const searchCommandUri = vscode.Uri.parse(
						`command:tc.message.search.message?${encodeURIComponent(JSON.stringify({
							key: key,
						}))}`
					);
					message.appendMarkdown(`[Search...](${searchCommandUri})`);

					resolve(new vscode.Hover(message));
				});
			}
		}
	});
	context.subscriptions.push(searchMessageFromSource);

	context.subscriptions.push(vscode.commands.registerCommand('tc.message.peek.source.location', (args) => {
		output.appendLine('Peek source file');
		output.appendLine('properties file: '+args.propertiesFileName);
		output.appendLine('propertise pos: '+args.propertiesPosition);
		output.appendLine('source file: '+args.sourceFileName);
		output.appendLine('source pos: '+args.sourcePosition);
		
		const originalUri: vscode.Uri = vscode.Uri.file(args.propertiesFileName);
		const originalPos: vscode.Position = new vscode.Position(args.propertiesPosition,0);

		let locs: vscode.Location[] = [
			new vscode.Location(
				vscode.Uri.file(args.sourceFileName),
				new vscode.Range(
					new vscode.Position(args.sourcePosition, 0),
					new vscode.Position(args.sourcePosition, args.sourceLineLength-1)
				)
			)			
		];
		vscode.commands.executeCommand('editor.action.peekLocations', originalUri, originalPos, locs, 'peek');

	}));

	context.subscriptions.push(vscode.commands.registerCommand('tc.message.peek.properties.location', (args) => {
		const originalUri: vscode.Uri = vscode.Uri.file(args.fileName);
		const originalPos: vscode.Position = new vscode.Position(args.position, 0);

		let locs: vscode.Location[] = [];
		vscode.workspace.fs.readDirectory(vscode.Uri.file(path.dirname(args.fileName))).then((res) => {
			res.filter((value) => value[0].startsWith('LocalStrings')).map((value) => {
				let fileName = path.dirname(args.fileName) + path.sep + value[0];
				fs.readFileSync(fileName).toString().split('\n').forEach((line, lineno) => {
					if (line.startsWith(args.key)) {
						locs.push(new vscode.Location(
							vscode.Uri.file(fileName),
							new vscode.Range(
								new vscode.Position(lineno, args.key.length),
								new vscode.Position(lineno, line.length)
							)
						));
						return;
					}
				});
			});
			vscode.commands.executeCommand('editor.action.peekLocations', originalUri, originalPos, locs, 'peek');
		});

	}));

	context.subscriptions.push(vscode.commands.registerCommand('tc.message.search.message', (args) =>
		vscode.commands.executeCommand('workbench.action.findInFiles', {
			query: args.key,
			triggerSearch: true,
			matchWholeWord: true,
			isCaseSensitive: true,
			filesToInclude: 'LocalStrings*.properties',
		})
	));
}

// this method is called when your extension is deactivated
export function deactivate() { }
