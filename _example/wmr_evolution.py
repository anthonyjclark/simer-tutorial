import json
from argparse import ArgumentParser
from collections import namedtuple
from math import inf
from operator import indexOf
from random import choice, gauss, random, sample, seed

import pandas as pd
from enlighten import get_manager
from wmr import WMR

arg_parser = ArgumentParser("Run an evolutionary algorithm to optimize a WMR.")

arg_parser.add_argument("name", type=str)
arg_parser.add_argument("--population_size", type=int, default=100)
arg_parser.add_argument("--num_generations", type=int, default=100)
arg_parser.add_argument("--seed", type=int, default=47)

args = arg_parser.parse_args()

seed(args.seed)

Genome = list[float]
Fitness = namedtuple("Fitness", ["feasibility", "objective"])
Individual = tuple[Genome, Fitness]
Population = list[Individual]


# Set default to -inf since we want to maximize
DEFAULT_FITNESS = Fitness(-inf, -inf)

GENOME_MAPPING = {
    "wheel_radius": (0.5, 1.5),
    "chassis_length": (1, 4),
    "suspension_frequency": (1, 8),
    "suspension_damping": (0.3, 0.9),
    "sensor_limit": (1, 15),
    "speed_max": (0, 10),
    "speed_slope": (0, 10),
    "speed_intercept": (-20, 20),
}

DURATION = 20
TIME_STEP = 0.01
CONTROL_STEP = 0.1

TARGET_LOCATION = 20
INITIAL_TARGET_DISTANCE = 17

SPEED_TOLERANCE = 0.05

STAGNATION_LIMIT = 100

MUTATION_RATE = 1 / len(GENOME_MAPPING)
MUTATION_SCALE = 0.08

TOURNAMENT_SIZE = 3


def clamp(lo: float, hi: float, value: float) -> float:
    return max(lo, min(hi, value))


# Scale from one range to another
def scale(
    from_lo: float, from_hi: float, to_lo: float, to_hi: float, value: float
) -> float:
    return to_lo + (to_hi - to_lo) * (value - from_lo) / (from_hi - from_lo)


def generate_genome() -> Genome:
    return [random() for _ in range(len(GENOME_MAPPING))]


def fitness_key(ind: Individual) -> Fitness:
    return ind[1]


def simulate(
    wheel_radius: float,
    chassis_length: float,
    suspension_frequency: float,
    suspension_damping: float,
    sensor_limit: float,
    speed_max: float,
    speed_slope: float,
    speed_intercept: float,
    visualize=False,
) -> dict:
    wmr = WMR(
        wheel_radius=wheel_radius,
        chassis_length=chassis_length,
        suspension_frequency=suspension_frequency,
        suspension_damping=suspension_damping,
        sensor_limit=sensor_limit,
        duration=DURATION,
        time_step=TIME_STEP,
        visualize=visualize,
    )

    next_control_time = 0.0

    NUM_STEPS = int(DURATION / TIME_STEP) + 1

    sim_info = {
        "distance": [],
        "speed": [],
        "contact": [],
        "location": [],
        "visualization": None,
    }

    for _ in range(NUM_STEPS):
        wmr.step()

        if wmr.time >= next_control_time:
            dist = wmr.sensor_distance

            speed = clamp(-speed_max, speed_max, dist * speed_slope + speed_intercept)
            wmr.set_angular_velocity(speed)

            next_control_time += CONTROL_STEP

        sim_info["distance"].append(wmr.sensor_distance)
        sim_info["speed"].append(wmr.angular_velocity)
        sim_info["contact"].append(wmr.contacting_wall())
        sim_info["location"].append(wmr.chassis.position.x)

    if visualize:
        sim_info["visualization"] = wmr.get_visualization_json()

    return sim_info


def fitness(genome: Genome, testing=False) -> tuple[Fitness, dict]:
    # TODO: save individual values

    # Scale genome to actual values
    params = {
        k: scale(0, 1, lo, hi, g)
        for (k, (lo, hi)), g in zip(GENOME_MAPPING.items(), genome)
    }

    # Check feasibility
    wheel_overlap = params["chassis_length"] / 2 - params["wheel_radius"]

    if wheel_overlap < 0:
        return Fitness(wheel_overlap, 0), {}

    # Simulate and evaluate

    sim_info: dict = simulate(visualize=testing, **params)
    n = len(sim_info["speed"])

    sim_info["objective"] = {}

    objective = 0

    # Minimize final distance from target
    distance_to_target = sim_info["location"][-1] - TARGET_LOCATION
    objective += 2 * (1 - abs(distance_to_target) / INITIAL_TARGET_DISTANCE)
    sim_info["objective"]["final_distance"] = distance_to_target

    # Penalize final velocity
    final_speed = sim_info["speed"][-1]
    objective += 1 - abs(final_speed) / GENOME_MAPPING["speed_max"][1]
    sim_info["objective"]["final_speed"] = final_speed

    # Penalize hitting the wall
    hit_wall = any(sim_info["contact"])
    objective += 0.5 * (1 - hit_wall)
    sim_info["objective"]["hit_wall"] = hit_wall

    # Minimize wheel radius (genome is already scaled 0 to 1)
    objective += 0.25 * (1 - genome[0])
    sim_info["objective"]["wheel_radius"] = params["wheel_radius"]

    # If at target, minimize time to rest
    near_zero = [abs(s) < SPEED_TOLERANCE for s in sim_info["speed"]]
    if False in near_zero:
        index = (n - indexOf(reversed(near_zero), False)) if near_zero[-1] else n
    else:
        index = n
    objective += 0.25 * (1 - (index / n))
    sim_info["objective"]["index_at_rest"] = index

    return Fitness(0, objective), sim_info


def initialize(size: int) -> Population:
    return [(generate_genome(), DEFAULT_FITNESS) for _ in range(size)]


def evaluate(pop: Population, manager) -> Population:
    progress = manager.counter(total=len(pop), desc="Evaluations", leave=False)

    evaluated_population = []
    for genome, _ in pop:
        evaluated_population.append((genome, fitness(genome)[0]))
        progress.update()

    progress.close(clear=True)

    return evaluated_population

    # return [(genome, fitness(genome)[0]) for genome, _ in pop]


def stop(pop: Population, *, _best=[Fitness(0, 0)], _counter=[0]) -> bool:
    best = max(fitness for _, fitness in pop if fitness)

    _best[0] = best if best > _best[0] else _best[0]

    if best < _best[0]:
        _best[0] = best
        _counter[0] = 0
    else:
        _counter[0] += 1

    if _counter[0] >= STAGNATION_LIMIT:
        return True

    return False


def tournament(pop: Population) -> Individual:
    return max(pop, key=fitness_key)


def select(pop: Population) -> Population:
    return [tournament(sample(pop, TOURNAMENT_SIZE)) for _ in range(len(pop))]


def mutate_gene(gene: float) -> float:
    return clamp(0, 1, gene + gauss(0, MUTATION_SCALE))


def mutate(genome: Genome) -> Genome:
    n = len(genome)
    # Genes to mutate, ensure at least one gene is mutated
    to_mutate = [i for i in range(n) if random() < MUTATION_RATE]
    to_mutate = to_mutate if len(to_mutate) else [choice(range(n))]
    return [mutate_gene(g) if i in to_mutate else g for i, g in enumerate(genome)]


def modify(pop: Population) -> Population:
    return [(mutate(genome), DEFAULT_FITNESS) for genome, _ in pop]


def combine(original: Population, children: Population) -> Population:
    # TODO: or just keep one elite and take the children?
    # n = len(original)
    # combined_pop = original + children
    # return sorted(combined_pop, key=fitness_key, reverse=True)[:n]
    best = max(original, key=fitness_key)
    return [best] + children[:-1]


def statistics(pop: Population) -> tuple[Fitness, Fitness, Fitness]:
    worst = min(pop, key=fitness_key)[1]
    best = max(pop, key=fitness_key)[1]
    average_feasibility = sum(fitness.feasibility for _, fitness in pop) / len(pop)
    average_objective = sum(fitness.objective for _, fitness in pop) / len(pop)
    average = Fitness(average_feasibility, average_objective)
    return worst, average, best


def main():
    df_generations = pd.DataFrame(
        columns=[
            "Worst Feasibility",
            "Average Feasibility",
            "Best Feasibility",
            "Worst Objective",
            "Average Objective",
            "Best Objective",
        ]
    )

    manager = get_manager()
    progress = manager.counter(total=args.num_generations + 1, desc="Generations")

    seed_values = {
        "wheel_radius": 1.2,
        "chassis_length": 3,
        "suspension_frequency": 4,
        "suspension_damping": 0.7,
        "sensor_limit": 10,
        "speed_max": 3,
        "speed_slope": 2,
        "speed_intercept": -15,
    }

    seed_genome = [
        scale(g[0], g[1], 0, 1, v)
        for g, v in zip(GENOME_MAPPING.values(), seed_values.values())
    ]

    # seed_fitness, seed_info = fitness(seed_genome, testing=True)
    # print(seed_fitness)
    # print(seed_info["objective"])
    # with open(f"{args.name}-seed-visualization.json", "w") as f:
    #     json.dump(seed_info["visualization"], f)
    # raise SystemExit

    population = initialize(args.population_size)
    population[0] = (seed_genome, DEFAULT_FITNESS)

    population = evaluate(population, manager)

    worst, average, best = statistics(population)

    progress.update()

    df_generations.loc[0] = [
        worst.feasibility,
        average.feasibility,
        best.feasibility,
        worst.objective,
        average.objective,
        best.objective,
    ]

    for generation in range(args.num_generations):
        if stop(population):
            break

        selected = select(population)
        children = modify(selected)
        children = evaluate(children, manager)
        population = combine(population, children)

        worst, average, best = statistics(population)
        df_generations.loc[generation + 1] = [
            worst.feasibility,
            average.feasibility,
            best.feasibility,
            worst.objective,
            average.objective,
            best.objective,
        ]

        progress.update()

    df_generations.to_csv(f"{args.name}-generations.csv", index_label="Generation")

    pop_info = {
        k: [scale(0, 1, lo, hi, ind[i]) for ind, _ in population]
        for i, (k, (lo, hi)) in enumerate(GENOME_MAPPING.items())
    }

    # Add scaled values (good for parallel coordinates plot)
    pop_info.update(
        {
            f"{k}-genome": [ind[i] for ind, _ in population]
            for i, k in enumerate(GENOME_MAPPING.keys())
        }
    )

    pop_sim = [fitness(ind, testing=True) for ind, _ in population]
    pop_info["feasibility"] = [f.feasibility for f, _ in pop_sim]
    pop_info["objective"] = [f.objective for f, _ in pop_sim]
    pop_info["final_distance"] = [i["objective"]["final_distance"] for _, i in pop_sim]
    pop_info["final_speed"] = [i["objective"]["final_speed"] for _, i in pop_sim]
    pop_info["hit_wall"] = [i["objective"]["hit_wall"] for _, i in pop_sim]
    pop_info["wheel_radius"] = [i["objective"]["wheel_radius"] for _, i in pop_sim]
    pop_info["index_at_rest"] = [i["objective"]["index_at_rest"] for _, i in pop_sim]

    pd.DataFrame(pop_info).to_csv(
        f"{args.name}-population.csv", index_label="Individual"
    )

    best_individual = max(population, key=fitness_key)
    best_fitness, best_info = fitness(best_individual[0], testing=True)

    print(args.name)
    print(best_fitness)
    print(best_info["objective"])

    with open(f"{args.name}-visualization.json", "w") as f:
        json.dump(best_info["visualization"], f)

    progress.close()
    manager.stop()


if __name__ == "__main__":
    main()
