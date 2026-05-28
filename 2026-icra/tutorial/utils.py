from pathlib import Path

from dataclasses import dataclass
from math import pi

import newton
import rich
import warp as wp

# Hack for generating tutorial website
# Only import sphinx if running on local machine (check hostname)
import platform
if platform.node().startswith("AJC"):
    import sphinx  # noqa: F401 for generating the tutorial website


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


@dataclass
class FrankaEmikaPandaConfig:
    FINGER_CLOSED = 0.0
    FINGER_OPEN = 0.04

    HOME_Q_ARM = [0.0, 0.02, 0.0, -2.37, 0.0, 2.39, pi / 4]
    HOME_Q_GRIPPER = [FINGER_OPEN, FINGER_OPEN]
    HOME_Q = HOME_Q_ARM + HOME_Q_GRIPPER

    DOF_COUNT = len(HOME_Q)
    ARM_DOF_COUNT = len(HOME_Q_ARM)

    EFFORT_LIMITS = [87, 87, 87, 87, 12, 12, 12, 100, 100]
    MUJOCO_ARMATURE = [0.195] * 4 + [0.074] * 3 + [0.1] * 2

    TARGET_KE = [900, 900, 700, 700, 400, 400, 400, 100, 100]
    TARGET_KD = [90, 90, 70, 70, 40, 40, 40, 10, 10]
    BODY_GRAVCOMP = 1.0


def enable_target_control(builder):
    """Enable position targets and MuJoCo gravity compensation for Franka."""
    builder.joint_target_pos[:_config.DOF_COUNT] = _config.HOME_Q
    builder.joint_target_ke[:_config.DOF_COUNT] = _config.TARGET_KE
    builder.joint_target_kd[:_config.DOF_COUNT] = _config.TARGET_KD

    joint_actgravcomp = builder.custom_attributes["mujoco:jnt_actgravcomp"].values
    for dof_index in range(_config.DOF_COUNT):
        joint_actgravcomp[dof_index] = True

    body_gravcomp = builder.custom_attributes["mujoco:gravcomp"].values
    for body_index, label in enumerate(builder.body_label):
        if label.startswith("fr3/") and label not in {"fr3/base", "fr3/fr3_link0"}:
            body_gravcomp[body_index] = _config.BODY_GRAVCOMP

def set_initial_state(builder):
    """Set the initial joint positions and armature."""
    builder.joint_q[:_config.DOF_COUNT] = _config.HOME_Q
    builder.joint_effort_limit[:_config.DOF_COUNT] = _config.EFFORT_LIMITS
    builder.joint_armature[:_config.DOF_COUNT] = _config.MUJOCO_ARMATURE

_config = FrankaEmikaPandaConfig()
