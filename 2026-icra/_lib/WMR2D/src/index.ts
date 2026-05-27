import '../css/main.css';

import { WMRSimulator, WMR2DMode } from '../lib/main';

function loop( now: number ) {

	wmrAnalytical?.step( now / 1000 );
	wmrNumerical?.step( now / 1000 );
	wmrRBDEngine?.step( now / 1000 );

	requestAnimationFrame( loop );

	if ( wmrRBDEngine && wmrRBDEngine.time > 4 ) wmrRBDEngine.reset();

}

let wmrAnalytical: WMRSimulator | null = null;
let wmrNumerical: WMRSimulator | null = null;
let wmrRBDEngine: WMRSimulator | null = null;

// wmrAnalytical = new WMRSimulator( 'wmr-canvas', WMR2DMode.Analytical, { addWall: true } );
// wmrNumerical = new WMRSimulator( 'wmr-canvas', WMR2DMode.Numerical, { addWall: true } );
wmrRBDEngine = new WMRSimulator( 'wmr-canvas', WMR2DMode.RBDEngine, { addWall: true, addStep: true } );

requestAnimationFrame( loop );
