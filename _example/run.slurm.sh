#!/bin/bash -l

#SBATCH --job-name="WMREvolution"
#SBATCH --time=2-00:00:00
#SBATCH --nodes=1
#SBATCH --partition=amd
#SBATCH --mem=40G
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

cmd="python wmr_evolution.py"
cmd_args="--population_size $POP_SIZE --num_generations $NUM_GENERATIONS"

set -exuo pipefail

for trial in {1..10}; do
    $cmd "trial$trial" $cmd_args --seed $trial &
done
wait

date
