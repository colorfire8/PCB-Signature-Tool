/** 手写签名：在线绘制 / 上传图片，并导出 PNG dataUrl */
(function () {
	function fitContain(srcW, srcH, dstW, dstH) {
		const s = Math.min(dstW / srcW, dstH / srcH);
		const w = srcW * s;
		const h = srcH * s;
		return { x: (dstW - w) / 2, y: (dstH - h) / 2, w, h };
	}

	function readFileAsDataUrl(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result || ''));
			reader.onerror = e => reject(e);
			reader.readAsDataURL(file);
		});
	}

	function loadImage(dataUrl) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = e => reject(e);
			img.src = dataUrl;
		});
	}

	function createSignatureController(canvas) {
		const ctx = canvas.getContext('2d');
		if (!ctx)
			throw new Error('signature canvas context unavailable');

		let isDrawing = false;
		let hasContent = false;
		let last = null;

		function clear() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			hasContent = false;
			last = null;
		}

		function getDataUrl() {
			return hasContent ? canvas.toDataURL('image/png') : '';
		}

		function getPointFromEvent(ev) {
			const rect = canvas.getBoundingClientRect();
			const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
			const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
			return { x, y };
		}

		function beginDraw(pt) {
			isDrawing = true;
			last = pt;
		}

		function drawTo(pt) {
			if (!isDrawing || !last)
				return;
			ctx.save();
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.strokeStyle = '#000000';
			ctx.globalCompositeOperation = 'source-over';
			ctx.lineWidth = Math.max(2, Math.round(canvas.height * 0.06));
			ctx.beginPath();
			ctx.moveTo(last.x, last.y);
			ctx.lineTo(pt.x, pt.y);
			ctx.stroke();
			ctx.restore();
			last = pt;
			hasContent = true;
		}

		function endDraw() {
			isDrawing = false;
			last = null;
		}

		canvas.addEventListener('pointerdown', (ev) => {
			canvas.setPointerCapture?.(ev.pointerId);
			beginDraw(getPointFromEvent(ev));
		});
		canvas.addEventListener('pointermove', ev => drawTo(getPointFromEvent(ev)));
		canvas.addEventListener('pointerup', () => endDraw());
		canvas.addEventListener('pointercancel', () => endDraw());
		canvas.addEventListener('pointerleave', () => endDraw());

		async function setFromFile(file) {
			const dataUrl = await readFileAsDataUrl(file);
			const img = await loadImage(dataUrl);
			clear();
			const box = fitContain(img.naturalWidth || img.width, img.naturalHeight || img.height, canvas.width, canvas.height);
			ctx.drawImage(img, box.x, box.y, box.w, box.h);
			hasContent = true;
		}

		async function setFromDataUrl(dataUrl) {
			if (!dataUrl)
				return;
			const img = await loadImage(dataUrl);
			clear();
			const box = fitContain(img.naturalWidth || img.width, img.naturalHeight || img.height, canvas.width, canvas.height);
			ctx.drawImage(img, box.x, box.y, box.w, box.h);
			hasContent = true;
		}

		return {
			clear,
			getDataUrl,
			setFromFile,
			setFromDataUrl,
		};
	}

	window.PcbSignatureSignature = {
		createSignatureController,
	};
})();
