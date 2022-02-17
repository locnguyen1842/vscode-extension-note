// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	console.log('Congratulations, your extension "sample" is now active!');
	
	const storage = context.workspaceState

	let clearStorage = vscode.commands.registerCommand('sample.clearStorage', function () {
		const editor = vscode.window.activeTextEditor;

		storage.keys().forEach((key) => {
			storage.update(key, undefined)
		})

		editor.setDecorations(noteDecorationType, []);
	});

	let disposable = vscode.commands.registerCommand('sample.noteSelection', function () {
		const editor = vscode.window.activeTextEditor;
		const editorFileName = editor.document.fileName

		if (editor) {
			const selection = editor.selection;
			let fileLines = storage.get(editorFileName, {})

			if(! selection.isSingleLine) {
				return
			}

			const selectionStorageKey = `${selection.start.line}:${selection.start.character}|${selection.end.character}`

			fileLines[selectionStorageKey] = (new Date()).toISOString()

			storage.update(editorFileName, fileLines)
		}

		triggerHighlightNotedLines()
		// Display a message box to the user
		vscode.window.showInformationMessage('Text stored');
	});

	let isObject = function(obj) {
		return obj !== undefined && obj !== null && obj.constructor == Object && ! Array.isArray(obj);
	}

	let parseNotedLineKey = function(notedLineKey) {
		let notedLineSplitted = notedLineKey.split(':')
		let notedLineCharSplitted = notedLineSplitted[1]?.split('|')

		return {
			line: parseInt(notedLineSplitted[0]),
			start: parseInt(notedLineCharSplitted[0]),
			end: parseInt(notedLineCharSplitted[1]),
		}
	}

	const noteDecorationType = vscode.window.createTextEditorDecorationType({
		borderWidth: '1px',
		borderStyle: 'solid',
		overviewRulerColor: 'blue',
		overviewRulerLane: vscode.OverviewRulerLane.Right,
		light: {
			// this color will be used in light color themes
			borderColor: 'darkblue'
		},
		dark: {
			// this color will be used in dark color themes
			borderColor: 'lightblue'
		}
	})

	const triggerHighlightNotedLines = function() {
		const editor = vscode.window.activeTextEditor
		const editorFileName = editor.document.fileName

		let fileNotedLines = storage.get(editorFileName)

		const fileNotedDecorations = []

		if(isObject(fileNotedLines) && Object.keys(fileNotedLines).length) {
			for (const [key, value] of Object.entries(fileNotedLines)) {
				let {line, start, end} = parseNotedLineKey(key)

				const startPos = new vscode.Position(line, start)
				const endPos = new vscode.Position(line, end)

				const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: value};

				fileNotedDecorations.push(decoration)
			}

			editor.setDecorations(noteDecorationType, fileNotedDecorations);
		}
	}

	triggerHighlightNotedLines()

	context.subscriptions.push(
		disposable,
		clearStorage
	);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
