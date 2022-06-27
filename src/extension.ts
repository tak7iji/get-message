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
	console.log('Congratulations, your extension "view-tc-log-message" is now active!');
	let locale: string = "";
	var setLocale = function () {
		locale = vscode.workspace.getConfiguration().get('conf.viewTcLogMessage.locale', "");
		if (locale === "") {
			locale = vscode.env.language;
		}
	};
	setLocale();

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => setLocale()));

	var disposable = vscode.languages.registerHoverProvider('java', {
		provideHover(document, position, token) {
			const range = document.getWordRangeAtPosition(position, /\"([a-zA-Z]+\.)+[a-zA-Z]+\"/);

			if (typeof range !== 'undefined') {
				return new Promise((resolve) => {
					const baseName = path.dirname(document.fileName) + path.sep + 'LocalStrings';
					const extName = '.properties';
					const key: string = document.getText(range).slice(1, -1);
					let message: vscode.MarkdownString[] = [];

					[baseName+extName, baseName+'_'+locale+extName].map((fileName)=>{
						fs.readFileSync(fileName).toString().split('\n').forEach((line) => {
							if (line.startsWith(key)) {
								message.push(new vscode.MarkdownString(line.slice(key.length + 1)));
							}
						});
					});
					const args: any[] = [
						{
							fileName: document.fileName,
							key: key,
							position: position.line,
						}
					];

					const stageCommandUri = vscode.Uri.parse(
						`command:tc.message.file.open?${encodeURIComponent(JSON.stringify(args))}`
					);
					message[2] = new vscode.MarkdownString(`[Peek...](${stageCommandUri})`);
					message[2].isTrusted = true;

					resolve(new vscode.Hover(message));
				});
			}
		}
	});

	context.subscriptions.push(vscode.commands.registerCommand('tc.message.file.open', (args) => {
		const originalUri: vscode.Uri = vscode.Uri.file(args.fileName);
		const originalPos: vscode.Position = new vscode.Position(args.position, 0);

		let locs: vscode.Location[] = [];
		vscode.workspace.fs.readDirectory(vscode.Uri.file(path.dirname(args.fileName))).then((res) => {
			let res2 = res.map((value) => {
				if(value[0].startsWith('LocalStrings')){
					try {
						let fileName = path.dirname(args.fileName) + path.sep + value[0];
						fs.readFileSync(fileName).toString().split('\n').forEach((line, lineno) => {
							if (line.startsWith(args.key)) {
								locs.push(new vscode.Location(
									vscode.Uri.file(fileName),
									new vscode.Range(
										new vscode.Position(lineno, args.key.length+1),
										new vscode.Position(lineno, line.length)
									)
								));
							}
						});
					} catch (err) { }
				}				
			});
			vscode.commands.executeCommand('editor.action.peekLocations', originalUri, originalPos, locs, 'peek');
		});

	}));

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
