// TODO:
// -

export class WMR2D {

	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;

	drawScale: number;
	simWidth: number;
	simHeight: number;

	groundLevelPixels = 200;

	wheelRadius = 1.0;
	chassisLength = 3.0;
	wheelInwardOffset = 0.1;

	initialPosition = 3.0;

	angularVelocity = 1.0;
	angle = 0.0;
	position = this.initialPosition;

	time = 0.0;
	timeStep = 0.01;
	timeAccumulator = 0.0;

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

	}

	reset() {

		this.position = this.initialPosition;
		this.angle = 0.0;

		this.time = 0.0;
		this.timeAccumulator = 0.0;

	}

	render( clear: boolean ) {

		if ( clear ) {

			this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );

		}

		// Draw the ground
		this.context.fillRect( 0, this.groundLevelPixels, this.canvas.width, 4 );

		let chassisLengthPixels = this.chassisLength * this.drawScale;
		let chassisHeightPixels = this.wheelRadius * this.drawScale;
		let wheelRadiusPixels = this.wheelRadius * this.drawScale;

		// Draw the rear and front wheels

		let x = ( this.position + this.wheelInwardOffset ) * this.drawScale - chassisLengthPixels / 2;
		let y = this.groundLevelPixels - wheelRadiusPixels;

		this.context.fillStyle = 'coral';

		this.#drawWheel( x, y );

		x = ( this.position - this.wheelInwardOffset ) * this.drawScale + chassisLengthPixels / 2;
		this.#drawWheel( x, y );

		// Draw the chassis
		x = this.position * this.drawScale - chassisLengthPixels / 2;
		y = this.groundLevelPixels - wheelRadiusPixels - chassisHeightPixels / 2;

		this.context.fillStyle = 'darkslateblue';
		this.context.fillRect( x, y, chassisLengthPixels, chassisHeightPixels );

	}

	#drawWheel( x: number, y: number ) {

		let wheelRadiusPixels = this.wheelRadius * this.drawScale;

		// Draw the front wheel
		this.context.beginPath();
		this.context.arc( x, y, wheelRadiusPixels, 0, 2 * Math.PI );
		this.context.stroke();

		// Draw spokes
		let angle = this.angle;
		this.context.beginPath();
		this.context.moveTo( x, y );
		this.context.arc( x, y, wheelRadiusPixels, angle, angle + Math.PI / 6 );
		this.context.fill();

		angle += 2.0 * Math.PI / 3.0;
		this.context.beginPath();
		this.context.moveTo( x, y );
		this.context.arc( x, y, wheelRadiusPixels, angle, angle + Math.PI / 6 );
		this.context.fill();

		angle += 2.0 * Math.PI / 3.0;
		this.context.beginPath();
		this.context.moveTo( x, y );
		this.context.arc( x, y, wheelRadiusPixels, angle, angle + Math.PI / 6 );
		this.context.fill();

	}

	updatePositionClosedForm( frameTime: number ) {

		this.time += frameTime;

		// v = ω r
		// p = v t = ω r t
		this.position = this.initialPosition + this.angularVelocity * this.wheelRadius * this.time;

		this.angle = this.angularVelocity * this.time;

	}

	updatePositionNumerical( frameTime: number ) {

		this.timeAccumulator += frameTime;

		while ( this.timeAccumulator >= this.timeStep ) {

			// v = ω r
			// p = v t = ω r t
			this.position += this.angularVelocity * this.wheelRadius * this.timeStep;

			this.angle += this.angularVelocity * this.timeStep;

			this.timeAccumulator -= this.timeStep;
			this.time += this.timeStep;

		}

	}

	updatePositionPhysicsEngine( frameTime: number ) { }

}
