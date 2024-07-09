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
	let dt = now - prevTime;
	prevTime = now;

	if ( wmrClosedForm.getTime() > 15.0 ) {

		status = SimulationStatus.Stopped;

	}

	// Simulate
	if ( status === SimulationStatus.Running ) {

		wmrClosedForm.updatePositionClosedForm( dt / 1000.0 );
		wmrNumerical.updatePositionNumerical( dt / 1000.0 );
		wmrPhysicsEngine.updatePositionPhysicsEngine( dt / 1000.0 );

	}

	// Draw
	// wmrClosedForm.render( true );
	// wmrNumerical.render( true );
	wmrPhysicsEngine.render( true );

	requestAnimationFrame( loop );

}

let status = SimulationStatus.Running;

let prevTime = 0.0;
let wmrClosedForm = new WMR2D();
let wmrNumerical = new WMR2D();
let wmrPhysicsEngine = new WMR2D();
requestAnimationFrame( loop );
