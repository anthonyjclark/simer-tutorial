from dataclasses import dataclass

import gymnasium as gym
import lwmr  # noqa: F401  # registers "lwmr/Lwmr-v0"
import tyro
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import SubprocVecEnv
from tqdm.auto import trange


@dataclass
class Args:
    """Example using Lwmr environment."""

    quiet: bool = True
    seed: int = 47
    device: str = "cpu"

    n_envs: int = 8
    n_steps: int = 512
    total_timesteps: int = 1_000_000

    model_path: str = "ppo_lwmr"
    eval_steps: int = 100


# SubprocVecEnv requires the script to use __main__
if __name__ == "__main__":
    args = tyro.cli(Args)

    verbose = 0 if args.quiet else 1

    env_kwargs = {"quiet": args.quiet, "render_mode": "none"}
    env = make_vec_env("lwmr/Lwmr-v0", n_envs=args.n_envs, vec_env_cls=SubprocVecEnv, env_kwargs=env_kwargs)
    model = PPO("MlpPolicy", env, n_steps=args.n_steps, verbose=verbose, device=args.device)
    model.learn(total_timesteps=args.total_timesteps, progress_bar=True)
    model.save(args.model_path)

    env = gym.make("lwmr/Lwmr-v0", quiet=True, render_mode="viser")
    model = PPO.load(args.model_path, device=args.device)

    obs = env.reset()
    obs = obs[0]
    for _ in trange(args.eval_steps):
        action, _ = model.predict(obs, deterministic=True)
        obs, reward, dones, info, blah = env.step(action)
        env.render()

    env.close()
