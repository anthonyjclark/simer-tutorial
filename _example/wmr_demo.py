from sys import argv

from wmr import WMR, linspace

wheel_radius = 1.2
chassis_length = 3

suspension_frequency = 4
suspension_damping = 0.7

duration = 20
time_step = 0.01

control_step = 0.1
next_control_time = 0.0

sensor_limit = 10

speed_max = 3
speed_slope = 2
speed_intercept = -15

wmr = WMR(
    wheel_radius=wheel_radius,
    chassis_length=chassis_length,
    suspension_frequency=suspension_frequency,
    suspension_damping=suspension_damping,
    sensor_limit=sensor_limit,
    duration=duration,
    time_step=time_step,
    visualize=True,
)

distances = [wmr.sensor_distance]
speeds = [wmr.angular_velocity]
contact = [wmr.contacting_wall()]

NUM_STEPS = int(duration / time_step) + 1
for step in range(NUM_STEPS):
    wmr.step()

    if wmr.time >= next_control_time:
        dist = wmr.sensor_distance

        speed = max(-speed_max, min(speed_max, dist * speed_slope + speed_intercept))
        wmr.set_angular_velocity(speed)

        next_control_time += control_step

    distances.append(wmr.sensor_distance)
    speeds.append(wmr.angular_velocity)
    contact.append(wmr.contacting_wall())

if len(argv) > 1:
    import plotext as plt

    x = linspace(0, duration, NUM_STEPS)

    y = distances
    y_label = "Distance"
    t = "Distance to Wall"

    if argv[1] == "speed":
        y = speeds
        y_label = "Angular Velocity"
        t = "Angular Velocity"

    elif argv[1] == "contact":
        y = contact
        y_label = "Contact"
        t = "Contacting Wall"

    plt.plot(x, y)

    plt.title(t)
    plt.xlabel("Time")
    plt.ylabel(y_label)
    plt.show()

else:
    print(wmr.get_visualization())
