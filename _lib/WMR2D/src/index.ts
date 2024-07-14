import '../css/main.css';

import { WMR2D } from '../lib/main';

// A status enum for the WMR2D class
enum SimulationStatus {
	Running,
	Stopped,
	Paused,
}

function loop( now: number ) {

	if ( ! prevTime ) prevTime = now;
	const dt = ( now - prevTime ) / 1000.0;
	prevTime = now;

	time += dt;

	// Simulate
	if ( status === SimulationStatus.Running ) {

		wmrClosedForm?.updatePositionClosedForm( time );
		wmrNumerical?.updatePositionNumerical( dt );
		wmrPhysicsEngine?.updatePositionPhysicsEngine( dt );

	}

	// Draw
	let clear = true;
	if ( wmrClosedForm ) ( wmrClosedForm.render( clear ), clear = false );
	if ( wmrNumerical ) ( wmrNumerical.render( clear ), clear = false );
	if ( wmrPhysicsEngine ) ( wmrPhysicsEngine.render( clear ), clear = false );

	// Update control
	if ( time >= controlLastUpdate && wmrPhysicsEngine ) {

		const dist = wmrPhysicsEngine.getDistanceToWall();
		const speed = Math.min( 3.0, 20 * ( dist - 2.5 ) / 20.0 );
		wmrPhysicsEngine?.setWheelAngularVelocity( speed );

		controlLastUpdate += controlPeriod;

	}

	requestAnimationFrame( loop );

}

let status = SimulationStatus.Running;
let prevTime = 0.0;
let time = 0.0;

const controlPeriod = 0.1;
let controlLastUpdate = 0.0;

let wmrClosedForm: WMR2D | null = null;
let wmrNumerical: WMR2D | null = null;
let wmrPhysicsEngine: WMR2D | null = null;

// wmrClosedForm = new WMR2D( 'wmr-canvas', { addWall: true } );
// wmrNumerical = new WMR2D( 'wmr-canvas', { addWall: true } );
wmrPhysicsEngine = new WMR2D( 'wmr-canvas', { addWall: true, addStep: true } );

requestAnimationFrame( loop );
