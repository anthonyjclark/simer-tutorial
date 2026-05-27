import { Body, Box, Circle, Edge, Vec2, WheelJoint, World } from 'planck';

export enum WMR2DMode { Analytical, Numerical, RBDEngine }

export class WMRSimulator {

	wmr: WMR2D;
	wmrUpdate: ( time: number, dt: number ) => void;
	wmrSpeed: ( dist: number ) => void;

	prevTime = 0.0;
	time = 0.0;

	controlPeriod = 0.1;
	controlLastUpdate = 0.0;

	speedMax = 3.0;
	speedSlope = 2.0;
	speedIntercept = - 8.0;

	constructor( id: string, mode: WMR2DMode, { width = 20.0, addWall = false, addStep = false } = {} ) {

		this.wmr = new WMR2D( id, { width, addWall, addStep } );

		switch ( mode ) {

			case WMR2DMode.Analytical:
				this.wmrUpdate = ( time, _ ) => this.wmr.updatePositionAnalytical( time );
				this.wmrSpeed = _ => this.wmr.angularVelocity;
				break;

			case WMR2DMode.Numerical:
				this.wmrUpdate = ( _, dt ) => this.wmr.updatePositionNumerical( dt );
				this.wmrSpeed = dist => this.wmr.setWheelAngularVelocity( Math.max( - this.speedMax, Math.min( this.speedMax, this.speedSlope * dist + this.speedIntercept ) ) );
				break;

			case WMR2DMode.RBDEngine:
				this.wmrUpdate = ( _, dt ) => this.wmr.updatePositionRBDEngine( dt );
				this.wmrSpeed = dist => this.wmr.setWheelAngularVelocity( Math.max( - this.speedMax, Math.min( this.speedMax, this.speedSlope * dist + this.speedIntercept ) ) );
				break;

		}

	}

	step( now: number ) {

		if ( ! this.prevTime ) this.prevTime = now;
		const dt = ( now - this.prevTime );
		this.prevTime = now;

		this.time += dt;

		this.wmrUpdate( this.time, dt );

		this.wmr.render( true );

		if ( this.time >= this.controlLastUpdate ) {

			const dist = this.wmr.getDistanceToWall();
			this.wmrSpeed( dist );

			this.controlLastUpdate += this.controlPeriod;

		}

	}

	reset() {

		this.prevTime = 0.0;
		this.time = 0.0;
		this.controlLastUpdate = 0.0;

		this.wmr.reset();

	}

}

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
	wallPosition: number | undefined;
	wallThickness = 0.2;
	wallHeight = 6;

	// Sensor ray
	sensorStart: Vec2;
	sensorEnd: Vec2;
	sensorIsColliding = false;
	sensorYOffset = 0.75;
	sensorLimit = 10.0;

	// Step pose
	stepPosition: number | undefined;
	stepWidth = 2.0;
	stepHeight = 1.2;

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

	constructor( id: string, { width = 20.0, addWall = false, addStep = false } = {} ) {

		this.canvas = document.getElementById( id ) as HTMLCanvasElement;
		this.context = this.canvas.getContext( '2d' ) as CanvasRenderingContext2D;

		const parent = this.canvas.parentElement as HTMLElement;

		const padding = 20;

		this.canvas.width = parent.clientWidth - padding * 2;
		this.canvas.height = Math.min( 0.9 * window.innerHeight, this.canvas.width / 3.0 );

		this.groundLevelPixels = this.canvas.height - padding;

		// Scale is used to convert between simulation units and pixels
		// this.drawScale = Math.min( this.canvas.width, this.canvas.height ) / width;
		this.drawScale = this.canvas.width / width;

		// Useful for knowing the simulation bounds
		this.simWidth = this.canvas.width / this.drawScale;
		this.simHeight = this.canvas.height / this.drawScale;

		// Set initial poses and times
		this.wheelPositionFront = this.#wheelFromChassis( true );
		this.wheelPositionRear = this.#wheelFromChassis( false );

		// Physics engine setup

		this.world = new World( { gravity: new Vec2( 0.0, - 9.8 ) } );

		const groundFriction = 0.7;

		// TODO: incline?
		// angle: Math.PI * 0.1,
		this.ground = this.world.createBody( { type: 'static', position: new Vec2( 0.0, 0.0 ) } );
		this.ground.createFixture( { shape: new Edge( new Vec2( - 100, 0 ), new Vec2( 100, 0 ) ), friction: groundFriction } );

		const materialDensity = 0.7;
		const materialFriction = 0.3;

		// Chassis

		this.chassis = this.world.createBody( { type: 'dynamic', position: this.initialPosition } );
		this.chassis.createFixture( { shape: new Box( this.chassisLength / 2, this.chassisHeight / 2 ), density: materialDensity, friction: materialFriction } );

		// Front wheel

		this.wheelFront = this.world.createBody( { type: 'dynamic', position: this.wheelPositionFront } );
		this.wheelFront.createFixture( { shape: new Circle( this.wheelRadius ), density: materialDensity, friction: materialFriction } );

		const motorMaxTorque = 20.0;
		const suspensionHz = 4.0;
		const suspensionDampingRatio = 0.7;

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

		// Simulation boundary

		this.world.createBody( { type: 'static', position: new Vec2( this.simWidth, 0.0 ) } )
			.createFixture( { shape: new Edge( new Vec2( 0.0, 0.0 ), new Vec2( 0.0, this.simHeight ) ) } );

		// Wall

		if ( addWall ) {

			const wallPositionVec = new Vec2( this.simWidth * 0.9, 0.0 );

			this.wallPosition = wallPositionVec.x - this.wallThickness / 2;

			const wall = this.world.createBody( { type: 'static', position: wallPositionVec } );
			wall.createFixture( { shape: new Box( this.wallThickness / 2.0, 2.0 ) } );

		}

		this.sensorStart = new Vec2(
			this.chassisPosition.x + this.sensorYOffset * Math.sin( this.chassisAngle ),
			this.chassisPosition.y + this.sensorYOffset * Math.cos( this.chassisAngle ),
		);

		this.sensorEnd = new Vec2(
			this.sensorStart.x + this.sensorLimit * Math.cos( this.chassisAngle ),
			this.sensorStart.y - this.sensorLimit * Math.sin( this.chassisAngle ),
		);

		// Step

		if ( addStep ) {

			const stepPositionVec = new Vec2( this.simWidth * 0.5, 0 );

			this.stepPosition = stepPositionVec.x;

			// TODO: step friction
			const step = this.world.createBody( { type: 'static', position: stepPositionVec } );
			step.createFixture( { shape: new Box( this.stepWidth / 2, this.stepHeight / 2 ) } );

		}

	}

	reset() {

		this.chassisPosition = this.initialPosition.clone();
		this.chassisAngle = 0.0;

		// this.wheelPositionFront = new Vec2( - this.chassisLength / 2 + this.wheelInwardOffset, this.chassisPosition.y );
		this.wheelPositionFront = this.#wheelFromChassis( true );
		this.wheelAngleFront = 0.0;

		// this.wheelPositionRear = new Vec2( this.chassisLength / 2 - this.wheelInwardOffset, this.chassisPosition.y );
		this.wheelPositionRear = this.#wheelFromChassis( false );
		this.wheelAngleRear = 0.0;

		this.time = 0.0;
		this.timeAccumulator = 0.0;

		this.chassis.setPosition( this.chassisPosition );
		this.chassis.setAngle( 0 );
		this.chassis.setLinearVelocity( new Vec2( 0.0, 0.0 ) );
		this.chassis.setAngularVelocity( 0.0 );

		this.wheelFront.setPosition( this.wheelPositionFront );
		this.wheelFront.setAngle( 0 );
		this.wheelFront.setLinearVelocity( new Vec2( 0.0, 0.0 ) );
		this.wheelFront.setAngularVelocity( 0.0 );

		this.wheelRear.setPosition( this.wheelPositionRear );
		this.wheelRear.setAngle( 0 );
		this.wheelRear.setLinearVelocity( new Vec2( 0.0, 0.0 ) );
		this.wheelRear.setAngularVelocity( 0.0 );

	}

	#xToPixel( x: number ): number {

		return x * this.drawScale;

	}

	#yToPixel( y: number ): number {

		return this.groundLevelPixels - y * this.drawScale;

	}

	#dimToPixel( dim: number ): number {

		return dim * this.drawScale;

	}

	#wheelFromChassis( isFront: boolean ): Vec2 {

		// TODO: incline?

		const sign = isFront ? 1 : - 1;
		const xOffset = sign * ( this.chassisLength / 2 - this.wheelInwardOffset );

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

		if ( this.wallPosition !== undefined ) {

			const wallThickness = this.#dimToPixel( this.wallThickness );
			const wallHeight = 6;

			x = this.#xToPixel( this.wallPosition + this.wallThickness / 2 );
			y = this.#yToPixel( 0 );
			this.#drawBox( x, y, wallThickness, this.#dimToPixel( wallHeight ), 0.0, 'darkred' );

			// Draw the distance ray

			const sensorColor = this.sensorIsColliding ? 'red' : 'green';

			this.context.beginPath();
			this.context.moveTo( this.#xToPixel( this.sensorStart.x ), this.#yToPixel( this.sensorStart.y ) );
			this.context.lineTo( this.#xToPixel( this.sensorEnd.x ), this.#yToPixel( this.sensorEnd.y ) );
			this.context.strokeStyle = sensorColor;
			this.context.stroke();

			this.context.beginPath();
			this.context.arc( this.#xToPixel( this.sensorEnd.x ), this.#yToPixel( this.sensorEnd.y ), 5, 0, 2 * Math.PI );
			this.context.fillStyle = sensorColor;
			this.context.fill();

		}

		// Draw the step

		if ( this.stepPosition !== undefined ) {

			const stepWidth = this.#dimToPixel( this.stepWidth );
			const stepHeight = this.#dimToPixel( this.stepHeight );

			x = this.#xToPixel( this.stepPosition );
			y = this.#yToPixel( 0 );
			this.#drawBox( x, y, stepWidth, stepHeight, 0.0, 'darkgreen' );

		}

	}

	#drawWheel( x: number, y: number, angle: number ) {

		const radius = this.wheelRadius * this.drawScale;

		this.context.strokeStyle = 'black';

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

		const width = this.chassisLength * this.drawScale;
		const height = this.wheelRadius * this.drawScale;

		const x = this.#xToPixel( this.chassisPosition.x );
		const y = this.#yToPixel( this.chassisPosition.y );
		const angle = this.chassisAngle;

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

	#updateDistanceSensor() {

		if ( this.wallPosition !== undefined ) {

			this.sensorStart = new Vec2(
				this.chassisPosition.x + this.sensorYOffset * Math.sin( this.chassisAngle ),
				this.chassisPosition.y + this.sensorYOffset * Math.cos( this.chassisAngle ),
			);

			this.sensorEnd = new Vec2(
				this.sensorStart.x + this.sensorLimit * Math.cos( this.chassisAngle ),
				this.sensorStart.y - this.sensorLimit * Math.sin( this.chassisAngle ),
			);

			const p = this.sensorStart;
			const r = Vec2.sub( this.sensorEnd, this.sensorStart );
			const q = new Vec2( this.wallPosition, 0 );
			const s = new Vec2( 0, this.wallHeight / 2 );

			// Check line segment intersection
			// t = (q − p) × s / (r × s)
			// u = (q − p) × r / (r × s)
			const pq = Vec2.sub( q, p );
			const rxs = Vec2.cross( r, s );
			const t = Vec2.cross( pq, s ) / rxs;
			const u = Vec2.cross( pq, r ) / rxs;

			if ( t > 0 && t < 1 && u > 0 && u < 1 ) {

				this.sensorEnd = Vec2.add( p, Vec2.mul( r, t ) );
				this.sensorIsColliding = true;

			}

		}

	}

	updatePositionAnalytical( time: number ) {

		// TODO: incline?

		this.time = time;

		// Check for collision with wall and edge of simulation

		const frontWheelPosition = this.#wheelFromChassis( true );
		const frontWheelLeadingEdge = frontWheelPosition.x + this.wheelRadius;

		const distanceToWall = this.wallPosition === undefined ? Infinity : this.wallPosition - frontWheelLeadingEdge;
		const distanceToEdge = this.simWidth - frontWheelLeadingEdge;

		if ( distanceToWall > 0 && distanceToEdge > 0 ) {

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

		this.#updateDistanceSensor();

	}

	updatePositionNumerical( frameTime: number ) {

		// TODO: incline?

		this.timeAccumulator += frameTime;

		while ( this.timeAccumulator >= this.timeStep ) {

			// Check for collision with wall and edge of simulation

			const frontWheelPosition = this.#wheelFromChassis( true );
			const frontWheelLeadingEdge = frontWheelPosition.x + this.wheelRadius;

			const distanceToWall = this.wallPosition === undefined ? Infinity : this.wallPosition - frontWheelLeadingEdge;
			const distanceToEdge = this.simWidth - frontWheelLeadingEdge;

			if ( distanceToWall > 0 && distanceToEdge > 0 ) {

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

		this.#updateDistanceSensor();

	}

	updatePositionRBDEngine( frameTime: number ) {

		const velocityIterations = 8;
		const positionIterations = 3;

		this.timeAccumulator += frameTime;

		while ( this.timeAccumulator >= this.timeStep ) {

			this.world.step( this.timeStep, velocityIterations, positionIterations );

			this.timeAccumulator -= this.timeStep;
			this.time += this.timeStep;

		}

		// NOTE: we only need to update poses once per frame

		this.chassisPosition = this.chassis.getPosition();
		this.chassisAngle = - this.chassis.getAngle();

		this.wheelPositionFront = this.wheelFront.getPosition();
		this.wheelAngleFront = - this.wheelFront.getAngle();

		this.wheelPositionRear = this.wheelRear.getPosition();
		this.wheelAngleRear = - this.wheelRear.getAngle();

		this.#updateDistanceSensor();

	}

	getDistanceToWall(): number {

		return Vec2.sub( this.sensorEnd, this.sensorStart ).length();

	}

	setWheelAngularVelocity( angularVelocity: number ) {

		this.angularVelocity = angularVelocity;

		this.wheelMotorFront.setMotorSpeed( - angularVelocity );
		this.wheelMotorRear.setMotorSpeed( - angularVelocity );

	}

}
