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
	let locale:string = "";
	var setLocale = function() {
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
			let locale = vscode.workspace.getConfiguration().get('conf.viewTcLogMessage.locale');
			if (locale === "") {
				locale = vscode.env.language;
			}

			if (typeof range !== 'undefined') {
				return new Promise((resolve) => {
					const baseName = path.dirname(document.fileName) + path.sep + 'LocalStrings';
					const extName = '.properties';
					const key: string = document.getText(range).slice(1, -1);
					let message: vscode.MarkdownString[] = [];

					[baseName + extName, baseName + '_' + locale + extName].map((propertyFile, idx) => {
						try {
							fs.readFileSync(propertyFile).toString().split('\n').forEach((line, lineno) => {
								if (line.startsWith(key)) {
									const args = [{ uri: propertyFile, position: lineno, offset: key.length+1, length: line.length }];

									const stageCommandUri = vscode.Uri.parse(
										`command:estudio.internal.open?${encodeURIComponent(JSON.stringify(args))}`
									);
									message[idx] = new vscode.MarkdownString(`[${line.slice(key.length + 1)}](${stageCommandUri})`);
									message[idx].isTrusted = true;
								}
							});
						} catch (err) { }
					});

					resolve(new vscode.Hover(message));
				});
			}
		}
	});

	context.subscriptions.push(vscode.commands.registerCommand('estudio.internal.open', (args) => {
		const start = new vscode.Position(args.position, args.offset);
		const end = new vscode.Position(args.position, args.length);
		const range = new vscode.Range(start, end);
		const file = vscode.Uri.file(args.uri);

		const opts: vscode.TextDocumentShowOptions = {
			selection: range,
			viewColumn: vscode.ViewColumn.Active
		};

		vscode.window.showTextDocument(file, opts);
	}));

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
