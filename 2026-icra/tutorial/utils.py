from pathlib import Path

import newton
import rich
import sphinx  # noqa: F401 for generating the tutorial website
import warp as wp

# Path is hardcoded in Newton's viewer for generating docs
RECORDING_BASE_PATH = Path("docs/_static/")


def create_viewer(filename: str, model: newton.Model, quiet: bool = True) -> newton.viewer.ViewerViser:
    rec_path = str(RECORDING_BASE_PATH / f"{filename}.viser")
    i = 1
    while Path(rec_path).exists():
        rec_path = str(RECORDING_BASE_PATH / f"{filename}_{i:02d}.viser")
        i += 1

    if quiet:
        console = rich.get_console()
        with console.capture() as _:
            viewer = newton.viewer.ViewerViser(record_to_viser=rec_path, verbose=False)
    else:
        print(f"Recording to {rec_path}...")
        viewer = newton.viewer.ViewerViser(record_to_viser=rec_path, verbose=False)

    viewer.set_model(model)

    axes = [
        ("x-axes", (1.0, 0.0, 0.001)),
        ("y-axes", (0.0, 1.0, 0.001)),
        ("z-axes", (0.0, 0.0, 1.0)),
    ]

    # Add axes to the viewer for reference
    for label, axis in axes:
        starts = wp.array([wp.vec3(0, 0, 0.001)])
        ends = wp.array([wp.vec3(*axis)])
        viewer.log_arrows(label, starts, ends, axis, width=0.04)

    return viewer
