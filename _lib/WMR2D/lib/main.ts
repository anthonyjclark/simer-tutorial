import { Body, Box, Circle, Edge, Vec2, WheelJoint, World } from 'planck';

export class WMR2D {

	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;

	drawScale: number;
	simWidth: number;
	simHeight: number;

	// Units in pixels
	groundLevelPixels: number;

	// Units in meters, kilograms, seconds, and radians
	wheelRadius = 1.0;
	wheelInwardOffset = 0.1;
	chassisLength = 3.0;
	chassisHeight = 1.0;
	angularVelocity = 3.0;

	// Body poses
	initialPosition = new Vec2( 3.0, this.wheelRadius + 0.01 );
	chassisPosition = this.initialPosition.clone();
	chassisAngle = 0.0;

	// Position the wheels near the front an  rear of the chassis
	wheelPositionFront: Vec2;
	wheelPositionRear: Vec2;

	wheelAngleFront = 0.0;
	wheelAngleRear = 0.0;

	// Wall pose
	wallPosition: Vec2;

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

	constructor( id: string, simMinWidth: number = 10.0 ) {

		this.canvas = document.getElementById( id ) as HTMLCanvasElement;
		this.context = this.canvas.getContext( '2d' ) as CanvasRenderingContext2D;

		let parent = this.canvas.parentElement as HTMLElement;

		let padding = 20;

		this.canvas.width = parent.clientWidth - padding * 2;
		this.canvas.height = Math.min( 0.75 * window.innerHeight, this.canvas.width / 2.0 );

		this.groundLevelPixels = this.canvas.height - padding;

		// Scale is used to convert between simulation units and pixels
		this.drawScale = Math.min( this.canvas.width, this.canvas.height ) / simMinWidth;

		// Useful for knowing the simulation bounds
		this.simWidth = this.canvas.width / this.drawScale;
		this.simHeight = this.canvas.height / this.drawScale;

		// Set initial poses and times
		this.wheelPositionFront = this.#wheelFromChassis( true );
		this.wheelPositionRear = this.#wheelFromChassis( false );

		// Physics engine setup

		this.world = new World( { gravity: new Vec2( 0.0, - 9.8 ) } );

		let groundFriction = 0.7;

		// TODO: incline?
		// angle: Math.PI * 0.1,
		this.ground = this.world.createBody( { type: 'static', position: new Vec2( 0.0, 0.0 ) } );
		this.ground.createFixture( { shape: new Edge( new Vec2( - 100, 0 ), new Vec2( 100, 0 ) ), friction: groundFriction } );

		let materialDensity = 0.7;
		let materialFriction = 0.3;

		// Chassis

		this.chassis = this.world.createBody( { type: 'dynamic', position: this.initialPosition } );
		this.chassis.createFixture( { shape: new Box( this.chassisLength / 2, this.chassisHeight / 2 ), density: materialDensity, friction: materialFriction } );

		// Front wheel

		this.wheelFront = this.world.createBody( { type: 'dynamic', position: this.wheelPositionFront } );
		this.wheelFront.createFixture( { shape: new Circle( this.wheelRadius ), density: materialDensity, friction: materialFriction } );

		let motorMaxTorque = 20.0;
		let suspensionHz = 4.0;
		let suspensionDampingRatio = 0.7;

		this.wheelMotorFront = this.world.createJoint( new WheelJoint( {
			motorSpeed: 0.0,
			enableMotor: true,
			maxMotorTorque: motorMaxTorque,
			frequencyHz: suspensionHz,
			dampingRatio: suspensionDampingRatio,
		}, this.chassis, this.wheelFront, this.wheelFront.getPosition(), new Vec2( 0.0, 1.0 ) ) )!;

		// Rear wheel

		this.wheelRear = this.world.createBody( { type: 'dynamic', position: this.wheelPositionRear } );

		this.wheelRear.createFixture( { shape: new Circle( this.wheelRadius ), density: materialDensity, friction: materialFriction } );

		this.wheelMotorRear = this.world.createJoint( new WheelJoint( {
			motorSpeed: 0.0,
			enableMotor: true,
			maxMotorTorque: motorMaxTorque,
			frequencyHz: suspensionHz,
			dampingRatio: suspensionDampingRatio,
		}, this.chassis, this.wheelRear, this.wheelRear.getPosition(), new Vec2( 0.0, 1.0 ) ) )!;

		this.wheelMotorFront.setMotorSpeed( - this.angularVelocity );
		this.wheelMotorRear.setMotorSpeed( - this.angularVelocity );

		// Wall

		this.wallPosition = new Vec2( this.simWidth * 0.6, 0.0 );
		let wall = this.world.createBody( { type: 'static', position: this.wallPosition } );
		wall.createFixture( { shape: new Box( 0.1, 2.0 ) } );

	}

	reset() {

		this.chassisPosition = this.initialPosition.clone();
		this.chassisAngle = 0.0;

		this.wheelPositionFront = new Vec2( - this.chassisLength / 2 + this.wheelInwardOffset, this.chassisPosition.y );
		this.wheelAngleFront = 0.0;

		this.wheelPositionRear = new Vec2( this.chassisLength / 2 - this.wheelInwardOffset, this.chassisPosition.y );
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

		// TODO: incline?

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

		// Draw the wall

		let wallThickness = 20;

		x = this.#xToPixel( this.wallPosition.x );
		y = this.#yToPixel( this.wallPosition.y );
		this.#drawBox( x + wallThickness / 2, y, wallThickness, 400, 0.0, 'darkred' );

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

		this.#drawBox( x, y, width, height, angle, 'darkslateblue' );

	}

	#drawBox( x: number, y: number, w: number, h: number, a: number, c: string ) {

		this.context.save();
		this.context.beginPath();
		this.context.translate( x, y );
		this.context.rotate( a );
		this.context.rect( - w / 2, - h / 2, w, h );
		this.context.fillStyle = c;
		this.context.fill();
		this.context.restore();

	}

	updatePositionClosedForm( frameTime: number ) {

		// TODO: incline?

		this.time += frameTime;

		// Check for collision with wall

		let possibleFrontWheelPosition = this.#wheelFromChassis( true );

		if ( ( possibleFrontWheelPosition.x + this.wheelRadius ) < this.wallPosition.x ) {

			// Set body pose

			// v = ω r
			// p = v t = ω r t
			this.chassisPosition.x = this.initialPosition.x + this.angularVelocity * this.wheelRadius * this.time;
			// this.chassisPosition.y = ...
			// this.chassisAngle = ...

		}

		// Set front wheel pose

		this.wheelPositionFront = this.#wheelFromChassis( true );
		this.wheelAngleFront = this.angularVelocity * this.time;

		// Set rear wheel pose

		this.wheelPositionRear = this.#wheelFromChassis( false );
		this.wheelAngleRear = this.angularVelocity * this.time;

	}

	updatePositionNumerical( frameTime: number ) {

		// TODO: incline?

		this.timeAccumulator += frameTime;

		while ( this.timeAccumulator >= this.timeStep ) {

			let possibleFrontWheelPosition = this.#wheelFromChassis( true );

			if ( ( possibleFrontWheelPosition.x + this.wheelRadius ) < this.wallPosition.x ) {

				// Set body pose

				// Explicit Euler integration (works because the angular velocity is constant)
				// v = ω r
				// p = v t = ω r t
				this.chassisPosition.x += this.angularVelocity * this.wheelRadius * this.timeStep;
				// this.chassisPosition.y = ...
				// this.chassisAngle = ...

			}

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

		// NOTE: we only need to update poses once per frame

		this.chassisPosition = this.chassis.getPosition();
		this.chassisAngle = this.chassis.getAngle();

		this.wheelPositionFront = this.wheelFront.getPosition();
		this.wheelAngleFront = - this.wheelFront.getAngle();

		this.wheelPositionRear = this.wheelRear.getPosition();
		this.wheelAngleRear = - this.wheelRear.getAngle();

	}

	getTime(): number {

		return this.time;

	}

}
