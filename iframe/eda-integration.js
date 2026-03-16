/** 兼容旧版本的占位实现，当前工具未使用 */
(function () {
	window.__edaInsertImage = async function (imageUrl, target, size, blob) {
		const edaimage = await eda.pcb_MathPolygon.convertImageToComplexPolygon(blob, size.width, size.height, 0.5, 0.5, 0, 0, true, false);
		const point = await eda.pcb_SelectControl.getCurrentMousePosition();
		eda.pcb_PrimitiveImage.create(
			point.x,
			point.y,
			edaimage,
			EPCB_LayerId.TOP_SILKSCREEN,
			size.width,
			size.height,
			0,
			false,
			false,
		);
	};
})();
