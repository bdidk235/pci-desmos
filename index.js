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
	let sendGalaxyData = null;
	window.addEventListener("message", e => {
		console.log(e);
		if (e.origin === "https://galaxy.click") {
			onGalaxy = true;
			if (e.data.type === "save_content" && sendGalaxyData) {
				if (e.data.error === false) {
					sendGalaxyData({ content: e.data.content });
				} else {
					sendGalaxyData({ content: null, message: e.data.message });
				}
			} else if (e.data.type === "saved") {
				if (e.data.error === true)
					alert("Failed to save to cloud.")
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
		if (!data) return false;
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
		if (onGalaxy) {
			window.top.postMessage({
				action: "load",
				slot: 0,
			}, "https://galaxy.click");

			const data = await (new Promise(resolve => {
				setTimeout(() => {
					resolve(null);
				}, 1000);
				sendGalaxyData = resolve;
			}));
			sendGalaxyData = null;

			if (data && data.content) {
				if (data.message === "server_error") {
					if (confirm("Failed to get data from galaxy due to a server error, do you want to try again?")) {
						loadFromStorage();
						return;
					}
					if (storedData) {
						if (!validateData(storedData)) {
							alert("Your save is invalid, your game will be reset.")
							return;
						}
						setDataToExpression(storedData);
					}
					return;
				} else if (data.message) {
					if (storedData) {
						if (!validateData(storedData)) {
							alert("Your save is invalid, your game will be reset.")
							return;
						}
						setDataToExpression(storedData);
					}
					return;
				}
				if (!validateData(data.content)) {
					if (storedData && validateData(storedData)) {
						if (!confirm("Your cloud save is invalid, do you want to use your local save instead?"))
							setDataToExpression(storedData);
					} else {
						alert("Your local and cloud saves is invalid, your game will be reset.");
					}
					return;
				}
				if (storedData && storedData !== data.content && validateData(storedData)) {
					if (!confirm("Your local save does not match cloud save, do you want to load from cloud?")) {
						setDataToExpression(storedData);
						return;
					}
				}
				setDataToExpression(data.content);
			} else {
				if (confirm("Timed out while getting data from galaxy, do you want to try again?")) {
					loadFromStorage();
					return;
				}
				if (storedData) {
					if (!validateData(storedData)) {
						alert("Your save is invalid, your game will be reset.")
						return;
					}
					setDataToExpression(storedData);
				}
			}
		} else {
			if (storedData) {
				if (!validateData(storedData)) {
					alert("Your save is invalid, your game will be reset.")
					return;
				}
				setDataToExpression(storedData);
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

	await loadFromStorage();
	await sleep(100);
	await loadFromExpression();
	window.addEventListener('beforeunload', () => {
		saveToExpression();
		saveToStorage();
	});


	// Data Buttons
	const dataButton = document.querySelector("#data-button");
	const saveDataButton = document.querySelector("#save-data");

	dataButton.addEventListener("click", function() {
		await ();
		const newData = prompt("Import Save (Copy to Export)", getDataFromExpression());
		if (newData) {
			if (validateData(newData)) {
				await setDataToExpression(newData);
				await loadFromExpression();
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

	// Auto-run
	await sleep(500);
	calculator.setExpression({ id: "544", latex: 'r_{unning}=1' });

	// Loaded
	await sleep(1000); // Making sure calculator has loaded
	element.style.visibility = "";
}

main();
