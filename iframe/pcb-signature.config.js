/** PCB 签名工具配置持久化（iframe 内使用） */
(function () {
	const STORAGE_KEY = 'pcb-signature-tool-config';

	function safeParse(json) {
		try {
			return JSON.parse(json);
		} catch {
			return null;
		}
	}

	function loadConfig() {
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			return raw ? safeParse(raw) || {} : {};
		} catch {
			return {};
		}
	}

	function saveConfig(next) {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next || {}));
		} catch {}
	}

	window.PcbSignatureConfig = {
		STORAGE_KEY,
		loadConfig,
		saveConfig,
	};
})();

