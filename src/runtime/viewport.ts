type CameraLike = {
	aspect: number;
	updateProjectionMatrix: () => void;
};

type RendererLike = {
	setSize: (width: number, height: number) => void;
};

export function applyViewportResize(
	camera: CameraLike,
	renderer: RendererLike,
	width: number,
	height: number,
): void {
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setSize(width, height);
}
