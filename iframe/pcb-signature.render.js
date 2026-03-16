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
		const { repoUrl, author, version, licenseText, colorful, invert, scale } = options;

		const baseWidth = 360;
		const baseHeight = 140;
		const padding = 6;

		const factor = Math.max(0.5, Math.min(3, scale || 1));
		const canvasWidth = Math.round(baseWidth * factor);
		const canvasHeight = Math.round(baseHeight * factor);

		const c = document.createElement('canvas');
		c.width = canvasWidth;
		c.height = canvasHeight;
		const ctx = c.getContext('2d');
		if (!ctx) throw new Error('canvas context unavailable');

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

		const textBlockHeight =
			lineHeights.author +
			lineGapTight +
			lineHeights.repo +
			lineGap +
			lineHeights.meta +
			lineGap +
			lineHeights.license +
			lineGap +
			lineHeights.thanks;

		// QR height ≈ text block height (visually aligned)
		const qrSize = Math.round(textBlockHeight + 4 * factor);
		const qrY = Math.max(padding, (canvasHeight - qrSize) / 2);
		const { img: qrImg } = await window.PcbSignatureQR.loadQrImage(repoUrl);
		ctx.drawImage(qrImg, padding, qrY, qrSize, qrSize);

		// Text block vertically aligned to QR
		const textBlockTop = qrY + (qrSize - textBlockHeight) / 2;
		const textX = padding + qrSize + 8 * factor;
		let textY = textBlockTop;

		ctx.fillStyle = '#000000';
		ctx.textBaseline = 'top';

		lines.forEach((line, idx) => {
			if (line.kind === 'author') {
				ctx.font = fontAuthor;
				ctx.fillText(line.text, textX, textY);
				textY += lineHeights.author;
			} else if (line.kind === 'meta') {
				ctx.font = fontMeta;
				ctx.fillText(line.text, textX, textY);
				textY += lineHeights.meta;
			} else if (line.kind === 'repo') {
				ctx.font = fontMono;
				ctx.fillText(line.text, textX, textY);
				textY += lineHeights.repo;
			} else {
				ctx.font = fontSmall;
				ctx.fillText(line.text, textX, textY);
				textY += lineHeights[line.kind] || lineHeights.license;
			}
			if (idx !== lines.length - 1) {
				if (line.kind === 'author') textY += lineGapTight;
				else textY += lineGap;
			}
		});

		applyColorEffectsToCanvas(ctx, canvasWidth, canvasHeight, { colorful, invert });

		return new Promise((resolve, reject) => {
			c.toBlob((blob) => {
				if (!blob) return reject(new Error('toBlob failed'));
				const dataUrl = c.toDataURL('image/png');
				resolve({ blob, size: { width: canvasWidth, height: canvasHeight }, dataUrl });
			}, 'image/png');
		});
	}

	window.PcbSignatureRender = {
		createSignatureImage,
	};
})();

