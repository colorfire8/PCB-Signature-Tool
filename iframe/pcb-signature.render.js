/** 生成 PCB 签名图片（Canvas → PNG blob） */
(function () {
	function applyColorEffectsToCanvas(ctx, width, height, options) {
		const { colorful, invert } = options;
		const imageData = ctx.getImageData(0, 0, width, height);
		const data = imageData.data;
		for (let i = 0; i < data.length; i += 4) {
			let r = data[i];
			let g = data[i + 1];
			let b = data[i + 2];
			if (!colorful) {
				const gray = 0.299 * r + 0.587 * g + 0.114 * b;
				r = g = b = gray;
			}
			if (invert) {
				r = 255 - r;
				g = 255 - g;
				b = 255 - b;
			}
			data[i] = r;
			data[i + 1] = g;
			data[i + 2] = b;
		}
		ctx.putImageData(imageData, 0, 0);
	}

	async function createSignatureImage(options) {
		const { repoUrl, author, version, licenseText, colorful, invert, scale, signatureDataUrl, qrUrls, layout } = options;
		const qrOffsetX = (layout && Number.isFinite(layout.qrOffsetX) && layout.qrOffsetX) || 0;
		const qrOffsetY = (layout && Number.isFinite(layout.qrOffsetY) && layout.qrOffsetY) || 0;
		const textOffsetX = (layout && Number.isFinite(layout.textOffsetX) && layout.textOffsetX) || 0;
		const textOffsetY = (layout && Number.isFinite(layout.textOffsetY) && layout.textOffsetY) || 0;

		const baseWidth = 360;
		const baseHeight = 140;
		const padding = 6;

		const factor = Math.max(0.5, Math.min(3, scale || 1));
		const canvasWidth = Math.round(baseWidth * factor);
		const canvasHeight = Math.round(baseHeight * factor);

		const c = document.createElement('canvas');
		// canvas width depends on QR count (1-3, horizontal row)
		c.width = canvasWidth;
		c.height = canvasHeight;
		const ctx = c.getContext('2d');
		if (!ctx)
			throw new Error('canvas context unavailable');

		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		const lineGapTight = 8 * factor;
		const lineGap = 12 * factor;
		const year = new Date().getFullYear();
		const repoShort = window.PcbSignatureGitHub.toRepoShortText(repoUrl);

		const lines = [
			{ kind: 'author', text: author || 'author' },
			{ kind: 'repo', text: repoShort },
			{ kind: 'meta', text: `© ${year}  ${version}` },
			{ kind: 'license', text: `License: ${licenseText || ''}`.trim() },
			{ kind: 'thanks', text: 'Thanks: JLCEDA' },
		];

		const fontAuthor = `600 ${Math.round(16 * factor)}px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial`;
		const fontMeta = `${Math.round(12 * factor)}px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial`;
		const fontMono = `${Math.round(11 * factor)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
		const fontSmall = `${Math.round(11 * factor)}px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial`;

		const fontSizeAuthor = Math.round(16 * factor);
		const fontSizeMeta = Math.round(12 * factor);
		const fontSizeSmall = Math.round(11 * factor);
		const lineHeights = {
			author: fontSizeAuthor + 2 * factor,
			repo: fontSizeSmall + 2 * factor,
			meta: fontSizeMeta + 2 * factor,
			license: fontSizeSmall + 2 * factor,
			thanks: fontSizeSmall + 2 * factor,
		};

		const textBlockHeight
			= lineHeights.author
				+ lineGapTight
				+ lineHeights.repo
				+ lineGap
				+ lineHeights.meta
				+ lineGap
				+ lineHeights.license
				+ lineGap
				+ lineHeights.thanks;

		// QR height ≈ text block height (visually aligned)
		const qrSize = Math.round(textBlockHeight + 4 * factor);
		const qrY = Math.max(padding, (canvasHeight - qrSize) / 2) + qrOffsetY;
		const urls = Array.isArray(qrUrls) && qrUrls.length ? qrUrls : [repoUrl];
		const gap = Math.round(8 * factor);
		const leftWidth = qrSize * urls.length + gap * Math.max(0, urls.length - 1);

		// widen canvas for multiple QRs (keep old behavior for single)
		const baseCanvasWidth = Math.round(baseWidth * factor);
		const extra = Math.max(0, urls.length - 1) * (qrSize + gap);
		c.width = baseCanvasWidth + extra;

		// background after resizing
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, c.width, c.height);

		const qrImgs = await Promise.all(urls.map(u => window.PcbSignatureQR.loadQrImage(u)));
		qrImgs.forEach(({ img }, i) => {
			const x = padding + qrOffsetX + i * (qrSize + gap);
			ctx.drawImage(img, x, qrY, qrSize, qrSize);
		});

		// Text block vertically aligned to QR
		const textBlockTop = qrY + (qrSize - textBlockHeight) / 2 + textOffsetY;
		const textX = padding + leftWidth + 8 * factor + textOffsetX;
		let textY = textBlockTop;

		ctx.fillStyle = '#000000';
		ctx.textBaseline = 'top';

		async function drawSignatureAt(x, y, maxW, h) {
			if (!signatureDataUrl)
				return false;
			try {
				const img = await new Promise((resolve, reject) => {
					const i = new Image();
					i.onload = () => resolve(i);
					i.onerror = e => reject(e);
					i.src = signatureDataUrl;
				});
				const srcW = img.naturalWidth || img.width;
				const srcH = img.naturalHeight || img.height;
				if (!srcW || !srcH)
					return false;
				const s = Math.min(maxW / srcW, h / srcH);
				const w = Math.max(1, srcW * s);
				const hh = Math.max(1, srcH * s);
				ctx.drawImage(img, x, y + (h - hh) / 2, w, hh);
				return true;
			}
			catch {
				return false;
			}
		}

		for (let idx = 0; idx < lines.length; idx += 1) {
			const line = lines[idx];
			if (line.kind === 'author') {
				const maxW = c.width - textX - padding;
				const drew = await drawSignatureAt(textX, textY, maxW, lineHeights.author);
				if (!drew) {
					ctx.font = fontAuthor;
					ctx.fillText(line.text, textX, textY);
				}
				textY += lineHeights.author;
			}
			else if (line.kind === 'meta') {
				ctx.font = fontMeta;
				ctx.fillText(line.text, textX, textY);
				textY += lineHeights.meta;
			}
			else if (line.kind === 'repo') {
				ctx.font = fontMono;
				ctx.fillText(line.text, textX, textY);
				textY += lineHeights.repo;
			}
			else {
				ctx.font = fontSmall;
				ctx.fillText(line.text, textX, textY);
				textY += lineHeights[line.kind] || lineHeights.license;
			}
			if (idx !== lines.length - 1) {
				if (line.kind === 'author')
					textY += lineGapTight;
				else textY += lineGap;
			}
		}

		applyColorEffectsToCanvas(ctx, c.width, c.height, { colorful, invert });

		return new Promise((resolve, reject) => {
			c.toBlob((blob) => {
				if (!blob)
					return reject(new Error('toBlob failed'));
				const dataUrl = c.toDataURL('image/png');
				resolve({
					blob,
					size: { width: c.width, height: c.height },
					dataUrl,
					layoutBoxes: {
						qrRect: { x: padding + qrOffsetX, y: qrY, w: leftWidth, h: qrSize },
						textRect: { x: textX, y: textBlockTop, w: Math.max(0, c.width - textX - padding), h: textBlockHeight },
					},
				});
			}, 'image/png');
		});
	}

	window.PcbSignatureRender = {
		createSignatureImage,
	};
})();
