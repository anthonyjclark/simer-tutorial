import { Body, Box, Circle, Edge, Vec2, WheelJoint, World } from 'planck';

export class WMR2D {

	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;

	drawScale: number;
	simWidth: number;
	simHeight: number;

	// Units in pixels
	groundLevelPixels = 200;

	// Units in meters, kilograms, seconds, and radians
	wheelRadius = 1.0;
	wheelInwardOffset = 0.1;
	chassisLength = 3.0;
	chassisHeight = 1.0;
	angularVelocity = 1.0;

	// Body poses
	// initialPosition = new Vec2( 3.0, this.wheelRadius + 0.001 );
	initialPosition = new Vec2( 3.0, this.wheelRadius * 2 );
	chassisPosition = this.initialPosition.clone();
	chassisAngle = 0.0;

	// Position the wheels near the front an  rear of the chassis
	wheelPositionFront: Vec2;
	wheelPositionRear: Vec2;

	wheelAngleFront = 0.0;
	wheelAngleRear = 0.0;

	time = 0.0;
	timeStep = 0.01;
	timeAccumulator = 0.0;

	world: World;
	ground: Body;
	chassis: Body;
	wheelFront: Body;
	wheelRear: Body;
	wheelMotorFront: WheelJoint;
	wheelMotorRear: WheelJoint;

	constructor( simMinWidth: number = 20.0 ) {

		// TODO: pass in canvas element or string id
		this.canvas = document.getElementById( 'wmr-canvas' ) as HTMLCanvasElement;
		this.context = this.canvas.getContext( '2d' ) as CanvasRenderingContext2D;

		// TODO: figure out proper padding/sizing
		this.canvas.width = window.innerWidth - 20;
		this.canvas.height = window.innerHeight - 100;

		// NOTE: scale is used to convert between simulation units and pixels
		this.drawScale = Math.min( this.canvas.width, this.canvas.height ) / simMinWidth;

		this.simWidth = this.canvas.width / this.drawScale;
		this.simHeight = this.canvas.height / this.drawScale;

		// Set initial poses and times
		this.wheelPositionFront = this.#wheelFromChassis( true );
		this.wheelPositionRear = this.#wheelFromChassis( false );

		// TODO: only if using physics engine

		this.world = new World( { gravity: new Vec2( 0.0, - 9.8 ) } );

		this.ground = this.world.createBody( {
			type: 'static',
			position: new Vec2( 0.0, 0.0 ),
			// TODO: incline?
			// angle: Math.PI * 0.1,
		} );

		// TODO: ground friction
		this.ground.createFixture( { shape: new Edge( new Vec2( - 100, 0 ), new Vec2( 100, 0 ) ) } );

		this.chassis = this.world.createBody( { type: 'dynamic', position: this.initialPosition } );

		// TODO: chassis friction and density
		this.chassis.createFixture( { shape: new Box( this.chassisLength / 2, this.chassisHeight / 2 ), density: 1.0, friction: 0.3 } );

		this.wheelFront = this.world.createBody( { type: 'dynamic', position: this.wheelPositionFront } );

		// TODO: wheel friction and density
		this.wheelFront.createFixture( { shape: new Circle( this.wheelRadius ), density: 1.0, friction: 0.3 } );

		this.wheelMotorFront = this.world.createJoint( new WheelJoint( {
			motorSpeed: 0.0,
			maxMotorTorque: 20.0,
			enableMotor: true,
			frequencyHz: 4.0,
			dampingRatio: 0.7,
		}, this.chassis, this.wheelFront, this.wheelFront.getPosition(), new Vec2( 0.0, 1.0 ) ) )!;

		this.wheelRear = this.world.createBody( { type: 'dynamic', position: this.wheelPositionRear } );

		this.wheelRear.createFixture( { shape: new Circle( this.wheelRadius ), density: 1.0, friction: 0.3 } );

		this.wheelMotorRear = this.world.createJoint( new WheelJoint( {
			motorSpeed: 0.0,
			maxMotorTorque: 20.0,
			enableMotor: true,
			frequencyHz: 4.0,
			dampingRatio: 0.7,
		}, this.chassis, this.wheelRear, this.wheelRear.getPosition(), new Vec2( 0.0, 1.0 ) ) )!;

		this.wheelMotorFront.setMotorSpeed( - 50 );

		// TODO: add a wall to demonstrate need for numerical integration

	}

	reset() {

		this.chassisPosition = this.initialPosition.clone();

		this.wheelPositionFront = new Vec2( - this.chassisLength / 2 + this.wheelInwardOffset, this.chassisPosition.y );
		this.wheelPositionRear = new Vec2( this.chassisLength / 2 - this.wheelInwardOffset, this.chassisPosition.y );

		this.wheelAngleFront = 0.0;
		this.wheelAngleRear = 0.0;

		this.time = 0.0;
		this.timeAccumulator = 0.0;

	}

	#xToPixel( x: number ): number {

		return x * this.drawScale;

	}

	#yToPixel( y: number ): number {

		return this.groundLevelPixels - y * this.drawScale;

	}

	#wheelFromChassis( isFront: boolean ): Vec2 {

		// TODO: handle incline

		let sign = isFront ? 1 : - 1;
		let xOffset = sign * ( this.chassisLength / 2 - this.wheelInwardOffset );

		return new Vec2( this.chassisPosition.x + xOffset, this.chassisPosition.y );

	}

	render( clear: boolean ) {

		if ( clear ) {

			this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );

		}

		// Draw the ground

		this.context.fillStyle = 'darkgray';
		this.context.fillRect( 0, this.groundLevelPixels, this.canvas.width, 4 );

		// Draw the rear and front wheels

		this.context.fillStyle = 'coral';

		let x = this.#xToPixel( this.wheelPositionFront.x );
		let y = this.#yToPixel( this.wheelPositionFront.y );
		this.#drawWheel( x, y, this.wheelAngleFront );

		x = this.#xToPixel( this.wheelPositionRear.x );
		y = this.#yToPixel( this.wheelPositionRear.y );
		this.#drawWheel( x, y, this.wheelAngleRear );

		// Draw the chassis

		x = this.#xToPixel( this.chassisPosition.x );
		y = this.#yToPixel( this.chassisPosition.y );
		this.#drawChassis();
		// this.context.beginPath();
		// this.context.arc( x, y, 5, 0, 2 * Math.PI );
		// this.context.stroke();

	}

	#drawWheel( x: number, y: number, angle: number ) {

		let radius = this.wheelRadius * this.drawScale;

		// Draw the front wheel
		this.context.beginPath();
		this.context.arc( x, y, radius, 0, 2 * Math.PI );
		this.context.stroke();

		// Draw spokes
		this.context.beginPath();
		this.context.moveTo( x, y );
		this.context.arc( x, y, radius, angle, angle + Math.PI / 6 );
		this.context.fill();

		angle += 2.0 * Math.PI / 3.0;
		this.context.beginPath();
		this.context.moveTo( x, y );
		this.context.arc( x, y, radius, angle, angle + Math.PI / 6 );
		this.context.fill();

		angle += 2.0 * Math.PI / 3.0;
		this.context.beginPath();
		this.context.moveTo( x, y );
		this.context.arc( x, y, radius, angle, angle + Math.PI / 6 );
		this.context.fill();

	}

	#drawChassis() {

		let width = this.chassisLength * this.drawScale;
		let height = this.wheelRadius * this.drawScale;

		let x = this.#xToPixel( this.chassisPosition.x );
		let y = this.#yToPixel( this.chassisPosition.y );
		let angle = this.chassisAngle;

		this.context.save();
		this.context.beginPath();
		this.context.translate( x, y );
		this.context.rotate( angle );
		this.context.rect( - width / 2, - height / 2, width, height );
		this.context.fillStyle = 'darkslateblue';
		this.context.fill();
		this.context.restore();

	}

	updatePositionClosedForm( frameTime: number ) {

		// TODO: take into account incline angle

		this.time += frameTime;

		// Set body pose

		// v = ω r
		// p = v t = ω r t
		this.chassisPosition.x = this.initialPosition.x + this.angularVelocity * this.wheelRadius * this.time;
		// this.chassisPosition.y = ...
		// this.chassisAngle = ...

		// Set front wheel pose

		this.wheelPositionFront = this.#wheelFromChassis( true );
		this.wheelAngleFront = this.angularVelocity * this.time;

		// Set rear wheel pose

		this.wheelPositionRear = this.#wheelFromChassis( false );
		this.wheelAngleRear = this.angularVelocity * this.time;

	}

	updatePositionNumerical( frameTime: number ) {

		// TODO: take into account incline angle

		this.timeAccumulator += frameTime;

		while ( this.timeAccumulator >= this.timeStep ) {

			// Explicit Euler integration (works because the angular velocity is constant)
			// v = ω r
			// p = v t = ω r t
			this.chassisPosition.x += this.angularVelocity * this.wheelRadius * this.timeStep;
			// this.chassisPosition.y = ...
			// this.chassisAngle = ...

			this.wheelAngleFront += this.angularVelocity * this.timeStep;
			this.wheelAngleRear += this.angularVelocity * this.timeStep;

			this.timeAccumulator -= this.timeStep;
			this.time += this.timeStep;

			// TODO: implement interpolation for smoother rendering when timeAccumulator > 0
			// https://gafferongames.com/post/fix_your_timestep/

		}

		// NOTE: we only need to update the wheel positions once per frame
		this.wheelPositionFront = this.#wheelFromChassis( true );
		this.wheelPositionRear = this.#wheelFromChassis( false );

	}

	updatePositionPhysicsEngine( frameTime: number ) {

		let velocityIterations = 8;
		let positionIterations = 3;

		this.timeAccumulator += frameTime;

		while ( this.timeAccumulator >= this.timeStep ) {

			this.world.step( this.timeStep, velocityIterations, positionIterations );

			this.timeAccumulator -= this.timeStep;
			this.time += this.timeStep;

		}

		// TODO:
		// set body pose
		// set front wheel pose
		// set rear wheel pose

		// NOTE: we only need to update poses once per frame

		this.chassisPosition = this.chassis.getPosition();
		this.chassisAngle = this.chassis.getAngle();

		this.wheelPositionFront = this.wheelFront.getPosition();
		this.wheelAngleFront = this.wheelFront.getAngle();

		this.wheelPositionRear = this.wheelRear.getPosition();
		this.wheelAngleRear = this.wheelRear.getAngle();

	}

	getTime(): number {

		return this.time;

	}

}
