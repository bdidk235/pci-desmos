async function loadJson(path) {
	const res = await fetch(path);
	if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
	return res.text();
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function main() {
	const loadingElement = document.querySelector("#loading");

	// Listen to galaxy.click
	let onGalaxy = document.referrer.startsWith("https://galaxy.click");
	let galaxyData = null;
	window.addEventListener("message", e => {
		console.log(e);
		if (e.origin === "https://galaxy.click") {
			onGalaxy = true;
			if (e.data.type === "save_content") {
				if (e.data.error === false) {
					galaxyData = { data: e.data.content };
				} else {
					galaxyData = { data: null, message: e.data.message };
				}
			}
		}
	});

	// Get State JSON
	const stateText = await loadJson("./state.json");
	const initialState = JSON.parse(stateText.replaceAll("\\\\", "\\"));

	// Put state into "calculator"
	const element = document.querySelector("#calculator");
	const calculator = Desmos.GraphingCalculator(element, { lockViewport: true, expressionsCollapsed: true, settingsMenu: false, zoomButtons: false, actions: true });
	window.Calc = calculator;
	calculator.setState(initialState, { remapColors: true });

	// Handle Data
	function validateData(data) {
		const values = data.split(",");
		for (i in values) {
			const number = new Number(values[i]).valueOf()
			if (number !== number) return false
		}
		return true
	}

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
			if (!validateData(storedData)) {
				alert("Your save is invalid, your game will be reset.")
				return;
			}
			setDataToExpression(storedData);
		} else if (onGalaxy) {
			window.top.postMessage({
				action: "load",
				slot: 0,
			}, "https://galaxy.click");

			const data = await (new Promise(resolve => {
				setTimeout(() => {
					resolve(null);
				}, 1000);
				while (!galaxyData);
				resolve(galaxyData);
			}));

			if (data) {
				if (data.message !== "no_account" && data.message !== "empty_slot") {
					if (confirm("Failed to get data from galaxy: " + data.message + ", do you want to try again?"))
						loadFromStorage();
					return;
				}
				if (!validateData(storedData)) {
					alert("Your save is invalid, your game will be reset.");
					return;
				}
				setDataToExpression(data.content);
			} else {
				if (confirm("Failed to get data from galaxy, do you want to try again?"))
					loadFromStorage();
			}
		}
	}

	async function saveToStorage() {
		const expressionData = getDataFromExpression();
		localStorage.setItem("data", expressionData);
		window.top.postMessage({
			action: "save",
			slot: 0,
			label: "Cloud Save",
			data: expressionData,
		}, "https://galaxy.click")
	}

	async function saveToExpression() {
		const expression = calculator.getExpressions().find(e => e.id === '585');
		const values = expression.latex.replace(/^f_{save}\\left\(\\right\)=d_{ata}\\to\\left\[(.*)\\right]$/, '$1').split(",");
		let expressions = [];
		values.forEach((v) => {
			const vExpression = calculator.getExpressions().find(e => e.latex !== undefined && e.latex.startsWith(v));
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
			const vExpression = calculator.getExpressions().find(e => e.latex !== undefined && e.latex.startsWith(v));
			if (vExpression && values[i]) {
				calculator.setExpression({ id: vExpression.id, latex: v + '=' + values[i] });
			}
		});
	}

	// Loading Data
	loadingElement.innerHTML = "Loading Data..."

	loadFromStorage();
	loadFromExpression();
	window.addEventListener('beforeunload', () => {
		saveToExpression();
		saveToStorage();
	});

	// Auto-run
	calculator.setExpression({ id: "544", latex: 'r_{unning}=1' });

	// Data Buttons
	const dataButton = document.querySelector("#data-button");
	const saveDataButton = document.querySelector("#save-data");

	dataButton.addEventListener("click", function() {
		saveToExpression();
		const newData = prompt("Import Save (Copy to Export)", getDataFromExpression());
		if (newData) {
			if (validateData(newData)) {
				setDataToExpression(newData);
				loadFromExpression();
			} else {
				alert("Invalid save data.")
			}
		}
	});
	saveDataButton.addEventListener("click", function() {
		saveToExpression();
		saveToStorage();
	});

	// Loading Game
	loadingElement.innerHTML = "Loading Game..."

	// Loaded
	await sleep(1000); // Making sure calculator has loaded
	element.style.visibility = "";
}

main();
