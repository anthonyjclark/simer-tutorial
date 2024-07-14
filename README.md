# SimER Tutorial

Files for the **Simulation in Evolutionary Robotics** Tutorial.


TODO:
- discuss feasibility and "gradients"
- simulating stiff springs (tough)
- simulation parameter scaling (look at ODE notes)
- add full dart example for ugv with suspension
- advice on gnu parallel (experiment sweep and parameter sweep)
- advice on abstractions (eg, spherical wheels)
- relationship to EPS
- multi-evaluation (eg, for initial conditions)
- for demo2, add feedback in form of distance sensor? (can no longer use analytical solution) or just air resistance?
- add time scrubber to closed-form demo
- do you need to simulate a motor's electromechanical properties?
- implicit vs explicit integration and integrators
- Euler integration is bad when acceleration is non-zero (and you care about position)
- semi-implicit Euler (update velocity first)
- keep moving objects in range 0.1 to 10 meters (1 meters is sweet spot)
- wmr on incline (easier with numerical if you care about power)
- closed-form (no suspension, no friction, etc.)
- faster than real time
- FIX: evaluate in diagram
- single step obstacle and then wall
- early stopping simulation/evaluation: stuck, flipped, etc.
  - want a good gradient
- early stopping evolution: no progress, etc.\
- turn wall into child or old lady
- full example
  - box2d?
  - visualize in review
  - plots (fitness, parallel coordinates, etc.)

Tutorial:

1. plan: length, radius, suspension; minimize size; maximize position and time
2. closed-form
   1. easy
   2. add wall
   3. stop in front of without collision? (braitenberg vehicle)
   4. add feedback control?? (too hard)
3. numerical
   1. add incline (friction; hard for Explicit Euler)
   2. add suspension?? additional walls?? different inclines?? obstacles?? (too hard)
4. rigid-body



https://lobste.rs/s/5rmn4y/fixing_iterative_damping_interpolation
https://app.scribbler.live/#./examples/Numerical-Analysis-Recipes.jsnb
https://app.scribbler.live/#./examples/Regula-Falsi.jsnb
https://app.scribbler.live/#./examples/Runge-Kutta-for-Differential-Equations.jsnb


lerp from Freya Holmer

```text
expDecay(a, b, decay, dt) {
    return b + (a - b) * exp(-decay*dt)
}

decay = 16 # 1 to 25
update() {
    a = expDecay(a, b, decay, Time.deltaTime)
}
```

Autonomous first-order differential equation

And second order

y'' + 2 blah w y' + w^2 y = 0
