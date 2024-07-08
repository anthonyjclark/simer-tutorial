# SimER Tutorial

Files for the **Simulation in Evolutionary Robotics** Tutorial.


TODO:
- give overview of ER process
- we'll focus on the simulation side
- discuss feasibility and "gradients"
- research projects: theory vs application
- simulating stiff springs (tough)
- simulation parameter scaling (look at ODE notes)
- add full dart example for ugv with suspension
- advice on gnu parallel (experiment sweep and parameter sweep)
- advice on abstractions (eg, sphereical wheels)
- relationship to EPS
- multi-evaluation (eg, for initial conditions)
- for demo2, add feedback in form of distance sensor? (can no longer use analytical solution) or just air resistance?
- add time scrubber to closed-form demo

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
