from dataclasses import dataclass

import tyro


@dataclass
class Args:
    """Example using Lwmr environment."""

    # Simulation parameters
    quiet: bool = False
    seed: int = 47
    device: str = "cuda"

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
    import gymnasium as gym
    import lwmr  # noqa: F401 <-- register the environment
    from lwmr import LwmrRobotConfig
    from lwmr.utils import control_sequence_generator
    from tqdm.auto import trange

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
        render_mode="viser",
        robot_config=robot_config,
        quiet=args.quiet,
        device=args.device,
        num_worlds=args.num_worlds,
        add_step=args.add_step,
        fixed_base=args.fixed_base,
    )

    lo, mid, hi = 0.0, 0.4, 1.0
    seq = [
        (hi, hi, hi, hi),  # forward
        (mid, hi, mid, hi),  # veer left
        (hi, hi, hi, hi),  # forward
        (hi, mid, hi, mid),  # veer right
        (lo, lo, lo, lo),  # stop
    ]

    cmds = control_sequence_generator(seq, steps=40)

    observation, info = env.reset(seed=args.seed)

    for step in trange(args.steps):
        action = next(cmds)

        # Ignoring terminated and truncated
        observation, reward, terminated, truncated, info = env.step(action)

        env.render()

    env.close()


if __name__ == "__main__":
    main(tyro.cli(Args))
