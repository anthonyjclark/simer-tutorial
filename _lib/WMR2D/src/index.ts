import '../css/main.css';

import { WMR2D } from '../lib/main';

function loop( now: number ) {

	if ( ! prevTime ) prevTime = now;
	let dt = now - prevTime;
	prevTime = now;

	// Simulate
	// wmr.updatePositionClosedForm( dt / 1000.0 );
	wmr.updatePositionNumerical( dt / 1000.0 );

	// Draw
	wmr.render( true );

	requestAnimationFrame( loop );

}

let prevTime = 0.0;
let wmr = new WMR2D();
requestAnimationFrame( loop );
