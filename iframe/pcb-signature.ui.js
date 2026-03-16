/** UI 工具：状态栏与预览画布 */
(function () {
	function setStatus(text) {
		const statusEl = document.getElementById('status');
		if (statusEl) statusEl.textContent = text || '';
	}

	function clearPreview(previewCanvas) {
		if (!previewCanvas) return;
		const ctx = previewCanvas.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
	}

	function drawPreviewFromDataUrl(previewCanvas, dataUrl) {
		if (!previewCanvas || !dataUrl) return;
		const ctx = previewCanvas.getContext('2d');
		if (!ctx) return;
		const img = new Image();
		img.onload = () => {
			ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
			const s = Math.min(previewCanvas.width / img.width, previewCanvas.height / img.height, 1);
			const drawWidth = img.width * s;
			const drawHeight = img.height * s;
			const dx = (previewCanvas.width - drawWidth) / 2;
			const dy = (previewCanvas.height - drawHeight) / 2;
			ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
		};
		img.src = dataUrl;
	}

	window.PcbSignatureUI = {
		setStatus,
		clearPreview,
		drawPreviewFromDataUrl,
	};
})();

