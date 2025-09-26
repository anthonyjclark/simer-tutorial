#!/bin/bash -l

#SBATCH --job-name="WMREvolution"
#SBATCH --time=2-00:00:00
#SBATCH --partition=amd
#SBATCH --nodes=5
#SBATCH --ntasks=10
#SBATCH --ntasks-per-node=2
#SBATCH --cpus-per-task=1
#SBATCH --mem-per-cpu=10GB
#SBATCH --mail-user=anthony.clark@pomona.edu
#SBATCH --mail-type=ALL
#SBATCH --err SLURM_ERROR_LOG.%j.%N.txt
#SBATCH --out SLURM_OUTPUT_LOG.%j.%N.txt

date
hostname

# Load conda and activate an environment
module load miniconda3
conda activate boxcarv2

POP_SIZE=100
NUM_GENERATIONS=100
NUM_TRIALS=10

slurm_args="--ntasks=1 --nodes=1 --exclusive"
cmd="python wmr_evolution.py"
cmd_args="--population_size $POP_SIZE --num_generations $NUM_GENERATIONS"

set -exuo pipefail

for trial in $(seq 1 $NUM_TRIALS); do
    srun $slurm_args $cmd "trial$trial" $cmd_args --seed $trial &
done
wait

date
