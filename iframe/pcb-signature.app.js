/** PCB 签名工具 iframe 应用入口 */
(function () {
	function getEls() {
		const els = {
			repoInput: document.getElementById('repo-url'),
			giteeInput: document.getElementById('gitee-url'),
			jlcInput: document.getElementById('jlc-url'),
			authorInput: document.getElementById('author-name'),
			versionInput: document.getElementById('version'),
			licenseTextEl: document.getElementById('license-text'),
			licenseOverrideEl: document.getElementById('license-override'),
			insertBtn: document.getElementById('insert-signature'),
			qrGithubEl: document.getElementById('qr-github'),
			qrGiteeEl: document.getElementById('qr-gitee'),
			qrJlcEl: document.getElementById('qr-jlc'),
			sigModeNoneEl: document.getElementById('sig-mode-none'),
			sigModeDrawEl: document.getElementById('sig-mode-draw'),
			sigModeUploadEl: document.getElementById('sig-mode-upload'),
			sigUploadEl: document.getElementById('sig-upload'),
			sigClearEl: document.getElementById('sig-clear'),
			sigCanvas: document.getElementById('sig-canvas'),
			colorModeDefaultEl: document.getElementById('color-mode-default'),
			colorModeInvertEl: document.getElementById('color-mode-invert'),
			colorModeColorfulEl: document.getElementById('color-mode-colorful'),
			scaleEl: document.getElementById('size-scale'),
			previewCanvas: document.getElementById('preview-canvas'),
		};
		const allOk = Object.values(els).every(Boolean);
		return allOk ? els : null;
	}

	function coerceScale(v) {
		const n = Number.parseFloat(v);
		return Number.isFinite(n) ? n : 1;
	}

	function getColorMode({ colorModeDefaultEl: _colorModeDefaultEl, colorModeInvertEl, colorModeColorfulEl }) {
		if (colorModeColorfulEl.checked)
			return 'colorful';
		if (colorModeInvertEl.checked)
			return 'invert';
		return 'default';
	}

	function setColorMode({ colorModeDefaultEl, colorModeInvertEl, colorModeColorfulEl }, mode) {
		if (mode === 'colorful')
			colorModeColorfulEl.checked = true;
		else if (mode === 'invert')
			colorModeInvertEl.checked = true;
		else colorModeDefaultEl.checked = true;
	}

	function toLegacyColorFlags(mode) {
		return {
			colorful: mode === 'colorful',
			invert: mode === 'invert',
		};
	}

	function getSignatureMode({ sigModeNoneEl: _sigModeNoneEl, sigModeDrawEl, sigModeUploadEl }) {
		if (sigModeUploadEl.checked)
			return 'upload';
		if (sigModeDrawEl.checked)
			return 'draw';
		return 'none';
	}

	function setSignatureMode({ sigModeNoneEl, sigModeDrawEl, sigModeUploadEl }, mode) {
		if (mode === 'upload')
			sigModeUploadEl.checked = true;
		else if (mode === 'draw')
			sigModeDrawEl.checked = true;
		else sigModeNoneEl.checked = true;
	}

	function getSelectedQrUrls({ repoInput, giteeInput, jlcInput, qrGithubEl, qrGiteeEl, qrJlcEl }) {
		const out = [];
		const gh = repoInput.value.trim();
		const ge = giteeInput.value.trim();
		const jl = jlcInput.value.trim();
		if (qrGithubEl.checked && gh)
			out.push(gh);
		if (qrGiteeEl.checked && ge)
			out.push(ge);
		if (qrJlcEl.checked && jl)
			out.push(jl);
		return out;
	}

	document.addEventListener('DOMContentLoaded', () => {
		const els = getEls();
		if (!els)
			return;

		const {
			repoInput,
			giteeInput,
			jlcInput,
			authorInput,
			versionInput,
			licenseTextEl,
			licenseOverrideEl,
			insertBtn,
			qrGithubEl,
			qrGiteeEl,
			qrJlcEl,
			sigModeNoneEl,
			sigModeDrawEl,
			sigModeUploadEl,
			sigUploadEl,
			sigClearEl,
			sigCanvas,
			colorModeDefaultEl,
			colorModeInvertEl,
			colorModeColorfulEl,
			scaleEl,
			previewCanvas,
		} = els;

		const signatureCtrl = window.PcbSignatureSignature.createSignatureController(sigCanvas);
		const layoutState = {
			qrOffsetX: 0,
			qrOffsetY: 0,
			textOffsetX: 0,
			textOffsetY: 0,
		};
		let lastLayoutBoxes = null;
		let rafPending = false;
		let drag = null;

		// Restore config
		const saved = window.PcbSignatureConfig.loadConfig();
		if (saved.repoUrl)
			repoInput.value = saved.repoUrl;
		if (saved.giteeUrl)
			giteeInput.value = saved.giteeUrl;
		if (saved.jlcUrl)
			jlcInput.value = saved.jlcUrl;
		if (saved.author)
			authorInput.value = saved.author;
		if (saved.version)
			versionInput.value = saved.version;
		// Backward compatible: map legacy (invert/colorful) to new color mode radios
		if (saved && typeof saved.colorful === 'boolean' && saved.colorful) {
			setColorMode({ colorModeDefaultEl, colorModeInvertEl, colorModeColorfulEl }, 'colorful');
		}
		else if (saved && typeof saved.invert === 'boolean' && saved.invert) {
			setColorMode({ colorModeDefaultEl, colorModeInvertEl, colorModeColorfulEl }, 'invert');
		}
		else {
			setColorMode({ colorModeDefaultEl, colorModeInvertEl, colorModeColorfulEl }, 'default');
		}
		if (typeof saved.scale === 'number')
			scaleEl.value = String(saved.scale);
		if (saved.licenseText)
			licenseTextEl.textContent = saved.licenseText;
		if (saved.licenseOverride)
			licenseOverrideEl.value = saved.licenseOverride;
		if (typeof saved.qrGithub === 'boolean')
			qrGithubEl.checked = saved.qrGithub;
		if (typeof saved.qrGitee === 'boolean')
			qrGiteeEl.checked = saved.qrGitee;
		if (typeof saved.qrJlc === 'boolean')
			qrJlcEl.checked = saved.qrJlc;
		if (saved.signatureMode)
			setSignatureMode({ sigModeNoneEl, sigModeDrawEl, sigModeUploadEl }, saved.signatureMode);
		if (saved.signatureDataUrl) {
			signatureCtrl.setFromDataUrl(saved.signatureDataUrl).catch(() => {});
		}
		if (saved && typeof saved.layoutQrOffsetX === 'number')
			layoutState.qrOffsetX = saved.layoutQrOffsetX;
		if (saved && typeof saved.layoutQrOffsetY === 'number')
			layoutState.qrOffsetY = saved.layoutQrOffsetY;
		if (saved && typeof saved.layoutTextOffsetX === 'number')
			layoutState.textOffsetX = saved.layoutTextOffsetX;
		if (saved && typeof saved.layoutTextOffsetY === 'number')
			layoutState.textOffsetY = saved.layoutTextOffsetY;

		// Defaults（与 extension.json 中信息保持一致）
		if (!authorInput.value)
			authorInput.value = 'Colorfire';
		if (!versionInput.value)
			versionInput.value = '1.0.0';
		if (!repoInput.value)
			repoInput.value = 'https://github.com/colorfire8/PCB-Signature-Tool';
		// default QR: GitHub only
		if (typeof saved.qrGithub !== 'boolean' && typeof saved.qrGitee !== 'boolean' && typeof saved.qrJlc !== 'boolean') {
			qrGithubEl.checked = true;
			qrGiteeEl.checked = false;
			qrJlcEl.checked = false;
		}
		if (!scaleEl.value)
			scaleEl.value = '1';

		function syncSignatureUi() {
			const mode = getSignatureMode({ sigModeNoneEl, sigModeDrawEl, sigModeUploadEl });
			sigCanvas.style.opacity = mode === 'none' ? '0.45' : '1';
		}

		function saveConfig(extra) {
			const colorMode = getColorMode({ colorModeDefaultEl, colorModeInvertEl, colorModeColorfulEl });
			const { invert, colorful } = toLegacyColorFlags(colorMode);
			const signatureMode = getSignatureMode({ sigModeNoneEl, sigModeDrawEl, sigModeUploadEl });
			const signatureDataUrl = signatureCtrl.getDataUrl();

			const cfg = {
				repoUrl: repoInput.value.trim(),
				giteeUrl: giteeInput.value.trim(),
				jlcUrl: jlcInput.value.trim(),
				author: authorInput.value.trim(),
				version: versionInput.value.trim(),
				invert,
				colorful,
				scale: coerceScale(scaleEl.value),
				licenseText: licenseTextEl.textContent || '',
				licenseOverride: licenseOverrideEl.value.trim(),
				qrGithub: !!qrGithubEl.checked,
				qrGitee: !!qrGiteeEl.checked,
				qrJlc: !!qrJlcEl.checked,
				signatureMode,
				signatureDataUrl,
				layoutQrOffsetX: layoutState.qrOffsetX,
				layoutQrOffsetY: layoutState.qrOffsetY,
				layoutTextOffsetX: layoutState.textOffsetX,
				layoutTextOffsetY: layoutState.textOffsetY,
				...extra,
			};
			window.PcbSignatureConfig.saveConfig(cfg);
		}

		function getEffectiveLicenseText({ githubUrl }) {
			const override = licenseOverrideEl.value.trim();
			if (override)
				return { licenseText: override, fetched: false };
			const cached = (licenseTextEl.textContent || '').trim();
			if (cached && cached !== '待获取')
				return { licenseText: cached, fetched: false };
			// only fetch for GitHub url
			return { licenseText: '', fetched: true, githubUrl };
		}

		async function generate({ insert, skipLicenseFetch }) {
			const githubUrl = repoInput.value.trim();
			const giteeUrl = giteeInput.value.trim();
			const jlcUrl = jlcInput.value.trim();
			const repoUrlForText = githubUrl || giteeUrl || jlcUrl;
			const author = authorInput.value.trim() || 'colorfire';
			const version = versionInput.value.trim() || 'v1.0.0';
			const colorMode = getColorMode({ colorModeDefaultEl, colorModeInvertEl, colorModeColorfulEl });
			const { invert, colorful } = toLegacyColorFlags(colorMode);
			const scale = coerceScale(scaleEl.value);
			const licenseOverride = licenseOverrideEl.value.trim();
			const signatureMode = getSignatureMode({ sigModeNoneEl, sigModeDrawEl, sigModeUploadEl });
			const signatureDataUrl = signatureMode === 'none' ? '' : signatureCtrl.getDataUrl();
			const qrUrls = getSelectedQrUrls({ repoInput, giteeInput, jlcInput, qrGithubEl, qrGiteeEl, qrJlcEl });

			if (!repoUrlForText) {
				window.PcbSignatureUI.setStatus('请至少填写一个仓库链接（GitHub / Gitee / 嘉立创）');
				return;
			}
			if (!qrUrls.length) {
				window.PcbSignatureUI.setStatus('请至少勾选一个二维码来源，并填写对应链接');
				return;
			}

			if (!skipLicenseFetch)
				window.PcbSignatureUI.setStatus(insert ? '正在生成签名并准备插入…' : '正在生成预览…');

			try {
				let effectiveLicenseText = '';
				if (!skipLicenseFetch) {
					const licensePlan = getEffectiveLicenseText({ githubUrl });
					if (licensePlan.fetched && licensePlan.githubUrl) {
						let licenseText = await window.PcbSignatureGitHub.fetchGithubLicense(licensePlan.githubUrl);
						if (!licenseText)
							licenseText = 'Apache-2.0';
						licenseTextEl.textContent = licenseText;
						effectiveLicenseText = licenseOverride || licenseText;
					}
					else {
						effectiveLicenseText = licenseOverride || (licensePlan.licenseText || 'Apache-2.0');
					}
				}
				else {
					effectiveLicenseText = licenseOverride || (licenseTextEl.textContent || 'Apache-2.0');
				}

				const { blob, size, dataUrl, layoutBoxes } = await window.PcbSignatureRender.createSignatureImage({
					repoUrl: repoUrlForText,
					author,
					version,
					licenseText: effectiveLicenseText,
					colorful,
					invert,
					scale,
					signatureDataUrl,
					qrUrls,
					layout: { ...layoutState },
				});

				window.PcbSignatureUI.drawPreviewFromDataUrl(previewCanvas, dataUrl);
				lastLayoutBoxes = layoutBoxes || null;
				if (!skipLicenseFetch)
					saveConfig({ licenseText: licenseTextEl.textContent || '' });
				else saveConfig();

				if (insert) {
					await window.PcbSignatureEDA.insertSignatureImage({ size, blob, invert, colorful });
					window.PcbSignatureUI.setStatus('已生成签名图片，请在 PCB 中单击放置。');
				}
				else {
					if (!skipLicenseFetch)
						window.PcbSignatureUI.setStatus('预览已更新。');
				}
			}
			catch (err) {
				console.error(err);
				window.PcbSignatureUI.setStatus('生成签名图片失败，请检查网络或仓库链接。');
				window.PcbSignatureUI.clearPreview(previewCanvas);
			}
		}

		function schedulePreviewRerender() {
			if (rafPending)
				return;
			rafPending = true;
			requestAnimationFrame(async () => {
				rafPending = false;
				await generate({ insert: false, skipLicenseFetch: true });
			});
		}

		function previewToImagePoint(ev) {
			const t = previewCanvas.__pcbSigPreviewTransform;
			if (!t)
				return null;
			const rect = previewCanvas.getBoundingClientRect();
			const x = ((ev.clientX - rect.left) / rect.width) * previewCanvas.width;
			const y = ((ev.clientY - rect.top) / rect.height) * previewCanvas.height;
			const ix = (x - t.dx) / t.s;
			const iy = (y - t.dy) / t.s;
			return { x: ix, y: iy };
		}

		function isInRect(pt, r) {
			return pt.x >= r.x && pt.y >= r.y && pt.x <= r.x + r.w && pt.y <= r.y + r.h;
		}

		previewCanvas.addEventListener('pointerdown', (ev) => {
			const pt = previewToImagePoint(ev);
			if (!pt || !lastLayoutBoxes)
				return;
			const hitQr = lastLayoutBoxes.qrRect && isInRect(pt, lastLayoutBoxes.qrRect);
			const hitText = lastLayoutBoxes.textRect && isInRect(pt, lastLayoutBoxes.textRect);
			if (!hitQr && !hitText)
				return;
			previewCanvas.setPointerCapture?.(ev.pointerId);
			drag = { kind: hitQr ? 'qr' : 'text', startPt: pt, start: { ...layoutState } };
		});

		previewCanvas.addEventListener('pointermove', (ev) => {
			if (!drag)
				return;
			const pt = previewToImagePoint(ev);
			if (!pt)
				return;
			const dx = pt.x - drag.startPt.x;
			const dy = pt.y - drag.startPt.y;
			if (drag.kind === 'qr') {
				layoutState.qrOffsetX = drag.start.qrOffsetX + dx;
				layoutState.qrOffsetY = drag.start.qrOffsetY + dy;
			}
			else {
				layoutState.textOffsetX = drag.start.textOffsetX + dx;
				layoutState.textOffsetY = drag.start.textOffsetY + dy;
			}
			schedulePreviewRerender();
		});

		function endPreviewDrag() {
			if (!drag)
				return;
			drag = null;
			saveConfig();
		}
		previewCanvas.addEventListener('pointerup', () => endPreviewDrag());
		previewCanvas.addEventListener('pointercancel', () => endPreviewDrag());
		previewCanvas.addEventListener('pointerleave', () => endPreviewDrag());

		// Persist on input
		[repoInput, giteeInput, jlcInput, authorInput, versionInput].forEach((input) => {
			input.addEventListener('input', () => saveConfig());
			input.addEventListener('blur', () => {
				if (input === repoInput || input === giteeInput || input === jlcInput)
					generate({ insert: false });
			});
		});

		licenseOverrideEl.addEventListener('input', () => {
			saveConfig();
			generate({ insert: false });
		});

		[colorModeDefaultEl, colorModeInvertEl, colorModeColorfulEl].forEach((el) => {
			el.addEventListener('change', () => {
				saveConfig();
				generate({ insert: false });
			});
		});

		[qrGithubEl, qrGiteeEl, qrJlcEl].forEach((el) => {
			el.addEventListener('change', () => {
				saveConfig();
				generate({ insert: false });
			});
		});

		scaleEl.addEventListener('input', () => {
			saveConfig();
			generate({ insert: false });
		});

		sigClearEl.addEventListener('click', () => {
			signatureCtrl.clear();
			saveConfig();
			generate({ insert: false });
		});

		function bindSignatureModeChange(el) {
			el.addEventListener('change', () => {
				syncSignatureUi();
				saveConfig();
				generate({ insert: false });
			});
		}
		[sigModeNoneEl, sigModeDrawEl, sigModeUploadEl].forEach(bindSignatureModeChange);

		sigCanvas.addEventListener('pointerup', () => {
			// after drawing a stroke
			saveConfig();
			generate({ insert: false });
		});

		sigModeUploadEl.addEventListener('change', () => {
			if (sigModeUploadEl.checked)
				sigUploadEl.click();
		});

		sigUploadEl.addEventListener('change', async () => {
			const file = sigUploadEl.files && sigUploadEl.files[0];
			if (!file)
				return;
			try {
				await signatureCtrl.setFromFile(file);
				setSignatureMode({ sigModeNoneEl, sigModeDrawEl, sigModeUploadEl }, 'upload');
				syncSignatureUi();
				saveConfig();
				generate({ insert: false });
			}
			catch (e) {
				console.error(e);
				window.PcbSignatureUI.setStatus('加载签名图片失败，请换一张图片重试。');
			}
			finally {
				sigUploadEl.value = '';
			}
		});

		insertBtn.addEventListener('click', async () => {
			insertBtn.disabled = true;
			try {
				await generate({ insert: true });
			}
			finally {
				insertBtn.disabled = false;
			}
		});

		// Initial preview if repo exists
		if (repoInput.value.trim())
			generate({ insert: false });
		syncSignatureUi();
	});
})();
