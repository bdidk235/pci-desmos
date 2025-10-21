async function loadJson(path) {
	const res = await fetch(path);
	if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
	return res.text();
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function main() {
	try {
		// Get State JSON
		const stateText = await loadJson("./state.json");
		const initialState = JSON.parse(stateText.replaceAll("\\\\", "\\"));

		// Put state into "calculator"
		const element = document.querySelector("#calculator");
		const calculator = Desmos.GraphingCalculator(element, { lockViewport: true, expressionsCollapsed: true, settingsMenu: false, zoomButtons: false, actions: true });
		window.Calc = calculator;
		calculator.setState(initialState, { remapColors: true });

		// Auto-run
		calculator.setExpression({ id: "544", latex: 'r_{unning}=1' });

		// Handle Data
		function getDataFromExpression() {
			const expression = calculator.getExpressions().find(e => e.id === '583');
			return expression.latex.replace(/^d_{ata}=\\left\[(.*)\\right\]$/, '$1');
		}

		async function setDataToExpression(data) {
			calculator.setExpression({ id: "583", latex: 'd_{ata}=\\left[' + data + '\\right]' });
		}

		async function loadFromStorage() {
			const storedData = localStorage.getItem("data");
			if (storedData) {
				setDataToExpression(storedData);
			}
		}

		async function saveToStorage() {
			const expressionData = getDataFromExpression();
			localStorage.setItem("data", expressionData);
		}

		async function saveToExpression() {
			const expression = calculator.getExpressions().find(e => e.id === '585');
			const values = expression.latex.replace(/^f_{save}\\left\(\\right\)=d_{ata}\\to\\left\[(.*)\\right]$/, '$1').split(",");
			let expressions = [];
			values.forEach((v) => {
				const vExpression = calculator.getExpressions().find(e => e.latex != undefined && e.latex.startsWith(v));
				if (vExpression) {
					expressions.push(vExpression.latex.replaceAll(v + "=", ""));
				}
			})
			setDataToExpression(expressions);
		}

		async function loadFromExpression() {
			const expression = calculator.getExpressions().find(e => e.id === '585');
			const valuesOrder = expression.latex.replace(/^f_{save}\\left\(\\right\)=d_{ata}\\to\\left\[(.*)\\right]$/, '$1').split(",");
			const values = getDataFromExpression().split(",");
			valuesOrder.forEach((v, i) => {
				const vExpression = calculator.getExpressions().find(e => e.latex != undefined && e.latex.startsWith(v));
				if (vExpression && values[i]) {
					calculator.setExpression({ id: vExpression.id, latex: v + '=' + values[i] });
				}
			})
		}

		loadFromStorage();
		loadFromExpression();
		window.addEventListener('beforeunload', () => {
			saveToExpression();
			saveToStorage();
		});

		// Data Buttons
		const importDataButton = document.querySelector("#import-data");
		const exportDataButton = document.querySelector("#export-data");
		const saveDataButton = document.querySelector("#save-data");

		importDataButton.addEventListener("click", function() {
			const newData = prompt("Import data", getDataFromExpression());
			if (newData) {
				setDataToExpression(newData);
				loadFromExpression();
			}
		});
		exportDataButton.addEventListener("click", function() {
			prompt("Exported Data", getDataFromExpression());
		});
		saveDataButton.addEventListener("click", function() {
			saveToExpression();
			saveToStorage();
		});

		// Loaded
		await sleep(1000); // Making sure calculator has loaded
		element.style.visibility = "";
	} catch (e) {
		console.error(e);
	}
}

main();
