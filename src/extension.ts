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

	var disposable = vscode.languages.registerHoverProvider('java', {
		provideHover(document, position, token) {
			const range = document.getWordRangeAtPosition(position, /\"([a-zA-Z]+\.)+[a-zA-Z]+\"/);

			if (typeof range !== 'undefined') {
				return new Promise((resolve) => {
					const baseName = path.dirname(document.fileName) + path.sep + 'LocalStrings';
					const extName = '.properties';
					const key: string = document.getText(range).slice(1, -1) + "=";
					output.appendLine('key: ' + key);
					let message: vscode.MarkdownString[] = [baseName + extName, baseName + '_' + locale + extName].map(fileName => {
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
							return new vscode.MarkdownString(msg.slice(key.length));
						}
					);

					const peekCommandUri = vscode.Uri.parse(
						`command:tc.message.peek.location?${encodeURIComponent(JSON.stringify({
							fileName: document.fileName,
							key: key,
							position: position.line,
						}))}`
					);
					let messageSize = message.length;
					message[messageSize] = new vscode.MarkdownString(`[Peek...](${peekCommandUri})`);
					message[messageSize].isTrusted = true;

					const searchCommandUri = vscode.Uri.parse(
						`command:tc.message.search.message?${encodeURIComponent(JSON.stringify({
							key: key,
						}))}`
					);
					message[messageSize + 1] = new vscode.MarkdownString(`[Search...](${searchCommandUri})`);
					message[messageSize + 1].isTrusted = true;

					resolve(new vscode.Hover(message));
				});
			}
		}
	});

	context.subscriptions.push(vscode.commands.registerCommand('tc.message.peek.location', (args) => {
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

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
