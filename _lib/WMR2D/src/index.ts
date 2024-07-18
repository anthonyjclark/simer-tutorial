import '../css/main.css';

import { WMRSimulator, WMR2DMode } from '../lib/main';

function loop( now: number ) {

	wmrClosedForm?.step( now / 1000 );
	wmrNumerical?.step( now / 1000 );
	wmrPhysicsEngine?.step( now / 1000 );

	requestAnimationFrame( loop );

	// console.log( wmrPhysicsEngine?.time );

	// if ( wmrPhysicsEngine?.time > 4 ) {

	// 	wmrPhysicsEngine?.reset();
	// 	console.log( 'Reset' );

	// }

}

let wmrClosedForm: WMRSimulator | null = null;
let wmrNumerical: WMRSimulator | null = null;
let wmrPhysicsEngine: WMRSimulator | null = null;

// wmrClosedForm = new WMRSimulator( 'wmr-canvas', WMR2DMode.ClosedForm, { addWall: true } );
// wmrNumerical = new WMRSimulator( 'wmr-canvas', WMR2DMode.Numerical, { addWall: true } );
wmrPhysicsEngine = new WMRSimulator( 'wmr-canvas', WMR2DMode.PhysicsEngine, { addWall: true, addStep: true } );

requestAnimationFrame( loop );
