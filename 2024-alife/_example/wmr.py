from __future__ import annotations

from enum import Enum
from math import cos, inf, pi, sin

from Box2D import b2Contact, b2ContactListener, b2Vec2, b2World
from reviewlogger import Logger

Position = tuple[float, float]

RGBA = tuple[float, float, float, float]


def rgb_to_floats(r: int, g: int, b: int, a: int = 255) -> RGBA:
    return (r / 255, g / 255, b / 255, a / 255)


COLOR_PERIWINKLE = rgb_to_floats(195, 190, 247)
COLOR_SANDY_BROWN = rgb_to_floats(252, 159, 91)
COLOR_BRIGHT_PINK = rgb_to_floats(234, 82, 111)
COLOR_ROYAL_BLUE = rgb_to_floats(42, 42, 114)
COLOR_CELADON = rgb_to_floats(179, 222, 193)

# Fixed physical properties

GROUND_FRICTION = 0.7
GROUND_EXTENT = 100

WMR_DENSITY = 0.7
WMR_FRICTION = 0.3
WMR_X_OFFSET = 3
WMR_Y_OFFSET = 0.1

SENSOR_Y_OFFSET = 0.75

WALL_POSITION_X = 25
WALL_POSITION = (WALL_POSITION_X, 0)
WALL_HEIGHT = 3
WALL_COLOR = COLOR_BRIGHT_PINK

STEP_POSITION_X = 10
STEP_POSITION = (STEP_POSITION_X, 0)
STEP_LENGTH = 2
STEP_HEIGHT = 1.2
STEP_COLOR = COLOR_SANDY_BROWN

# CHASSIS_HEIGHT = 1
CHASSIS_COLOR = COLOR_CELADON

# TODO: add into evolution or just remove
# WHEEL_INWARD_OFFSET = 0.1
WHEEL_INWARD_OFFSET = 0
WHEEL_COLOR = COLOR_PERIWINKLE

MOTOR_MAX_TORQUE = 10
SENSOR_COLOR = COLOR_ROYAL_BLUE

VIS_CHASSIS_WIDTH = 3.25
VIS_WHEEL_THICKNESS = 0.8


class Side(Enum):
    FRONT = 1
    REAR = 2


def linspace(start, stop, num):
    return [start + (stop - start) * i / (num - 1) for i in range(num)]


def wheel_from_chassis(side: Side, position: Position, length: float) -> Position:
    sign = 1 if side == Side.FRONT else -1
    x_offset = sign * (length / 2 - WHEEL_INWARD_OFFSET)
    return (position[0] + x_offset, position[1])


def convert_angle_to_quaternion(angle):
    half_angle = angle / 2
    return (0, 0, sin(half_angle), cos(half_angle))


def intersection(p, r, q, s) -> b2Vec2 | None:
    pq = q - p
    rxs = b2Vec2.cross(r, s)

    # Handle case where lines are parallel with ternary
    t = b2Vec2.cross(pq, s) / rxs if rxs else -1
    u = b2Vec2.cross(pq, r) / rxs if rxs else -1
    i = p + t * r if 0 <= t <= 1 and 0 <= u <= 1 else None

    return i


def intersection_distance(p, r, q, s) -> tuple[b2Vec2 | None, float]:
    i = intersection(p, r, q, s)
    return i, (i - p).length if i else inf


class ContactCallback(b2ContactListener):
    def __init__(self, tag_a, tag_b):
        super().__init__()
        self.a = tag_a
        self.b = tag_b
        self.contact = False

    def BeginContact(self, contact: b2Contact):
        if (contact.fixtureA.body.userData == self.a) and (
            contact.fixtureB.body.userData == self.b
        ):
            self.contact = True

    def EndContact(self, contact: b2Contact):
        if (contact.fixtureA.body.userData == self.a) and (
            contact.fixtureB.body.userData == self.b
        ):
            self.contact = False


class WMR:
    def __init__(
        self,
        *,
        wheel_radius: float,
        chassis_length: float,
        suspension_frequency: float,
        suspension_damping: float,
        sensor_limit: float,
        duration: float,
        time_step: float,
        visualize: bool = False,
    ):
        self.chassis_position_init = (WMR_X_OFFSET, wheel_radius + WMR_Y_OFFSET)

        self.wheel_radius = wheel_radius
        self.chassis_length = chassis_length
        self.chassis_height = min(1, 1.1 * wheel_radius)
        self.sensor_limit = sensor_limit

        self.angular_velocity = 0

        # Create the Box2D world

        self.world = b2World(gravity=(0, -9.8))

        # Create the ground

        ground = self.world.CreateStaticBody()
        ground.CreateEdgeFixture(
            vertices=[(-GROUND_EXTENT, 0), (GROUND_EXTENT, 0)], friction=GROUND_FRICTION
        )

        # Create the wall

        wall = self.world.CreateStaticBody(position=WALL_POSITION)
        wall.CreateEdgeFixture(vertices=[(0, 0), (0, WALL_HEIGHT)])

        # Create the step

        step = self.world.CreateStaticBody(position=STEP_POSITION)
        step.CreatePolygonFixture(
            box=(STEP_LENGTH / 2, STEP_HEIGHT / 2), friction=GROUND_FRICTION
        )

        # Create the chassis

        self.chassis = self.world.CreateDynamicBody(position=self.chassis_position_init)
        self.chassis.CreatePolygonFixture(
            box=(chassis_length / 2, self.chassis_height / 2),
            friction=WMR_FRICTION,
            density=WMR_DENSITY,
        )

        # Create the front wheel

        wheel_position_front = wheel_from_chassis(
            side=Side.FRONT, position=self.chassis_position_init, length=chassis_length
        )

        self.wheel_front = self.world.CreateDynamicBody(position=wheel_position_front)
        self.wheel_front.CreateCircleFixture(
            radius=self.wheel_radius, friction=WMR_FRICTION, density=WMR_DENSITY
        )

        # Create contact listener for the front wheel and the wall

        wall.userData = "wall"
        self.wheel_front.userData = "wmr"
        self.world.contactListener = ContactCallback(
            wall.userData, self.wheel_front.userData
        )

        # Create the rear wheel

        wheel_position_rear = wheel_from_chassis(
            side=Side.REAR, position=self.chassis_position_init, length=chassis_length
        )

        self.wheel_rear = self.world.CreateDynamicBody(position=wheel_position_rear)
        self.wheel_rear.CreateCircleFixture(
            radius=wheel_radius, friction=WMR_FRICTION, density=WMR_DENSITY
        )

        # Create the wheel joints (motors)

        self.wheel_front_motor = self.world.CreateWheelJoint(
            bodyA=self.chassis,
            bodyB=self.wheel_front,
            anchor=wheel_position_front,
            axis=(0, 1),
            motorSpeed=self.angular_velocity,
            enableMotor=True,
            maxMotorTorque=MOTOR_MAX_TORQUE,
            frequencyHz=suspension_frequency,
            dampingRatio=suspension_damping,
        )

        self.wheel_rear_motor = self.world.CreateWheelJoint(
            bodyA=self.chassis,
            bodyB=self.wheel_rear,
            anchor=wheel_position_rear,
            axis=(0, 1),
            motorSpeed=self.angular_velocity,
            enableMotor=True,
            maxMotorTorque=MOTOR_MAX_TORQUE,
            frequencyHz=suspension_frequency,
            dampingRatio=suspension_damping,
        )

        # self.wheel_front_motor.motorSpeed = -self.angular_velocity
        # self.wheel_rear_motor.motorSpeed = -angular_velocity

        self.duration = duration
        self.time_step = time_step
        self.time = 0

        self.VELOCITY_ITERATIONS = 8
        self.POSITION_ITERATIONS = 3

        self.update_distance_sensor()

        self.visualize = visualize
        if self.visualize:
            self.setup_visualization()

    def setup_visualization(self):
        self.VIS_STEP = 0.1
        self.next_vis_time = self.VIS_STEP

        self.VIS_WALL_THICKNESS = 1
        self.VIS_WALL_WIDTH = VIS_CHASSIS_WIDTH * 1.5

        self.VIS_STEP_WIDTH = VIS_CHASSIS_WIDTH * 1.5

        self.VIS_SENSOR_TIP = 0.1

        self.logger = Logger("WMR", self.VIS_STEP)

        # Review uses x-forward, y-up, z-right

        self.logger.add_box(
            "wall",
            self.VIS_WALL_THICKNESS,
            WALL_HEIGHT,
            self.VIS_WALL_WIDTH,
            WALL_COLOR,
        )

        self.logger.add_box(
            "step", STEP_LENGTH, STEP_HEIGHT / 2, self.VIS_STEP_WIDTH, STEP_COLOR
        )

        self.logger.add_box(
            "chassis",
            self.chassis_length,
            self.chassis_height,
            VIS_CHASSIS_WIDTH,
            CHASSIS_COLOR,
        )

        self.logger.add_cylinder("sensor", 0.05, 10, SENSOR_COLOR)
        self.logger.add_sphere("tip_colliding", self.VIS_SENSOR_TIP, (1, 1, 0, 1))
        self.logger.add_sphere("tip_not_colliding", self.VIS_SENSOR_TIP, SENSOR_COLOR)

        self.logger.add_ellipsoid(
            "wheel_front",
            self.wheel_radius * 2,
            VIS_WHEEL_THICKNESS,
            self.wheel_radius * 2,
            WHEEL_COLOR,
        )

        self.logger.add_ellipsoid(
            "wheel_front2",
            self.wheel_radius * 2,
            VIS_WHEEL_THICKNESS,
            self.wheel_radius * 2,
            WHEEL_COLOR,
        )

        self.logger.add_ellipsoid(
            "wheel_rear",
            self.wheel_radius * 2,
            VIS_WHEEL_THICKNESS,
            self.wheel_radius * 2,
            WHEEL_COLOR,
        )

        self.logger.add_ellipsoid(
            "wheel_rear2",
            self.wheel_radius * 2,
            VIS_WHEEL_THICKNESS,
            self.wheel_radius * 2,
            WHEEL_COLOR,
        )

        self.add_logger_frame()

    def add_logger_frame(self):
        self.logger.new_frame()

        # Shift the wall based on its thickness
        wall_position_x = WALL_POSITION_X + self.VIS_WALL_THICKNESS / 2
        self.logger.add_to_frame(
            "wall", (wall_position_x, WALL_HEIGHT / 2, 0), (1, 0, 0, 0)
        )
        self.logger.add_to_frame(
            "step", (STEP_POSITION_X, STEP_HEIGHT / 4, 0), (1, 0, 0, 0)
        )

        angle = self.chassis.angle

        p = self.chassis.position
        r = convert_angle_to_quaternion(angle)
        self.logger.add_to_frame("chassis", (p.x, p.y, 0), r)

        # TODO: reduce length based on intersection point
        # tip = base + SENSOR_LIMIT * b2Vec2(cos(angle), -sin(angle))
        # mid = (base + tip) / 2
        base = self.chassis.position + SENSOR_Y_OFFSET * b2Vec2(sin(angle), cos(angle))
        mid_offset = self.sensor_limit / 2 * b2Vec2(cos(angle), sin(angle))
        p = base + mid_offset
        r = convert_angle_to_quaternion(angle + pi / 2)
        self.logger.add_to_frame("sensor", (p.x, p.y, 0), r)

        p = self.tip_position
        s = (self.VIS_SENSOR_TIP, self.VIS_SENSOR_TIP, self.VIS_SENSOR_TIP)
        colliding_scale = s if self.sensor_distance < self.sensor_limit else (0, 0, 0)
        self.logger.add_to_frame(
            "tip_colliding", (p.x, p.y, 0), (1, 0, 0, 0), colliding_scale
        )

        not_colliding_scale = (
            (0, 0, 0) if self.sensor_distance < self.sensor_limit else s
        )
        self.logger.add_to_frame(
            "tip_not_colliding", (p.x, p.y, 0), (1, 0, 0, 0), not_colliding_scale
        )

        p = self.wheel_front.position
        r = (0.707, 0, 0, 0.707)
        self.logger.add_to_frame("wheel_front", (p.x, p.y, -VIS_CHASSIS_WIDTH / 2), r)
        self.logger.add_to_frame("wheel_front2", (p.x, p.y, VIS_CHASSIS_WIDTH / 2), r)

        p = self.wheel_rear.position
        self.logger.add_to_frame("wheel_rear", (p.x, p.y, -VIS_CHASSIS_WIDTH / 2), r)
        self.logger.add_to_frame("wheel_rear2", (p.x, p.y, VIS_CHASSIS_WIDTH / 2), r)

    def update_distance_sensor(self):
        # TODO: use RayCase instead
        # https://github.com/pybox2d/pybox2d/blob/09643321fd363f0850087d1bde8af3f4afd82163/library/Box2D/examples/box_cutter.py#L212
        # https://github.com/pybox2d/pybox2d/blob/09643321fd363f0850087d1bde8af3f4afd82163/library/Box2D/examples/edge_shapes.py#L51

        angle = self.chassis.angle
        position = self.chassis.position

        sensor_base = position + SENSOR_Y_OFFSET * b2Vec2(sin(angle), cos(angle))
        sensor_tip = sensor_base + self.sensor_limit * b2Vec2(cos(angle), sin(angle))
        sensor = sensor_tip - sensor_base

        wall_base = b2Vec2(WALL_POSITION_X, 0)
        wall_top = b2Vec2(WALL_POSITION_X, WALL_HEIGHT)
        wall = wall_top - wall_base

        wall_intersection, wall_distance = intersection_distance(
            sensor_base, sensor, wall_base, wall
        )

        ground_base = b2Vec2(0, 0)
        ground_end = b2Vec2(GROUND_EXTENT, 0)
        ground = ground_end - ground_base

        ground_intersection, ground_distance = intersection_distance(
            sensor_base, sensor, ground_base, ground
        )

        if wall_intersection and wall_distance < ground_distance:
            self.tip_position = wall_intersection
        elif ground_intersection and ground_distance < self.sensor_limit:
            self.tip_position = ground_intersection
        else:
            self.tip_position = sensor_tip

        self.sensor_distance = min(self.sensor_limit, wall_distance, ground_distance)

    def step(self) -> bool:
        self.world.Step(
            self.time_step, self.VELOCITY_ITERATIONS, self.POSITION_ITERATIONS
        )

        self.update_distance_sensor()

        self.time += self.time_step

        if self.visualize and (
            self.time >= self.next_vis_time or self.time >= self.duration
        ):
            self.add_logger_frame()
            self.next_vis_time += self.VIS_STEP

        return self.time >= self.duration

    def set_angular_velocity(self, angular_velocity: float):
        self.angular_velocity = angular_velocity
        self.wheel_front_motor.motorSpeed = -angular_velocity
        self.wheel_rear_motor.motorSpeed = -angular_velocity

    def contacting_wall(self) -> bool:
        return self.world.contactListener.contact

    def get_visualization(self) -> str:
        if not self.visualize:
            raise ValueError("Visualization was not enabled")
        return str(self.logger)

    def get_visualization_json(self) -> dict:
        if not self.visualize:
            raise ValueError("Visualization was not enabled")
        return self.logger.to_json()
