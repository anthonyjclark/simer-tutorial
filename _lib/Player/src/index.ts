import '../css/main.css';

import { Player } from '../lib/main';

function testUpdate( time: number ) {

	console.log( time );

}

function testReset() {

	console.log( 'reset' );

}

const player = new Player( 10, 0.1, testUpdate, testReset );

const form = player.create();

document.querySelector<HTMLDivElement>( '#app' )!.appendChild( form );

// document.querySelector<HTMLDivElement>( '#app' )!.textContent = 'Hello, world!';
