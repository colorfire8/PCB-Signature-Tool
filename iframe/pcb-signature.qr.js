/**
 * QR image loader.
 *
 * Uses an external QR generator service to produce a PNG, then loads it as Image.
 */
(function () {
	const cache = new Map();

	async function loadQrImage(data) {
		if (cache.has(data))
			return cache.get(data);

		const task = (async () => {
			const endpoint = 'https://api.qrserver.com/v1/create-qr-code/';
			const params = new URLSearchParams({
				size: '120x120',
				data,
				margin: '0',
			});
			const url = `${endpoint}?${params.toString()}`;
			const resp = await fetch(url);
			if (!resp.ok)
				throw new Error('二维码生成失败');
			const blob = await resp.blob();
			return new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => resolve({ img, blob });
				img.onerror = e => reject(e);
				img.src = URL.createObjectURL(blob);
			});
		})();

		cache.set(data, task);
		try {
			return await task;
		}
		catch (e) {
			cache.delete(data);
			throw e;
		}
	}

	window.PcbSignatureQR = {
		loadQrImage,
	};
})();
