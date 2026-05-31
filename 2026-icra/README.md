# Notes

TODO:
- makefile should download notebooks from lwmr
- add videos of real robot and simulation
- look into newton docs for exporting notebooks with viser
- add diagram for SAPIEN/maniskill
- difference between newton, mujoco, mjx, mjwarp, physx


## Plan

1. Introduce myself and Neil
   1. Player stage, Webots, Gazebo, etc.
2. Introduce tooling (Pixi, uv, etc.)
3. Show simple demos (e.g. spinning cube, pendulum, etc.)
4. Show more complex demos (e.g. quadruped, humanoid, etc.)
5. Show how to use Viser viewer (visualization is important for workflow)
6. Show how to use the builder API to create custom models
7. Show how to use the API to run simulations and visualize results
8. Show how to use the API to do optimization and control
9. System identification with motion capture data
10. SLURM

Pre-poll
- What have you used for simulation?
- What is your current experience level (undergraduate, graduate, industry, etc.)?
- What is your area of robotics or research (e.g. manipulation, locomotion, etc.)?

## Notes

- issacsim, issaclab, newton, warp, mujoco, physx, mjx, mjwarp

Things to add

- headless rendering and web-based rendering
- converting among different formats (e.g. SDF to URDF)

Building

- cable sleeves with heat shrink

- How to use Viser viewer (visualization is important for workflow)
- Multiple worlds vs make_vec


```bash
# Clone this repository
git clone ...

# Install dependencies
uv sync
source .venv/bin/activate.fish

make
```

```python
uv add nbsphinx
python -m sphinx.cmd.quickstart
# Edit your conf.py and add 'nbsphinx' to extensions.
# Edit your index.rst and add the names of your *.ipynb files to the toctree.
viser-build-client --out-dir _static/viser
make html # or python -m sphinx . _build -j4
cp notebooks/docs/_static/*.viser _build/html/_static/
python -m http.server --directory _build/html
# From project root
cp -r _tutorial/_build/html _site/tutorial
```


- sim video
- real video
- survey
- slides/intro
