/** PCB 签名工具 iframe 应用入口 */
(function () {
	function getEls() {
		const els = {
			repoInput: document.getElementById('repo-url'),
			authorInput: document.getElementById('author-name'),
			versionInput: document.getElementById('version'),
			licenseTextEl: document.getElementById('license-text'),
			licenseOverrideEl: document.getElementById('license-override'),
			insertBtn: document.getElementById('insert-signature'),
			invertEl: document.getElementById('invert'),
			colorfulEl: document.getElementById('colorful'),
			scaleEl: document.getElementById('size-scale'),
			previewCanvas: document.getElementById('preview-canvas'),
		};
		const allOk = Object.values(els).every(Boolean);
		return allOk ? els : null;
	}

	function coerceScale(v) {
		const n = parseFloat(v);
		return Number.isFinite(n) ? n : 1;
	}

	function bindMutualExclusiveColorOptions({ invertEl, colorfulEl }) {
		colorfulEl.addEventListener('change', () => {
			if (colorfulEl.checked) {
				invertEl.checked = false;
				invertEl.disabled = true;
			} else {
				invertEl.disabled = false;
			}
		});

		invertEl.addEventListener('change', () => {
			if (invertEl.checked) {
				colorfulEl.checked = false;
				colorfulEl.disabled = true;
			} else {
				colorfulEl.disabled = false;
			}
		});
	}

	document.addEventListener('DOMContentLoaded', () => {
		const els = getEls();
		if (!els) return;

		const { repoInput, authorInput, versionInput, licenseTextEl, licenseOverrideEl, insertBtn, invertEl, colorfulEl, scaleEl, previewCanvas } =
			els;

		// Restore config
		const saved = window.PcbSignatureConfig.loadConfig();
		if (saved.repoUrl) repoInput.value = saved.repoUrl;
		if (saved.author) authorInput.value = saved.author;
		if (saved.version) versionInput.value = saved.version;
		if (typeof saved.invert === 'boolean') invertEl.checked = saved.invert;
		if (typeof saved.colorful === 'boolean') colorfulEl.checked = saved.colorful;
		if (typeof saved.scale === 'number') scaleEl.value = String(saved.scale);
		if (saved.licenseText) licenseTextEl.textContent = saved.licenseText;
		if (saved.licenseOverride) licenseOverrideEl.value = saved.licenseOverride;

		// Defaults（与 extension.json 中信息保持一致）
		if (!authorInput.value) authorInput.value = 'Colorfire';
		if (!versionInput.value) versionInput.value = '1.0.0';
		if (!repoInput.value) repoInput.value = 'https://github.com/colorfire8/PCB-Signature-Tool';
		if (!scaleEl.value) scaleEl.value = '1';

		bindMutualExclusiveColorOptions({ invertEl, colorfulEl });

		function saveConfig(extra) {
			const cfg = {
				repoUrl: repoInput.value.trim(),
				author: authorInput.value.trim(),
				version: versionInput.value.trim(),
				invert: invertEl.checked,
				colorful: colorfulEl.checked,
				scale: coerceScale(scaleEl.value),
				licenseText: licenseTextEl.textContent || '',
				licenseOverride: licenseOverrideEl.value.trim(),
				...extra,
			};
			window.PcbSignatureConfig.saveConfig(cfg);
		}

		async function generate({ insert }) {
			const repoUrl = repoInput.value.trim();
			const author = authorInput.value.trim() || 'colorfire';
			const version = versionInput.value.trim() || 'v1.0.0';
			const invert = invertEl.checked;
			const colorful = colorfulEl.checked;
			const scale = coerceScale(scaleEl.value);
			const licenseOverride = licenseOverrideEl.value.trim();

			if (!repoUrl) {
				window.PcbSignatureUI.setStatus('请填写 GitHub 仓库链接');
				return;
			}

			window.PcbSignatureUI.setStatus(insert ? '正在生成签名并准备插入…' : '正在生成预览…');

			try {
				let licenseText = await window.PcbSignatureGitHub.fetchGithubLicense(repoUrl);
				if (!licenseText) licenseText = 'Apache-2.0';
				licenseTextEl.textContent = licenseText;

				const effectiveLicenseText = licenseOverride ? licenseOverride : licenseText;

				const { blob, size, dataUrl } = await window.PcbSignatureRender.createSignatureImage({
					repoUrl,
					author,
					version,
					licenseText: effectiveLicenseText,
					colorful,
					invert,
					scale,
				});

				window.PcbSignatureUI.drawPreviewFromDataUrl(previewCanvas, dataUrl);
				saveConfig({ licenseText });

				if (insert) {
					await window.PcbSignatureEDA.insertSignatureImage({ size, blob, invert, colorful });
					window.PcbSignatureUI.setStatus('已生成签名图片，请在 PCB 中单击放置。');
				} else {
					window.PcbSignatureUI.setStatus('预览已更新。');
				}
			} catch (err) {
				console.error(err);
				window.PcbSignatureUI.setStatus('生成签名图片失败，请检查网络或仓库链接。');
				window.PcbSignatureUI.clearPreview(previewCanvas);
			}
		}

		// Persist on input
		[repoInput, authorInput, versionInput].forEach((input) => {
			input.addEventListener('input', () => saveConfig());
			input.addEventListener('blur', () => {
				if (input === repoInput) generate({ insert: false });
			});
		});

		licenseOverrideEl.addEventListener('input', () => {
			saveConfig();
			generate({ insert: false });
		});

		invertEl.addEventListener('change', () => {
			saveConfig();
			generate({ insert: false });
		});

		colorfulEl.addEventListener('change', () => {
			saveConfig();
			generate({ insert: false });
		});

		scaleEl.addEventListener('input', () => {
			saveConfig();
			generate({ insert: false });
		});

		insertBtn.addEventListener('click', async () => {
			insertBtn.disabled = true;
			try {
				await generate({ insert: true });
			} finally {
				insertBtn.disabled = false;
			}
		});

		// Initial preview if repo exists
		if (repoInput.value.trim()) generate({ insert: false });
	});
})();

