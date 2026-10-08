from dataclasses import dataclass
from typing import Literal

import tyro


@dataclass
class Args:
    """Example using Lwmr environment."""

    # Simulation parameters
    quiet: bool = False
    seed: int = 47
    device: str = "cuda"
    viewer: Literal["viser", "gl", "none"] = "viser"
    """Visualization backend: a Viser recording, native OpenGL, or none."""

    # Simulation configuration parameters
    steps: int = 80
    num_worlds: int = 1
    add_step: bool = False
    fixed_base: bool = False

    # Robot configuration parameters
    num_legs: int = 0
    ch_width: float = 0.3
    ch_length: float = 0.15
    ch_height: float = 0.02
    ch_density: float = 1000.0
    wh_radius: float = 0.03
    wh_density: float = 1000.0
    lg_radius: float = 0.01
    lg_offset: float = 0.03


def main(args: Args) -> None:
    # Imports are here to speed help
    from time import perf_counter, sleep

    import gymnasium as gym
    import lwmr  # noqa: F401 <-- register the environment
    from lwmr import LwmrRobotConfig
    from lwmr.utils import control_sequence_generator
    from tqdm.auto import tqdm

    robot_config = LwmrRobotConfig(
        num_legs=args.num_legs,
        ch_width=args.ch_width,
        ch_length=args.ch_length,
        ch_height=args.ch_height,
        ch_density=args.ch_density,
        wh_radius=args.wh_radius,
        wh_density=args.wh_density,
        lg_radius=args.lg_radius,
        lg_offset=args.lg_offset,
    )

    env = gym.make(
        "lwmr/Lwmr-v0",
        render_mode=args.viewer,
        robot_config=robot_config,
        quiet=args.quiet,
        device=args.device,
        num_worlds=args.num_worlds,
        add_step=args.add_step,
        fixed_base=args.fixed_base,
    )

    frame_period = 1.0 / env.metadata["render_fps"]

    def throttle_frame(frame_start: float) -> None:
        sleep_time = frame_period - (perf_counter() - frame_start)
        if sleep_time > 0.0:
            sleep(sleep_time)

    lo, mid, hi = 0.0, 0.4, 1.0
    seq = [
        (hi, hi, hi, hi),  # forward
        (mid, hi, mid, hi),  # veer left
        (hi, hi, hi, hi),  # forward
        (hi, mid, hi, mid),  # veer right
        (lo, lo, lo, lo),  # stop
    ]

    restart_requested = False

    def request_restart() -> None:
        nonlocal restart_requested
        restart_requested = True

    try:
        while True:
            cmds = control_sequence_generator(seq, steps=40)
            observation, info = env.reset(seed=args.seed)

            viewer = env.unwrapped.viewer
            if args.viewer == "gl" and viewer is not None:
                viewer.set_reset_callback(request_restart)

            restart_requested = False

            with tqdm(total=args.steps) as progress:
                while progress.n < args.steps:
                    frame_start = perf_counter()

                    if viewer is None or viewer.should_step():
                        action = next(cmds)

                        # Ignoring terminated and truncated
                        observation, reward, terminated, truncated, info = env.step(action)
                        progress.update()

                    env.render()

                    if viewer is not None and (restart_requested or not viewer.is_running()):
                        break

                    if args.viewer == "gl":
                        throttle_frame(frame_start)

            if args.viewer != "gl" or viewer is None:
                break

            while viewer.is_running() and not restart_requested:
                frame_start = perf_counter()
                env.render()
                throttle_frame(frame_start)

            if not viewer.is_running():
                break
    finally:
        env.close()


if __name__ == "__main__":
    main(tyro.cli(Args))
