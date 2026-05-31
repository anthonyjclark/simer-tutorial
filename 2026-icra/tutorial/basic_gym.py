from dataclasses import dataclass

import tyro
from lwmr import control_sequence_generator


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

    # Robot configuration parameters
    num_legs: int = 0


def main(args: Args) -> None:
    # Imports are here to speed help
    import gymnasium as gym
    import lwmr  # noqa: F401 <-- register the environment
    from lwmr import LwmrRobotConfig
    from tqdm.auto import trange

    robot_config = LwmrRobotConfig(num_legs=args.num_legs)

    env = gym.make(
        "lwmr/Lwmr-v0",
        render_mode="viser",
        robot_config=robot_config,
        quiet=args.quiet,
        device=args.device,
        num_worlds=args.num_worlds,
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
