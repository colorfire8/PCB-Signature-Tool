/** 通过 EDA API 将生成的图片插入 PCB 丝印层 */
(function () {
	function readBlobAsDataUrl(blob) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result);
			reader.onerror = (err) => reject(err);
			reader.readAsDataURL(blob);
		});
	}

	async function insertSignatureImage({ size, blob, invert, colorful }) {
		eda.sys_Message.showToastMessage('请单击放置作者签名', 'info', 3);

		if (colorful) {
			const base64String = await readBlobAsDataUrl(blob);
			eda.pcb_Event.addMouseEventListener(
				'put',
				'selected',
				async () => {
					const point = await eda.pcb_SelectControl.getCurrentMousePosition();
					eda.pcb_PrimitiveObject.create(
						EPCB_LayerId.TOP_SILKSCREEN,
						point.x,
						point.y,
						base64String,
						size.width,
						size.height,
						0,
						false,
						'img',
						false,
					);
				},
				true,
			);
			return;
		}

		const tolerance = 0;
		const simplification = 0;
		const smoothing = 0;
		const despeckling = 0;
		const whiteAsBackgroundColor = true;

		const edaimage = await eda.pcb_MathPolygon.convertImageToComplexPolygon(
			blob,
			size.width,
			size.height,
			tolerance,
			simplification,
			smoothing,
			despeckling,
			whiteAsBackgroundColor,
			!!invert,
		);

		eda.pcb_Event.addMouseEventListener(
			'put',
			'selected',
			async () => {
				const point = await eda.pcb_SelectControl.getCurrentMousePosition();
				eda.pcb_PrimitiveImage.create(point.x, point.y, edaimage, EPCB_LayerId.TOP_SILKSCREEN, size.width, size.height, 0, false, false);
			},
			true,
		);
	}

	window.PcbSignatureEDA = {
		insertSignatureImage,
	};
})();

